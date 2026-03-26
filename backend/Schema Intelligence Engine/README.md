# Schema Intelligence Engine (SIE)

This folder contains the **Schema Intelligence Engine**: a standalone FastAPI service that turns a database connection or uploaded files into:

- schema understanding (tables/columns/types/keys)
- relationship mapping (FKs → ER edges)
- relationship inference when FKs are missing (heuristic)
- data quality profiling (nulls, distinct counts, freshness)
- consistency checks (FK orphan rows)
- safe data preview sampling (limited rows for LLM context)

The module is **dataset-agnostic**: it works for any dataset as long as it is either:

- reachable as a SQL database via SQLAlchemy `db_url`, or
- provided as uploaded `.csv` or `.sql` (converted into SQLite for inspection)

---

## 1) Quick Start (Local)

From this directory:

```bash
python -m uvicorn main:app --reload --port 8001
```

Open:

- Swagger UI: `http://127.0.0.1:8001/docs`

---

## 2) Folder Layout (Authoritative)

```
Schema Intelligence Engine/
├── main.py
├── db/
│   ├── connection.py
│   ├── inspector.py
│   └── loader.py
├── services/
│   ├── schema_extractor/
│   │   ├── extractor.py
│   │   └── normalizer.py
│   ├── relationship_mapper/
│   │   ├── fk_mapper.py
│   │   └── infer_mapper.py
│   ├── schema_formatter/
│   │   └── formatter.py
│   └── data_profiler/
│       └── profiler.py
├── routes/
│   ├── connection.py
│   ├── upload.py
│   ├── schema.py
│   ├── profile.py
│   └── preview.py
├── models/
│   ├── schema_model.py
│   └── profile_model.py
├── uploads/           (created at runtime)
├── test_orders.csv
├── test_customers.csv
└── test_schema_fk.sql
```

---

## 3) Service Responsibilities (What SIE Outputs)

SIE exposes the backend “structured brain” required by the rest of the PS:

- **Schema JSON** for ER engine / LLM context: `GET /schema`
- **Profiling JSON** for data quality analysis: `GET /profile`
- **Row samples** for dictionary/context generation: `GET /preview`

LLM/Agent layer should consume:

- `/schema` (structure)
- `/profile` (quality signals)
- `/preview` (small row samples)

Avoid sending full table dumps to the LLM (context and cost constraints).

---

## 4) Endpoints

Base URL (local): `http://127.0.0.1:8001`

### 4.1 `POST /connect`
Stores a SQLAlchemy `db_url` and **validates** it by running a `SELECT 1`.

**Body**:
```json
{ "db_url": "mysql+pymysql://user:pass@host:3306/dbname" }
```

- **Success**: `{ "status": "connected" }`
- **Failure**: `400` with `detail` explaining the real error (driver missing, auth failed, host unreachable, etc.)


### 4.2 `POST /upload`
Uploads a file and sets the resulting SQLite database as the active connection.

Supported:
- `.csv`
- `.sql`

**CSV behavior (multi-upload supported)**
- Each CSV becomes a table.
- CSV uploads append into a shared SQLite db:
  - `uploads/uploaded_data.sqlite`

**SQL behavior**
- SQL executes into an isolated sqlite file:
  - `uploads/<filename>.sqlite`

Returns:
```json
{
  "status": "uploaded",
  "path": "...",
  "db_url": "sqlite+pysqlite:///...",
  "sqlite_path": "..."
}
```


### 4.3 `GET /schema`
Returns the canonical schema JSON:

- `tables[]` with columns/types/PK/FKs
- `relationships[]` (many-to-one edges)

**Query params**:
- `db_url` (optional)
- `schema` (optional; Postgres schema or MSSQL dbo; leave blank for MySQL/SQLite)
- `infer` (bool; adds heuristic relationships when FKs are missing)


### 4.4 `GET /profile`
Returns table/column profiling:

- per table: `row_count`
- per column: null count, null percent, distinct count (optional)
- optional freshness (max datetime + age)
- optional FK orphan checks (consistency)

**Query params**:
- `compute_distinct` (default true)
- `include_fk_orphans` (default true)


### 4.5 `GET /preview`
Returns limited rows for LLM context or debugging.

**Query params**:
- `table` (required)
- `limit` (default 10, max 100)

Returns:
```json
{ "table": "student", "limit": 10, "rows": [ ... ] }
```

---

## 5) Expected `/schema` Output Shape

```json
{
  "tables": [
    {
      "name": "orders",
      "columns": [
        {"name": "order_id", "type": "string"},
        {"name": "customer_id", "type": "string"}
      ],
      "primary_key": ["order_id"],
      "foreign_keys": [
        {
          "column": "customer_id",
          "references": {"table": "customers", "column": "customer_id"}
        }
      ]
    }
  ],
  "relationships": [
    {"from_table": "orders", "to_table": "customers", "type": "many-to-one"}
  ]
}
```

---

## 6) How It Works (Data Flow)

1. DB connect or file upload establishes an engine.
2. `db/inspector.py` reads raw schema (tables/cols/PK/FK) via SQLAlchemy Inspector.
3. `services/schema_extractor/extractor.py` normalizes columns/types.
4. `services/relationship_mapper/fk_mapper.py` converts FK metadata → required JSON & global relationships.
5. `services/relationship_mapper/infer_mapper.py` (optional) infers relationships when FKs are missing.
6. `services/schema_formatter/formatter.py` validates with Pydantic and outputs consistent JSON.

---

## 7) Testing Recipes

### 7.1 CSV multi-table + inferred relationships
1. `POST /upload` → `test_customers.csv`
2. `POST /upload` → `test_orders.csv`
3. `GET /schema?infer=true`

Expected:
- both tables in output
- inferred relationship `test_orders → test_customers` (many-to-one)


### 7.2 SQL FK mapping
1. `POST /upload` → `test_schema_fk.sql`
2. `GET /schema`

Expected:
- `orders` foreign key → `customers`
- relationship edge present


### 7.3 MySQL live DB
Example db_url:

```text
mysql+pymysql://root:<PASSWORD>@127.0.0.1:3306/college
```

Notes:
- MySQL `schema` query param should be left blank.
- Password special characters must be URL-encoded (`@` → `%40`).

---

## 8) Frontend/Dashboard Integration

Your frontend should call the API via HTTP:

- `POST /connect` with JSON
- `POST /upload` with `multipart/form-data`
- `GET /schema`, `GET /profile`, `GET /preview`

If frontend is hosted on Netlify, the backend must be hosted publicly (e.g., Render) and CORS must allow the Netlify domain.

---

## 9) CORS

`main.py` enables CORS for:

- `https://schemaiqdashboard.netlify.app`
- `http://localhost:5173`
- `http://127.0.0.1:5173`

---

## 10) Deployment Notes (Render)

Render web service:

- Root directory: `Schema Intelligence Engine`
- Start command:
  - `uvicorn main:app --host 0.0.0.0 --port $PORT`

Build command depends on whether a `requirements.txt` is added inside this folder.

---

## 11) Limitations / Known Constraints

- CSV uploads cannot contain true FK constraints; inference is heuristic.
- SQL uploads work best with SQLite-compatible SQL.
- `/preview` uses `LIMIT` (fine for MySQL/SQLite/Postgres).
- `distinct_count` profiling can be expensive on large tables; can disable via `compute_distinct=false`.
