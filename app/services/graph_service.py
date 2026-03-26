from app.database import execute_query
from app.models import GraphEdge, GraphNode, GraphResponse, NodeDetailResponse

NODE_COLORS = {
    "SalesOrder": "#3B82F6",
    "Delivery": "#10B981",
    "BillingDocument": "#F59E0B",
    "JournalEntry": "#8B5CF6",
    "Payment": "#14B8A6",
    "BusinessPartner": "#EF4444",
    "Product": "#F97316",
}


def get_overview_graph() -> GraphResponse:
    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []

    _load_sales_orders(nodes)
    _load_deliveries(nodes)
    _load_billing_documents(nodes)
    _load_journal_entries(nodes)
    _load_payments(nodes)
    _load_business_partners(nodes)
    _load_products(nodes)

    _build_so_to_delivery_edges(edges, nodes)
    _build_so_to_billing_edges(edges, nodes)
    _build_billing_to_journal_edges(edges, nodes)
    _build_journal_to_payment_edges(edges, nodes)
    _build_so_to_bp_edges(edges, nodes)
    _build_so_to_product_edges(edges, nodes)

    return GraphResponse(nodes=list(nodes.values()), edges=edges)


def get_node_detail(node_id: str) -> NodeDetailResponse | None:
    prefix, _, key = node_id.partition(":")
    if not key:
        return None

    table_map = {
        "SO": ("sales_order_headers", "salesOrder"),
        "DL": ("outbound_delivery_headers", "deliveryDocument"),
        "BD": ("billing_document_headers", "billingDocument"),
        "JE": ("journal_entry_items_accounts_receivable", "accountingDocument"),
        "PAY": ("payments_accounts_receivable", "accountingDocument"),
        "BP": ("business_partners", "businessPartner"),
        "PRD": ("products", "product"),
    }

    type_map = {
        "SO": "SalesOrder",
        "DL": "Delivery",
        "BD": "BillingDocument",
        "JE": "JournalEntry",
        "PAY": "Payment",
        "BP": "BusinessPartner",
        "PRD": "Product",
    }

    if prefix not in table_map:
        return None

    table, pk_col = table_map[prefix]
    rows = execute_query(
        f'SELECT * FROM "{table}" WHERE "{pk_col}" = %s', (key,)
    )
    if not rows:
        return None

    row = rows[0]
    node_type = type_map[prefix]
    label = _make_label(prefix, row)
    connections = _count_connections(prefix, key)

    return NodeDetailResponse(
        id=node_id,
        type=node_type,
        label=label,
        metadata=row,
        connections=connections,
    )


def expand_node(node_id: str) -> GraphResponse:
    prefix, _, key = node_id.partition(":")
    if not key:
        return GraphResponse(nodes=[], edges=[])

    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []

    if prefix == "SO":
        _expand_sales_order(key, node_id, nodes, edges)
    elif prefix == "DL":
        _expand_delivery(key, node_id, nodes, edges)
    elif prefix == "BD":
        _expand_billing(key, node_id, nodes, edges)
    elif prefix == "BP":
        _expand_business_partner(key, node_id, nodes, edges)
    elif prefix == "PRD":
        _expand_product(key, node_id, nodes, edges)

    return GraphResponse(nodes=list(nodes.values()), edges=edges)



def _load_sales_orders(nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT "salesOrder", "soldToParty", "totalNetAmount", "transactionCurrency", '
        '"creationDate", "overallDeliveryStatus", "overallOrdReltdBillgStatus" '
        "FROM sales_order_headers"
    )
    for r in rows:
        nid = f"SO:{r['salesOrder']}"
        nodes[nid] = GraphNode(
            id=nid, type="SalesOrder", label=f"SO {r['salesOrder']}", metadata=r
        )


def _load_deliveries(nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT "deliveryDocument", "creationDate", "overallGoodsMovementStatus", '
        '"overallPickingStatus" FROM outbound_delivery_headers'
    )
    for r in rows:
        nid = f"DL:{r['deliveryDocument']}"
        nodes[nid] = GraphNode(
            id=nid, type="Delivery", label=f"DL {r['deliveryDocument']}", metadata=r
        )


def _load_billing_documents(nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT "billingDocument", "billingDocumentType", "totalNetAmount", '
        '"billingDocumentDate", "soldToParty", "accountingDocument", '
        '"billingDocumentIsCancelled" FROM billing_document_headers '
        "WHERE \"billingDocumentIsCancelled\" != 'true' "
        'OR "billingDocumentIsCancelled" IS NULL'
    )
    for r in rows:
        nid = f"BD:{r['billingDocument']}"
        nodes[nid] = GraphNode(
            id=nid,
            type="BillingDocument",
            label=f"BD {r['billingDocument']}",
            metadata=r,
        )


