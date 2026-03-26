import os
import sqlite3
from pathlib import Path

from app.utils.data_loader import ingest_all_tables

DB_PATH = os.getenv("DB_PATH", "o2c.db")
DATA_PATH = os.getenv("DATA_PATH", "./data")

_connection: sqlite3.Connection | None = None

INDEXES = [
    ("idx_soh_soldtoparty", "sales_order_headers", "soldToParty"),
    ("idx_soi_salesorder", "sales_order_items", "salesOrder"),
    ("idx_soi_material", "sales_order_items", "material"),
    ("idx_soi_productionplant", "sales_order_items", "productionPlant"),
    ("idx_sosl_salesorder", "sales_order_schedule_lines", "salesOrder"),
    ("idx_odi_refsddoc", "outbound_delivery_items", "referenceSdDocument"),
    ("idx_odi_deliverydoc", "outbound_delivery_items", "deliveryDocument"),
    ("idx_bdh_soldtoparty", "billing_document_headers", "soldToParty"),
    ("idx_bdh_acctdoc", "billing_document_headers", "accountingDocument"),
    ("idx_bdi_billingdoc", "billing_document_items", "billingDocument"),
    ("idx_bdi_material", "billing_document_items", "material"),
    ("idx_bdi_refsddoc", "billing_document_items", "referenceSdDocument"),
    ("idx_bdc_cancelled", "billing_document_cancellations", "cancelledBillingDocument"),
    ("idx_jeiar_refdoc", "journal_entry_items_accounts_receivable", "referenceDocument"),
    ("idx_jeiar_acctdoc", "journal_entry_items_accounts_receivable", "accountingDocument"),
    ("idx_jeiar_customer", "journal_entry_items_accounts_receivable", "customer"),
    ("idx_par_customer", "payments_accounts_receivable", "customer"),
    ("idx_par_clearingdoc", "payments_accounts_receivable", "clearingAccountingDocument"),
    ("idx_bp_customer", "business_partners", "customer"),
    ("idx_pd_product", "product_descriptions", "product"),
    ("idx_pp_product", "product_plants", "product"),
    ("idx_pp_plant", "product_plants", "plant"),
    ("idx_psl_product", "product_storage_locations", "product"),
    ("idx_psl_plant", "product_storage_locations", "plant"),
]


def get_connection() -> sqlite3.Connection:
    global _connection
    if _connection is None:
        _connection = sqlite3.connect(DB_PATH, check_same_thread=False)
        _connection.row_factory = sqlite3.Row
        _connection.execute("PRAGMA journal_mode=WAL")
        _connection.execute("PRAGMA foreign_keys=ON")
    return _connection


def init_db() -> dict[str, int]:
    conn = get_connection()

    existing = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }

    if len(existing) >= 19:
        counts = {}
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall():
            name = row[0]
            count = conn.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
            counts[name] = count
        return counts

    counts = ingest_all_tables(conn, DATA_PATH)
    _create_indexes(conn)
    conn.commit()
    return counts


def _create_indexes(conn: sqlite3.Connection):
    for idx_name, table, column in INDEXES:
        conn.execute(
            f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ("{column}")'
        )


def execute_query(sql: str, params: tuple = ()) -> list[dict]:
    conn = get_connection()
    cursor = conn.execute(sql, params)
    columns = [desc[0] for desc in cursor.description] if cursor.description else []
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def get_table_names() -> list[str]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()
    return [row[0] for row in rows]


def get_table_schema(table_name: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return [{"name": row[1], "type": row[2]} for row in rows]


def get_schema_ddl() -> str:
    conn = get_connection()
    tables = get_table_names()
    ddl_parts = []
    for table in tables:
        row = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table,)
        ).fetchone()
        if row:
            ddl_parts.append(row[0])
    return ";\n\n".join(ddl_parts) + ";"
