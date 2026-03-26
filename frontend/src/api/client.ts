import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export interface GraphNode {
  id: string
  type: string
  label: string
  metadata: Record<string, string | null>
}

export interface GraphEdge {
  source: string
  target: string
  type: string
}

export interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface NodeDetailResponse {
  id: string
  type: string
  label: string
  metadata: Record<string, string | null>
  connections: number
}

export interface ChatResponse {
  answer: string
  sql: string | null
  data: Record<string, string | null>[] | null
  error: string | null
  off_topic: boolean
}

export async function fetchGraphOverview(): Promise<GraphResponse> {
  const { data } = await api.get<GraphResponse>('/graph/overview')
  return data
}

export async function fetchNodeDetail(nodeId: string): Promise<NodeDetailResponse> {
  const { data } = await api.get<NodeDetailResponse>(`/graph/node/${encodeURIComponent(nodeId)}`)
  return data
}

export async function fetchExpandNode(nodeId: string): Promise<GraphResponse> {
  const { data } = await api.get<GraphResponse>(`/graph/expand/${encodeURIComponent(nodeId)}`)
  return data
}

export interface TraceResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
  flow: string[]
}

export async function fetchTrace(docId: string): Promise<TraceResponse> {
  const { data } = await api.get<TraceResponse>(`/graph/trace/${encodeURIComponent(docId)}`)
  return data
}

export async function sendChatQuery(
  question: string,
  history: { role: string; content: string }[]
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/chat/query', { question, history })
  return data
}
