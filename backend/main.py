"""
SchemaIQ QueryBot Backend
FastAPI + SQLite + Gemini API (Text-to-SQL)
"""

import os
import json
import re
import sqlite3
import traceback
from pathlib import Path
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
DB_PATH = Path(__file__).parent / "olist.db"
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL   = "gemini-2.5-flash"

if API_KEY:
    genai.configure(api_key=API_KEY)

def get_client():
    if not API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not set in .env")
    return genai.GenerativeModel(MODEL)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="SchemaIQ QueryBot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schema context ────────────────────────────────────────────────────────────
OLIST_SCHEMA = """
You are a SQL expert working with the Olist Brazilian E-Commerce database (SQLite).

DATABASE SCHEMA:
---------------
customers (99,441 rows)
  - customer_id          TEXT PRIMARY KEY
  - customer_unique_id   TEXT
  - customer_zip_code_prefix  INTEGER
  - customer_city        TEXT
  - customer_state       TEXT  (2-letter Brazilian state e.g. SP, RJ)

orders (99,441 rows)
  - order_id                          TEXT PRIMARY KEY
  - customer_id                       TEXT  FK→customers
  - order_status                      TEXT  (delivered|shipped|processing|canceled|...)
  - order_purchase_timestamp          TEXT  (ISO datetime)
  - order_approved_at                 TEXT
  - order_delivered_carrier_date      TEXT
  - order_delivered_customer_date     TEXT
  - order_estimated_delivery_date     TEXT

order_items (112,650 rows)
  - order_id             TEXT  FK→orders
  - order_item_id        INTEGER
  - product_id           TEXT  FK→products
  - seller_id            TEXT  FK→sellers
  - shipping_limit_date  TEXT
  - price                REAL  (BRL)
  - freight_value        REAL  (BRL)

order_payments (103,886 rows)
  - order_id             TEXT  FK→orders
  - payment_sequential   INTEGER
  - payment_type         TEXT  (credit_card|boleto|voucher|debit_card)
  - payment_installments INTEGER
  - payment_value        REAL  (BRL)

order_reviews (99,224 rows)
  - review_id            TEXT PRIMARY KEY
  - order_id             TEXT  FK→orders
  - review_score         INTEGER  (1-5)
  - review_comment_title TEXT
  - review_comment_message TEXT
  - review_creation_date TEXT
  - review_answer_timestamp TEXT

products (32,951 rows)
  - product_id                    TEXT PRIMARY KEY
  - product_category_name         TEXT  (Portuguese)
  - product_name_lenght           INTEGER
  - product_description_lenght    INTEGER
  - product_photos_qty            INTEGER
  - product_weight_g              INTEGER
  - product_length_cm             INTEGER
  - product_height_cm             INTEGER
  - product_width_cm              INTEGER

sellers (3,095 rows)
  - seller_id            TEXT PRIMARY KEY
  - seller_zip_code_prefix INTEGER
  - seller_city          TEXT
  - seller_state         TEXT

geolocation (1,000,163 rows)
  - geolocation_zip_code_prefix  INTEGER
  - geolocation_lat              REAL
  - geolocation_lng              REAL
  - geolocation_city             TEXT
  - geolocation_state            TEXT

product_category_name_translation (71 rows)
  - product_category_name         TEXT  (Portuguese)
  - product_category_name_english TEXT  (English)

IMPORTANT:
- Dates are TEXT: use strftime('%Y-%m-%d', column) for filtering
- For revenue: SUM(price + freight_value) from order_items
- Always filter orders by order_status='delivered' for revenue queries
- LIMIT to 20 rows unless user asks for more
"""

SQL_SYSTEM_PROMPT = OLIST_SCHEMA + """

Task: Convert the user's natural language question into a SQLite SQL query.

Return ONLY a valid JSON object — no markdown, no explanation, no code fences:
{
  "sql": "SELECT ...",
  "explanation": "Brief description of what this query does",
  "chart_type": "bar" or "line" or "number" or "table" or null
}

chart_type rules:
- "bar"    → categories, rankings, counts by group
- "line"   → trends over time
- "number" → single aggregate value (COUNT, SUM, AVG)
- "table"  → multi-column results
- null     → when uncertain
"""

FORMAT_SYSTEM_PROMPT = """
You are a friendly data analyst explaining SQL query results.

Return ONLY a valid JSON object — no markdown, no code fences:
{
  "text": "Clear explanation with **bold** for key numbers",
  "insight": "One sentence business insight"
}
"""

# ── DB helpers ────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def run_query(sql: str):
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(sql)
        rows    = [dict(r) for r in cur.fetchall()]
        columns = [d[0] for d in cur.description] if cur.description else []
        conn.close()
        return columns, rows, None
    except Exception as e:
        return [], [], str(e)

