from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.engine import Engine


def _scalar(conn, sql: str, params: Optional[Dict[str, Any]] = None) -> Any:
    res = conn.execute(text(sql), params or {})
    return res.scalar()


def _safe_scalar(conn, sql: str, params: Optional[Dict[str, Any]] = None, default: Any = None) -> Any:
    try:
        return _scalar(conn, sql, params)
    except Exception as e:
        print(f"[profiler] Query failed: {sql} | Error: {e}")
        return default


def profile_database(
    engine: Engine,
    schema_payload: Dict[str, Any],
    *,
    schema: Optional[str] = None,
    compute_distinct: bool = True,
    freshness_column_hints: Optional[List[str]] = None,
) -> Dict[str, Any]:
    freshness_column_hints = freshness_column_hints or [
        "created_at",
        "updated_at",
        "timestamp",
        "date",
        "dt",
    ]

    preparer = engine.dialect.identifier_preparer
    
    def qident(name: str) -> str:
        return preparer.quote(name)

    def qtable(name: str, sch: Optional[str]) -> str:
        t_quoted = preparer.quote(name)
        if sch:
            return f"{preparer.quote(sch)}.{t_quoted}"
        return t_quoted

    tables_out: List[Dict[str, Any]] = []
    fk_orphans: List[Dict[str, Any]] = []

    tables = schema_payload.get("tables", []) or []

    with engine.connect() as conn:
        for t in tables:
            tname = t.get("name")
            if not tname:
                continue

            full_table_ident = qtable(tname, schema)
            row_count_raw = _safe_scalar(conn, f"SELECT COUNT(*) FROM {full_table_ident}", default=0)
            row_count = int(row_count_raw or 0)

            col_stats: List[Dict[str, Any]] = []
            freshness: Optional[Dict[str, Any]] = None

            for c in (t.get("columns") or []):
                cname = c.get("name")
                if not cname:
                    continue

                col_ident = qident(cname)
                null_count_raw = _safe_scalar(
                    conn,
                    f"SELECT SUM(CASE WHEN {col_ident} IS NULL THEN 1 ELSE 0 END) FROM {full_table_ident}",
                    default=0,
                )
                null_count = int(null_count_raw or 0)
                null_percent = (null_count / row_count * 100.0) if row_count else 0.0

                distinct_count: Optional[int] = None
                if compute_distinct:
                    distinct_count_raw = _safe_scalar(
                        conn,
                        f"SELECT COUNT(DISTINCT {col_ident}) FROM {full_table_ident}",
                        default=0,
                    )
                    distinct_count = int(distinct_count_raw or 0)

                col_stats.append(
                    {
                        "name": cname,
                        "null_count": null_count,
                        "null_percent": float(round(null_percent, 4)),
                        "distinct_count": distinct_count,
                    }
                )

                ctype = (c.get("type") or "").lower()
                if freshness is None and (
                    ctype == "datetime"
                    or any(h in cname.lower() for h in freshness_column_hints)
                ):
                    max_val = _safe_scalar(conn, f"SELECT MAX({col_ident}) FROM {full_table_ident}")
                    if max_val is not None:
                        max_str = str(max_val)
                        age_days: Optional[float] = None
                        try:
                            dt = datetime.fromisoformat(max_str)
                            if dt.tzinfo is None:
                                dt = dt.replace(tzinfo=timezone.utc)
                            now = datetime.now(timezone.utc)
                            age_days = (now - dt).total_seconds() / 86400.0
                        except Exception:
                            age_days = None

                        freshness = {
                            "column": cname,
                            "max_value": max_str,
                            "age_days": float(round(age_days, 4)) if age_days is not None else None,
                        }

            tables_out.append(
                {
                    "name": tname,
                    "row_count": row_count,
                    "columns": col_stats,
                    "freshness": freshness,
                }
            )

        for t in tables:
            from_table_name = t.get("name")
            for fk in t.get("foreign_keys", []) or []:
                from_col = fk.get("column")
                ref = fk.get("references") or {}
                to_table_name = ref.get("table")
                to_col = ref.get("column")
                if not (from_table_name and from_col and to_table_name and to_col):
                    continue

                ft = qtable(from_table_name, schema)
                fc = qident(from_col)
                tt = qtable(to_table_name, schema)
                tc = qident(to_col)

                sql = (
                    f"SELECT COUNT(*) FROM {ft} "
                    f"LEFT JOIN {tt} ON {ft}.{fc} = {tt}.{tc} "
                    f"WHERE {ft}.{fc} IS NOT NULL AND {tt}.{tc} IS NULL"
                )
                orphan_count_raw = _safe_scalar(conn, sql, default=0)
                orphan_count = int(orphan_count_raw or 0)
                fk_orphans.append(
                    {
                        "from_table": from_table_name,
                        "from_column": from_col,
                        "to_table": to_table_name,
                        "to_column": to_col,
                        "orphan_count": orphan_count,
                    }
                )

    return {"tables": tables_out, "fk_orphans": fk_orphans}
