import re

import psycopg2

from app.config import config
from app.database import get_connection

BLOCKED_KEYWORDS = re.compile(
    r"\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY)\b",
    re.IGNORECASE,
)


def validate_sql(sql: str) -> str | None:
    stripped = sql.strip().rstrip(";")
    upper = stripped.upper().lstrip()

    if not (upper.startswith("SELECT") or upper.startswith("WITH")):
        return "Only SELECT queries are allowed."

    if BLOCKED_KEYWORDS.search(stripped):
        return "Query contains forbidden keywords."

    parts = [p.strip() for p in stripped.split(";") if p.strip()]
    if len(parts) > 1:
        return "Multi-statement queries are not allowed."

    return None


def ensure_limit(sql: str) -> str:
    if not re.search(r"\bLIMIT\b", sql, re.IGNORECASE):
        sql = sql.rstrip().rstrip(";")
        sql += f" LIMIT {config.SQL_MAX_ROWS}"
    return sql


def execute_safe_query(sql: str) -> dict:
    error = validate_sql(sql)
    if error:
        return {"success": False, "error": error, "data": [], "columns": []}

    sql = ensure_limit(sql)
    conn = get_connection()
    cur = None

    try:
        cur = conn.cursor()
        cur.execute(
            f"SET statement_timeout = '{config.SQL_TIMEOUT_SECONDS * 1000}'"
        )
        cur.execute(sql)
        columns = [desc[0] for desc in cur.description] if cur.description else []
        rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return {"success": True, "data": rows, "columns": columns, "error": None}

    except psycopg2.errors.QueryCanceled:
        conn.rollback()
        return {
            "success": False,
            "error": "Query timed out. Try a simpler query.",
            "data": [],
            "columns": [],
        }

    except psycopg2.Error as e:
        conn.rollback()
        return {
            "success": False,
            "error": f"SQL error: {str(e).split(chr(10))[0]}",
            "data": [],
            "columns": [],
        }

    finally:
        if cur:
            cur.close()
