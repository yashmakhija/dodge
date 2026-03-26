from app.database import execute_query
from app.models import GraphNode, GraphEdge


def trace_document_flow(doc_id: str) -> dict:
    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []

    _try_as_sales_order(doc_id, nodes, edges)
    _try_as_delivery(doc_id, nodes, edges)
    _try_as_billing(doc_id, nodes, edges)
    _try_as_journal(doc_id, nodes, edges)

    if not nodes:
        return {"nodes": [], "edges": [], "flow": []}

    flow = _build_flow_sequence(nodes)
    unique_edges = _dedupe_edges(edges)

    return {
        "nodes": [n.model_dump() for n in nodes.values()],
        "edges": [e.model_dump() for e in unique_edges],
        "flow": flow,
    }


def _try_as_sales_order(doc_id: str, nodes: dict, edges: list):
    rows = execute_query(
        'SELECT * FROM sales_order_headers WHERE "salesOrder" = %s', (doc_id,)
    )
    if not rows:
        return

    _add_node(nodes, f"SO:{doc_id}", "SalesOrder", f"SO {doc_id}", rows[0])
    _follow_downstream_from_so(doc_id, nodes, edges)


def _try_as_delivery(doc_id: str, nodes: dict, edges: list):
    rows = execute_query(
        'SELECT * FROM outbound_delivery_headers WHERE "deliveryDocument" = %s', (doc_id,)
    )
    if not rows:
        return

    dl_id = f"DL:{doc_id}"
    _add_node(nodes, dl_id, "Delivery", f"DL {doc_id}", rows[0])

    _follow_upstream_to_so(doc_id, dl_id, nodes, edges)
    _follow_downstream_from_dl(doc_id, dl_id, nodes, edges)


def _try_as_billing(doc_id: str, nodes: dict, edges: list):
    rows = execute_query(
        'SELECT * FROM billing_document_headers WHERE "billingDocument" = %s', (doc_id,)
    )
    if not rows:
        return

    bd_id = f"BD:{doc_id}"
    _add_node(nodes, bd_id, "BillingDocument", f"BD {doc_id}", rows[0])

    ref_rows = execute_query(
        'SELECT DISTINCT "referenceSdDocument" FROM billing_document_items '
        'WHERE "billingDocument" = %s AND "referenceSdDocument" IS NOT NULL', (doc_id,)
    )
    for r in ref_rows:
        ref = r["referenceSdDocument"]
        _resolve_ref_upstream(ref, bd_id, nodes, edges)

    _follow_downstream_from_bd(rows[0], bd_id, nodes, edges)


def _try_as_journal(doc_id: str, nodes: dict, edges: list):
    rows = execute_query(
        'SELECT * FROM journal_entry_items_accounts_receivable '
        'WHERE "accountingDocument" = %s LIMIT 1', (doc_id,)
    )
    if not rows:
        return

    je_id = f"JE:{doc_id}"
    _add_node(nodes, je_id, "JournalEntry", f"JE {doc_id}", rows[0])

    ref_doc = rows[0].get("referenceDocument")
    if ref_doc:
        _try_as_billing(ref_doc, nodes, edges)
        bd_id = f"BD:{ref_doc}"
        if bd_id in nodes:
            edges.append(GraphEdge(source=bd_id, target=je_id, type="ACCOUNTED_IN"))

    _follow_payments(doc_id, je_id, nodes, edges)


def _resolve_ref_upstream(ref: str, bd_id: str, nodes: dict, edges: list):
    so_rows = execute_query(
        'SELECT * FROM sales_order_headers WHERE "salesOrder" = %s', (ref,)
    )
    if so_rows:
        so_id = f"SO:{ref}"
        _add_node(nodes, so_id, "SalesOrder", f"SO {ref}", so_rows[0])
        edges.append(GraphEdge(source=so_id, target=bd_id, type="BILLED_VIA"))
        _fill_deliveries_between(ref, so_id, bd_id, nodes, edges)
        return

    dl_rows = execute_query(
        'SELECT * FROM outbound_delivery_headers WHERE "deliveryDocument" = %s', (ref,)
    )
    if dl_rows:
        dl_id = f"DL:{ref}"
        _add_node(nodes, dl_id, "Delivery", f"DL {ref}", dl_rows[0])
        edges.append(GraphEdge(source=dl_id, target=bd_id, type="BILLED_VIA"))
        _follow_upstream_to_so(ref, dl_id, nodes, edges)


def _fill_deliveries_between(so_key: str, so_id: str, bd_id: str, nodes: dict, edges: list):
    rows = execute_query(
        'SELECT DISTINCT odi."deliveryDocument" FROM outbound_delivery_items odi '
        'WHERE odi."referenceSdDocument" = %s', (so_key,)
    )
    for r in rows:
        dl_key = r["deliveryDocument"]
        dl_id = f"DL:{dl_key}"
        if dl_id not in nodes:
            dl_data = execute_query(
                'SELECT * FROM outbound_delivery_headers WHERE "deliveryDocument" = %s', (dl_key,)
            )
            if dl_data:
                _add_node(nodes, dl_id, "Delivery", f"DL {dl_key}", dl_data[0])
        if dl_id in nodes:
            edges.append(GraphEdge(source=so_id, target=dl_id, type="DELIVERED_VIA"))