def _load_journal_entries(nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT DISTINCT "accountingDocument", "postingDate", "accountingDocumentType", '
        '"customer" FROM journal_entry_items_accounts_receivable'
    )
    seen = set()
    for r in rows:
        doc = r["accountingDocument"]
        if doc in seen:
            continue
        seen.add(doc)
        nid = f"JE:{doc}"
        nodes[nid] = GraphNode(
            id=nid, type="JournalEntry", label=f"JE {doc}", metadata=r
        )


def _load_payments(nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT DISTINCT "accountingDocument", "postingDate", "customer", '
        '"amountInTransactionCurrency", "transactionCurrency" '
        "FROM payments_accounts_receivable"
    )
    seen = set()
    for r in rows:
        doc = r["accountingDocument"]
        if doc in seen:
            continue
        seen.add(doc)
        nid = f"PAY:{doc}"
        nodes[nid] = GraphNode(
            id=nid, type="Payment", label=f"PAY {doc}", metadata=r
        )


def _load_business_partners(nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT "businessPartner", "customer", "businessPartnerName", '
        '"businessPartnerFullName" FROM business_partners'
    )
    for r in rows:
        nid = f"BP:{r['businessPartner']}"
        name = r.get("businessPartnerName") or r["businessPartner"]
        nodes[nid] = GraphNode(
            id=nid, type="BusinessPartner", label=name, metadata=r
        )


def _load_products(nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT p."product", p."productType", p."productGroup", p."baseUnit", '
        'pd."productDescription" FROM products p '
        'LEFT JOIN product_descriptions pd ON p."product" = pd."product" '
        "AND pd.\"language\" = 'EN'"
    )
    for r in rows:
        nid = f"PRD:{r['product']}"
        label = r.get("productDescription") or r["product"]
        nodes[nid] = GraphNode(id=nid, type="Product", label=label, metadata=r)



def _build_so_to_delivery_edges(edges: list[GraphEdge], nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT DISTINCT "deliveryDocument", "referenceSdDocument" '
        "FROM outbound_delivery_items "
        "WHERE \"referenceSdDocument\" IS NOT NULL AND \"referenceSdDocument\" != ''"
    )
    for r in rows:
        src = f"SO:{r['referenceSdDocument']}"
        tgt = f"DL:{r['deliveryDocument']}"
        if src in nodes and tgt in nodes:
            edges.append(GraphEdge(source=src, target=tgt, type="DELIVERED_VIA"))


def _build_so_to_billing_edges(edges: list[GraphEdge], nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT DISTINCT "billingDocument", "referenceSdDocument" '
        "FROM billing_document_items "
        "WHERE \"referenceSdDocument\" IS NOT NULL AND \"referenceSdDocument\" != ''"
    )
    for r in rows:
        so_id = f"SO:{r['referenceSdDocument']}"
        dl_id = f"DL:{r['referenceSdDocument']}"
        bd_id = f"BD:{r['billingDocument']}"
        if bd_id not in nodes:
            continue
        if so_id in nodes:
            edges.append(GraphEdge(source=so_id, target=bd_id, type="BILLED_VIA"))
        elif dl_id in nodes:
            edges.append(GraphEdge(source=dl_id, target=bd_id, type="BILLED_VIA"))


def _build_billing_to_journal_edges(
    edges: list[GraphEdge], nodes: dict[str, GraphNode]
):
    rows = execute_query(
        'SELECT "billingDocument", "accountingDocument" FROM billing_document_headers '
        "WHERE \"accountingDocument\" IS NOT NULL AND \"accountingDocument\" != ''"
    )
    for r in rows:
        src = f"BD:{r['billingDocument']}"
        tgt = f"JE:{r['accountingDocument']}"
        if src in nodes and tgt in nodes:
            edges.append(GraphEdge(source=src, target=tgt, type="ACCOUNTED_IN"))


def _build_journal_to_payment_edges(
    edges: list[GraphEdge], nodes: dict[str, GraphNode]
):
    rows = execute_query(
        'SELECT DISTINCT "clearingAccountingDocument", "accountingDocument" '
        "FROM payments_accounts_receivable "
        "WHERE \"clearingAccountingDocument\" IS NOT NULL "
        "AND \"clearingAccountingDocument\" != ''"
    )
    for r in rows:
        src = f"JE:{r['clearingAccountingDocument']}"
        tgt = f"PAY:{r['accountingDocument']}"
        if src in nodes and tgt in nodes:
            edges.append(GraphEdge(source=src, target=tgt, type="PAID_VIA"))


