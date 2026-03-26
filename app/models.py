from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    metadata: dict


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class NodeDetailResponse(BaseModel):
    id: str
    type: str
    label: str
    metadata: dict
    connections: int