def _follow_upstream_to_so(dl_key: str, dl_id: str, nodes: dict, edges: list):
    rows = execute_query(
        'SELECT DISTINCT "referenceSdDocument" FROM outbound_delivery_items '
        'WHERE "deliveryDocument" = %s AND "referenceSdDocument" IS NOT NULL', (dl_key,)
    )
    for r in rows:
        so_key = r["referenceSdDocument"]
        so_id = f"SO:{so_key}"
        if so_id not in nodes:
            so_data = execute_query(
                'SELECT * FROM sales_order_headers WHERE "salesOrder" = %s', (so_key,)
            )
            if so_data:
                _add_node(nodes, so_id, "SalesOrder", f"SO {so_key}", so_data[0])
        if so_id in nodes:
            edges.append(GraphEdge(source=so_id, target=dl_id, type="DELIVERED_VIA"))


def _follow_downstream_from_so(so_key: str, nodes: dict, edges: list):
    so_id = f"SO:{so_key}"

    dl_rows = execute_query(
        'SELECT DISTINCT odi."deliveryDocument" FROM outbound_delivery_items odi '
        'WHERE odi."referenceSdDocument" = %s', (so_key,)
    )
    for r in dl_rows:
        dl_key = r["deliveryDocument"]
        dl_id = f"DL:{dl_key}"
        if dl_id not in nodes:
            dl_data = execute_query(
                'SELECT * FROM outbound_delivery_headers WHERE "deliveryDocument" = %s', (dl_key,)
            )
            if dl_data:
                _add_node(nodes, dl_id, "Delivery", f"DL {dl_key}", dl_data[0])
        if dl_id in nodes:
            edges.append(GraphEdge(source=so_id, target=dl_id, type="DELIVERED_VIA"))
        _follow_downstream_from_dl(dl_key, dl_id, nodes, edges)

    bd_rows = execute_query(
        'SELECT DISTINCT bdi."billingDocument" FROM billing_document_items bdi '
        'WHERE bdi."referenceSdDocument" = %s', (so_key,)
    )
    for r in bd_rows:
        bd_key = r["billingDocument"]
        _add_billing_node_and_downstream(bd_key, so_id, nodes, edges)


def _follow_downstream_from_dl(dl_key: str, dl_id: str, nodes: dict, edges: list):
    bd_rows = execute_query(
        'SELECT DISTINCT bdi."billingDocument" FROM billing_document_items bdi '
        'WHERE bdi."referenceSdDocument" = %s', (dl_key,)
    )
    for r in bd_rows:
        _add_billing_node_and_downstream(r["billingDocument"], dl_id, nodes, edges)


def _add_billing_node_and_downstream(bd_key: str, source_id: str, nodes: dict, edges: list):
    bd_id = f"BD:{bd_key}"
    if bd_id not in nodes:
        bd_rows = execute_query(
            'SELECT * FROM billing_document_headers WHERE "billingDocument" = %s', (bd_key,)
        )
        if bd_rows:
            _add_node(nodes, bd_id, "BillingDocument", f"BD {bd_key}", bd_rows[0])
            _follow_downstream_from_bd(bd_rows[0], bd_id, nodes, edges)
    edges.append(GraphEdge(source=source_id, target=bd_id, type="BILLED_VIA"))


def _follow_downstream_from_bd(bd: dict, bd_id: str, nodes: dict, edges: list):
    acct_doc = bd.get("accountingDocument")
    if not acct_doc:
        return

    je_id = f"JE:{acct_doc}"
    if je_id not in nodes:
        je_rows = execute_query(
            'SELECT * FROM journal_entry_items_accounts_receivable '
            'WHERE "accountingDocument" = %s LIMIT 1', (acct_doc,)
        )
        if je_rows:
            _add_node(nodes, je_id, "JournalEntry", f"JE {acct_doc}", je_rows[0])
    if je_id in nodes:
        edges.append(GraphEdge(source=bd_id, target=je_id, type="ACCOUNTED_IN"))
        _follow_payments(acct_doc, je_id, nodes, edges)


def _follow_payments(acct_doc: str, je_id: str, nodes: dict, edges: list):
    pay_rows = execute_query(
        'SELECT * FROM payments_accounts_receivable '
        'WHERE "clearingAccountingDocument" = %s LIMIT 1', (acct_doc,)
    )
    for pay in pay_rows:
        pay_id = f"PAY:{pay['accountingDocument']}"
        if pay_id not in nodes:
            _add_node(nodes, pay_id, "Payment", f"PAY {pay['accountingDocument']}", pay)
        edges.append(GraphEdge(source=je_id, target=pay_id, type="PAID_VIA"))


def _add_node(nodes: dict, nid: str, ntype: str, label: str, metadata: dict):
    if nid not in nodes:
        nodes[nid] = GraphNode(id=nid, type=ntype, label=label, metadata=metadata)


def _dedupe_edges(edges: list[GraphEdge]) -> list[GraphEdge]:
    seen = set()
    result = []
    for e in edges:
        key = f"{e.source}->{e.target}"
        if key not in seen:
            seen.add(key)
            result.append(e)
    return result


def _build_flow_sequence(nodes: dict) -> list[str]:
    order = ["SalesOrder", "Delivery", "BillingDocument", "JournalEntry", "Payment"]
    flow = []
    for t in order:
        for n in nodes.values():
            if n.type == t and n.label not in flow:
                flow.append(n.label)
    return flow
