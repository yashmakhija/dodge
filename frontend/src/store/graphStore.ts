import { create } from 'zustand'
import {
  fetchExpandNode,
  fetchGraphOverview,
  fetchNodeDetail,
  fetchTrace,
  type GraphNode,
  type GraphEdge,
  type NodeDetailResponse,
} from '@/api/client'

interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  loading: boolean
  error: string | null
  selectedNode: NodeDetailResponse | null
  expandedNodes: Set<string>
  traceNodeIds: Set<string>
  traceFlow: string[]

  fetchOverview: () => Promise<void>
  selectNode: (nodeId: string) => Promise<void>
  clearSelection: () => void
  expandNode: (nodeId: string) => Promise<void>
  traceDocument: (docId: string) => Promise<void>
  clearTrace: () => void
}

const edgeKey = (e: any) => {
  const s = typeof e.source === 'string' ? e.source : e.source?.id
  const t = typeof e.target === 'string' ? e.target : e.target?.id
  return `${s}->${t}`
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  loading: true,
  error: null,
  selectedNode: null,
  expandedNodes: new Set(),
  traceNodeIds: new Set(),
  traceFlow: [],

  fetchOverview: async () => {
    try {
      const { nodes, edges } = await fetchGraphOverview()
      set({ nodes, edges, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  selectNode: async (nodeId: string) => {
    try {
      const detail = await fetchNodeDetail(nodeId)
      set({ selectedNode: detail })
    } catch {
      set({ selectedNode: null })
    }
  },

  clearSelection: () => set({ selectedNode: null }),

  expandNode: async (nodeId: string) => {
    const { expandedNodes } = get()
    if (expandedNodes.has(nodeId)) return

    try {
      const { nodes: newNodes, edges: newEdges } = await fetchExpandNode(nodeId)

      set((state) => {
        const existingIds = new Set(state.nodes.map((n) => n.id))
        const uniqueNodes = newNodes.filter((n) => !existingIds.has(n.id))
        const existingEdgeKeys = new Set(state.edges.map(edgeKey))
        const uniqueEdges = newEdges.filter((e) => !existingEdgeKeys.has(edgeKey(e)))

        const nextExpanded = new Set(state.expandedNodes)
        nextExpanded.add(nodeId)

        return {
          nodes: [...state.nodes, ...uniqueNodes],
          edges: [...state.edges, ...uniqueEdges],
          expandedNodes: nextExpanded,
        }
      })
    } catch (err) {
      console.error('Failed to expand node:', err)
    }
  },

  traceDocument: async (docId: string) => {
    try {
      const { nodes: traceNodes, edges: traceEdges, flow } = await fetchTrace(docId)

      set((state) => {
        const existingIds = new Set(state.nodes.map((n) => n.id))
        const uniqueNodes = traceNodes.filter((n) => !existingIds.has(n.id))
        const existingEdgeKeys = new Set(state.edges.map(edgeKey))
        const uniqueEdges = traceEdges.filter((e) => !existingEdgeKeys.has(edgeKey(e)))
        const traceIds = new Set(traceNodes.map((n) => n.id))

        return {
          nodes: [...state.nodes, ...uniqueNodes],
          edges: [...state.edges, ...uniqueEdges],
          traceNodeIds: traceIds,
          traceFlow: flow,
        }
      })
    } catch (err) {
      console.error('Failed to trace document:', err)
    }
  },

  clearTrace: () => set({ traceNodeIds: new Set(), traceFlow: [] }),
}))