def check_db():
    if not DB_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Database not found. Run: python load_data.py --data ./data"
        )

def clean_json(raw: str) -> str:
    """Strip markdown fences Gemini sometimes adds."""
    raw = raw.strip()
    # Remove ```json ... ``` or ``` ... ```
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return raw.strip()

# ── Gemini helpers ────────────────────────────────────────────────────────────
def ask_gemini_sql(question: str) -> dict:
    client = get_client()
    prompt = SQL_SYSTEM_PROMPT + f"\n\nQuestion: {question}"
    resp = client.generate_content(prompt)
    raw  = clean_json(resp.text)
    return json.loads(raw)

def ask_gemini_format(question: str, sql: str, results: list) -> dict:
    client = get_client()
    prompt = FORMAT_SYSTEM_PROMPT + f"""

Question: {question}

SQL used:
{sql}

Results ({len(results)} rows):
{json.dumps(results[:20], indent=2)}
"""
    resp = client.generate_content(prompt)
    raw  = clean_json(resp.text)
    return json.loads(raw)

def build_chart_data(columns: list, rows: list, chart_type: str):
    if not rows or not columns:
        return None
    if chart_type in ("bar", "line"):
        label_col = columns[0]
        value_col = columns[1] if len(columns) > 1 else columns[0]
        return [
            {"name": str(r.get(label_col, ""))[:24], "value": r.get(value_col, 0)}
            for r in rows[:30]
        ]
    if chart_type == "number":
        first_val = list(rows[0].values())[0] if rows else 0
        return [{"value": first_val}]
    return None

# ── Models ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    history:  list = []

class ChatResponse(BaseModel):
    text:       str
    insight:    Optional[str]  = None
    sql:        Optional[str]  = None
    chart_type: Optional[str]  = None
    chart_data: Optional[list] = None
    columns:    Optional[list] = None
    rows:       Optional[list] = None
    row_count:  Optional[int]  = None
    error:      Optional[str]  = None

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "SchemaIQ QueryBot API", "db": str(DB_PATH), "db_exists": DB_PATH.exists()}

@app.get("/health")
def health():
    return {"db": DB_PATH.exists(), "anthropic_api": bool(API_KEY), "ready": DB_PATH.exists() and bool(API_KEY)}

@app.get("/tables")
def list_tables():
    check_db()
    _, rows, err = run_query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    if err:
        raise HTTPException(status_code=500, detail=err)
    return {"tables": [r["name"] for r in rows]}

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    check_db()
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        # Step 1 — Gemini generates SQL
        sql_resp   = ask_gemini_sql(question)
        sql        = sql_resp.get("sql", "").strip()
        chart_type = sql_resp.get("chart_type")

        if not sql:
            return ChatResponse(text="I couldn't generate a SQL query for that. Try rephrasing.", error="No SQL generated")

        # Step 2 — Execute on SQLite
        columns, rows, db_error = run_query(sql)

        if db_error:
            # Retry — tell Gemini the error
            retry = f"The SQL failed: {db_error}\n\nFailed SQL:\n{sql}\n\nOriginal question: {question}\n\nFix the SQL and return corrected JSON."
            sql_resp2  = ask_gemini_sql(retry)
            sql        = sql_resp2.get("sql", sql).strip()
            chart_type = sql_resp2.get("chart_type", chart_type)
            columns, rows, db_error = run_query(sql)
            if db_error:
                return ChatResponse(text=f"SQL error: `{db_error}`", sql=sql, error=db_error)

        # Step 3 — Gemini formats results
        fmt     = ask_gemini_format(question, sql, rows)
        text    = fmt.get("text", "Here are the results.")
        insight = fmt.get("insight")

        # Step 4 — Build chart data
        chart_data = build_chart_data(columns, rows, chart_type)

        return ChatResponse(
            text=text, insight=insight, sql=sql,
            chart_type=chart_type, chart_data=chart_data,
            columns=columns, rows=rows[:100], row_count=len(rows),
        )

    except json.JSONDecodeError as e:
        return ChatResponse(text="Couldn't parse AI response. Please try again.", error=f"JSON error: {e}")
    except Exception as e:
        traceback.print_exc()
        return ChatResponse(text="Something went wrong. Please try again.", error=str(e))

@app.post("/sql")
def run_raw_sql(body: dict):
    check_db()
    sql = body.get("sql", "")
    if not sql:
        raise HTTPException(status_code=400, detail="No SQL provided")
    columns, rows, error = run_query(sql)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"columns": columns, "rows": rows, "count": len(rows)}