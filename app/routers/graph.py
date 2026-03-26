from fastapi import APIRouter, HTTPException

from app.models import GraphResponse, NodeDetailResponse
from app.services.graph_service import expand_node, get_node_detail, get_overview_graph
from app.services.trace_service import trace_document_flow

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("/overview", response_model=GraphResponse)
def overview():
    return get_overview_graph()


@router.get("/node/{node_id:path}", response_model=NodeDetailResponse)
def node_detail(node_id: str):
    result = get_node_detail(node_id)
    if not result:
        raise HTTPException(status_code=404, detail="Node not found")
    return result


@router.get("/expand/{node_id:path}", response_model=GraphResponse)
def expand(node_id: str):
    return expand_node(node_id)


@router.get("/trace/{doc_id}")
def trace(doc_id: str):
    return trace_document_flow(doc_id)