def _build_so_to_bp_edges(edges: list[GraphEdge], nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT "salesOrder", "soldToParty" FROM sales_order_headers '
        "WHERE \"soldToParty\" IS NOT NULL AND \"soldToParty\" != ''"
    )
    for r in rows:
        src = f"SO:{r['salesOrder']}"
        tgt = f"BP:{r['soldToParty']}"
        if src in nodes and tgt in nodes:
            edges.append(GraphEdge(source=src, target=tgt, type="SOLD_TO"))


def _build_so_to_product_edges(edges: list[GraphEdge], nodes: dict[str, GraphNode]):
    rows = execute_query(
        'SELECT DISTINCT "salesOrder", "material" FROM sales_order_items '
        "WHERE \"material\" IS NOT NULL AND \"material\" != ''"
    )
    for r in rows:
        src = f"SO:{r['salesOrder']}"
        tgt = f"PRD:{r['material']}"
        if src in nodes and tgt in nodes:
            edges.append(GraphEdge(source=src, target=tgt, type="CONTAINS_PRODUCT"))



def _expand_sales_order(key: str, node_id: str, nodes: dict, edges: list):
    items = execute_query(
        'SELECT * FROM sales_order_items WHERE "salesOrder" = %s', (key,)
    )
    for item in items:
        item_id = f"SOI:{key}-{item['salesOrderItem']}"
        nodes[item_id] = GraphNode(
            id=item_id,
            type="SalesOrderItem",
            label=f"Item {item['salesOrderItem']}",
            metadata=item,
        )
        edges.append(GraphEdge(source=node_id, target=item_id, type="HAS_ITEM"))

        if item.get("material"):
            prd_id = f"PRD:{item['material']}"
            if prd_id not in nodes:
                prd_rows = execute_query(
                    'SELECT p.*, pd."productDescription" FROM products p '
                    'LEFT JOIN product_descriptions pd ON p."product" = pd."product" '
                    "AND pd.\"language\" = 'EN' "
                    'WHERE p."product" = %s',
                    (item["material"],),
                )
                if prd_rows:
                    label = prd_rows[0].get("productDescription") or item["material"]
                    nodes[prd_id] = GraphNode(
                        id=prd_id, type="Product", label=label, metadata=prd_rows[0]
                    )
            edges.append(GraphEdge(source=item_id, target=prd_id, type="MATERIAL"))

    schedules = execute_query(
        'SELECT * FROM sales_order_schedule_lines WHERE "salesOrder" = %s', (key,)
    )
    for sl in schedules:
        sl_id = f"SOSL:{key}-{sl['salesOrderItem']}-{sl['scheduleLine']}"
        nodes[sl_id] = GraphNode(
            id=sl_id,
            type="ScheduleLine",
            label=f"Schedule {sl['scheduleLine']}",
            metadata=sl,
        )
        parent = f"SOI:{key}-{sl['salesOrderItem']}"
        if parent in nodes:
            edges.append(GraphEdge(source=parent, target=sl_id, type="HAS_SCHEDULE"))


def _expand_delivery(key: str, node_id: str, nodes: dict, edges: list):
    items = execute_query(
        'SELECT * FROM outbound_delivery_items WHERE "deliveryDocument" = %s', (key,)
    )
    for item in items:
        item_id = f"DLI:{key}-{item['deliveryDocumentItem']}"
        nodes[item_id] = GraphNode(
            id=item_id,
            type="DeliveryItem",
            label=f"DL Item {item['deliveryDocumentItem']}",
            metadata=item,
        )
        edges.append(GraphEdge(source=node_id, target=item_id, type="HAS_ITEM"))

        if item.get("plant"):
            plant_id = f"PLT:{item['plant']}"
            if plant_id not in nodes:
                plant_rows = execute_query(
                    'SELECT * FROM plants WHERE "plant" = %s', (item["plant"],)
                )
                if plant_rows:
                    nodes[plant_id] = GraphNode(
                        id=plant_id,
                        type="Plant",
                        label=plant_rows[0].get("plantName") or item["plant"],
                        metadata=plant_rows[0],
                    )
            edges.append(GraphEdge(source=item_id, target=plant_id, type="AT_PLANT"))


