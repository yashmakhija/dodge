import psycopg2
import psycopg2.extras

from app.config import config
from app.utils.data_loader import ingest_all_tables

_connection: psycopg2.extensions.connection | None = None

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


# --- Connection ---


def get_connection() -> psycopg2.extensions.connection:
    global _connection
    if _connection is None or _connection.closed:
        _connection = psycopg2.connect(config.DATABASE_URL)
        _connection.autocommit = True
    return _connection


# --- Init ---


def init_db() -> dict[str, int]:
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public'"
    )
    existing = {row[0] for row in cur.fetchall()}

    if len(existing) >= 19:
        counts = {}
        for table in existing:
            cur.execute(f'SELECT COUNT(*) FROM "{table}"')
            counts[table] = cur.fetchone()[0]
        cur.close()
        return counts

    counts = ingest_all_tables(conn, config.DATA_PATH)
    _create_indexes(conn)
    cur.close()
    return counts


def _create_indexes(conn: psycopg2.extensions.connection):
    cur = conn.cursor()
    for idx_name, table, column in INDEXES:
        cur.execute(
            f'CREATE INDEX IF NOT EXISTS {idx_name} ON "{table}" ("{column}")'
        )
    cur.close()


# --- Query helpers ---


def execute_query(sql: str, params: tuple = ()) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(sql, params)
    rows = [dict(row) for row in cur.fetchall()]
    cur.close()
    return rows


def get_table_names() -> list[str]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' ORDER BY table_name"
    )
    names = [row[0] for row in cur.fetchall()]
    cur.close()
    return names


def get_table_schema(table_name: str) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT column_name, data_type FROM information_schema.columns "
        "WHERE table_name = %s ORDER BY ordinal_position",
        (table_name,),
    )
    result = [{"name": row[0], "type": row[1]} for row in cur.fetchall()]
    cur.close()
    return result


def get_schema_ddl() -> str:
    tables = get_table_names()
    ddl_parts = []
    for table in tables:
        schema = get_table_schema(table)
        cols = ", ".join(f'"{col["name"]}" TEXT' for col in schema)
        ddl_parts.append(f'CREATE TABLE "{table}" ({cols})')
    return ";\n\n".join(ddl_parts) + ";"
