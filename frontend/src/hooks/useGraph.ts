import { useCallback, useEffect, useState } from 'react'
import {
  fetchExpandNode,
  fetchGraphOverview,
  fetchNodeDetail,
  type GraphEdge,
  type GraphNode,
  type NodeDetailResponse,
} from '@/api/client'

interface ForceNode extends GraphNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface ForceEdge {
  source: string | ForceNode
  target: string | ForceNode
  type: string
}

interface GraphState {
  nodes: ForceNode[]
  edges: ForceEdge[]
  loading: boolean
  error: string | null
  selectedNode: NodeDetailResponse | null
  expandedNodes: Set<string>
}

export function useGraph() {
  const [state, setState] = useState<GraphState>({
    nodes: [],
    edges: [],
    loading: true,
    error: null,
    selectedNode: null,
    expandedNodes: new Set(),
  })

  const nodeMap = new Map<string, ForceNode>()
  state.nodes.forEach((n) => nodeMap.set(n.id, n))

  useEffect(() => {
    fetchGraphOverview()
      .then(({ nodes, edges }) => {
        setState((prev) => ({
          ...prev,
          nodes: nodes as ForceNode[],
          edges: edges as ForceEdge[],
          loading: false,
        }))
      })
      .catch((err) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.message,
        }))
      })
  }, [])

  const selectNode = useCallback(async (nodeId: string) => {
    try {
      const detail = await fetchNodeDetail(nodeId)
      setState((prev) => ({ ...prev, selectedNode: detail }))
    } catch {
      setState((prev) => ({ ...prev, selectedNode: null }))
    }
  }, [])

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedNode: null }))
  }, [])

  const expandNode = useCallback(async (nodeId: string) => {
    setState((prev) => {
      if (prev.expandedNodes.has(nodeId)) return prev
      return prev
    })

    try {
      const { nodes: newNodes, edges: newEdges } = await fetchExpandNode(nodeId)

      setState((prev) => {
        const existingIds = new Set(prev.nodes.map((n) => n.id))
        const uniqueNewNodes = newNodes.filter((n) => !existingIds.has(n.id))

        const existingEdgeKeys = new Set(
          prev.edges.map((e) => {
            const src = typeof e.source === 'string' ? e.source : e.source.id
            const tgt = typeof e.target === 'string' ? e.target : e.target.id
            return `${src}->${tgt}`
          })
        )
        const uniqueNewEdges = newEdges.filter(
          (e) => !existingEdgeKeys.has(`${e.source}->${e.target}`)
        )

        const expanded = new Set(prev.expandedNodes)
        expanded.add(nodeId)

        return {
          ...prev,
          nodes: [...prev.nodes, ...(uniqueNewNodes as ForceNode[])],
          edges: [...prev.edges, ...(uniqueNewEdges as ForceEdge[])],
          expandedNodes: expanded,
        }
      })
    } catch (err) {
      console.error('Failed to expand node:', err)
    }
  }, [])

  return {
    nodes: state.nodes,
    edges: state.edges,
    loading: state.loading,
    error: state.error,
    selectedNode: state.selectedNode,
    expandedNodes: state.expandedNodes,
    selectNode,
    clearSelection,
    expandNode,
  }
}