def _expand_billing(key: str, node_id: str, nodes: dict, edges: list):
    items = execute_query(
        'SELECT * FROM billing_document_items WHERE "billingDocument" = %s', (key,)
    )
    for item in items:
        item_id = f"BDI:{key}-{item['billingDocumentItem']}"
        nodes[item_id] = GraphNode(
            id=item_id,
            type="BillingDocumentItem",
            label=f"BD Item {item['billingDocumentItem']}",
            metadata=item,
        )
        edges.append(GraphEdge(source=node_id, target=item_id, type="HAS_ITEM"))

    cancellations = execute_query(
        'SELECT * FROM billing_document_cancellations '
        'WHERE "cancelledBillingDocument" = %s',
        (key,),
    )
    for canc in cancellations:
        canc_id = f"BDC:{canc['billingDocument']}"
        nodes[canc_id] = GraphNode(
            id=canc_id,
            type="Cancellation",
            label=f"Cancel {canc['billingDocument']}",
            metadata=canc,
        )
        edges.append(GraphEdge(source=node_id, target=canc_id, type="CANCELLED_BY"))


def _expand_business_partner(key: str, node_id: str, nodes: dict, edges: list):
    addresses = execute_query(
        'SELECT * FROM business_partner_addresses WHERE "businessPartner" = %s', (key,)
    )
    for addr in addresses:
        addr_id = f"ADDR:{key}-{addr['addressId']}"
        city = addr.get("cityName") or "Address"
        nodes[addr_id] = GraphNode(
            id=addr_id, type="Address", label=city, metadata=addr
        )
        edges.append(GraphEdge(source=node_id, target=addr_id, type="HAS_ADDRESS"))

    assignments = execute_query(
        'SELECT * FROM customer_sales_area_assignments WHERE "customer" = %s', (key,)
    )
    for asgn in assignments:
        asgn_id = f"CSA:{key}-{asgn['salesOrganization']}-{asgn['distributionChannel']}"
        nodes[asgn_id] = GraphNode(
            id=asgn_id,
            type="SalesAreaAssignment",
            label=f"Sales Area {asgn['salesOrganization']}",
            metadata=asgn,
        )
        edges.append(
            GraphEdge(source=node_id, target=asgn_id, type="ASSIGNED_TO_SALES_AREA")
        )


def _expand_product(key: str, node_id: str, nodes: dict, edges: list):
    plant_rows = execute_query(
        'SELECT pp.*, p."plantName" FROM product_plants pp '
        'LEFT JOIN plants p ON pp."plant" = p."plant" '
        'WHERE pp."product" = %s',
        (key,),
    )
    for pp in plant_rows[:20]:
        plant_id = f"PLT:{pp['plant']}"
        if plant_id not in nodes:
            nodes[plant_id] = GraphNode(
                id=plant_id,
                type="Plant",
                label=pp.get("plantName") or pp["plant"],
                metadata=pp,
            )
        edges.append(GraphEdge(source=node_id, target=plant_id, type="AVAILABLE_AT"))


def _count_connections(prefix: str, key: str) -> int:
    count = 0
    queries = {
        "SO": [
            ('SELECT COUNT(*) FROM outbound_delivery_items WHERE "referenceSdDocument" = %s', key),
            ('SELECT COUNT(*) FROM billing_document_items WHERE "referenceSdDocument" = %s', key),
            ('SELECT COUNT(DISTINCT "material") FROM sales_order_items WHERE "salesOrder" = %s', key),
        ],
        "DL": [
            ('SELECT COUNT(*) FROM outbound_delivery_items WHERE "deliveryDocument" = %s', key),
        ],
        "BD": [
            ('SELECT COUNT(*) FROM billing_document_items WHERE "billingDocument" = %s', key),
            ('SELECT COUNT(*) FROM billing_document_cancellations WHERE "cancelledBillingDocument" = %s', key),
        ],
        "BP": [
            ('SELECT COUNT(*) FROM sales_order_headers WHERE "soldToParty" = %s', key),
        ],
        "PRD": [
            ('SELECT COUNT(*) FROM sales_order_items WHERE "material" = %s', key),
        ],
    }
    for sql, param in queries.get(prefix, []):
        rows = execute_query(sql, (param,))
        if rows:
            count += rows[0].get("count", 0)
    return count


def _make_label(prefix: str, row: dict) -> str:
    if prefix == "SO":
        return f"SO {row.get('salesOrder', '')}"
    if prefix == "DL":
        return f"DL {row.get('deliveryDocument', '')}"
    if prefix == "BD":
        return f"BD {row.get('billingDocument', '')}"
    if prefix == "JE":
        return f"JE {row.get('accountingDocument', '')}"
    if prefix == "PAY":
        return f"PAY {row.get('accountingDocument', '')}"
    if prefix == "BP":
        return row.get("businessPartnerName") or row.get("businessPartner", "")
    if prefix == "PRD":
        return row.get("productDescription") or row.get("product", "")
    return str(row)
