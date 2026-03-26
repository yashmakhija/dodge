import { useCallback, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Button } from '@/components/ui/button'
import { Minimize2, Maximize2, Eye, EyeOff } from 'lucide-react'
import type { NodeDetailResponse } from '@/api/client'

const NODE_COLORS: Record<string, string> = {
  SalesOrder: '#2563eb',
  Delivery: '#059669',
  BillingDocument: '#d97706',
  JournalEntry: '#7c3aed',
  Payment: '#0d9488',
  BusinessPartner: '#dc2626',
  Product: '#ea580c',
  SalesOrderItem: '#93c5fd',
  DeliveryItem: '#6ee7b7',
  BillingDocumentItem: '#fcd34d',
  ScheduleLine: '#c4b5fd',
  Cancellation: '#fca5a5',
  Plant: '#a78bfa',
  Address: '#fb923c',
  SalesAreaAssignment: '#f9a8d4',
}

const NODE_RADII: Record<string, number> = {
  BusinessPartner: 7,
  SalesOrder: 5,
  Delivery: 4.5,
  BillingDocument: 4.5,
  Product: 4,
  JournalEntry: 3.5,
  Payment: 3.5,
}

const GRANULAR_TYPES = new Set([
  'SalesOrderItem', 'DeliveryItem', 'BillingDocumentItem',
  'ScheduleLine', 'Cancellation', 'Address', 'SalesAreaAssignment',
])

const LEGEND: [string, string][] = [
  ['SalesOrder', 'Sales Order'],
  ['Delivery', 'Delivery'],
  ['BillingDocument', 'Billing'],
  ['JournalEntry', 'Journal'],
  ['Payment', 'Payment'],
  ['BusinessPartner', 'Customer'],
  ['Product', 'Product'],
]

interface Props {
  nodes: any[]
  edges: any[]
  loading: boolean
  selectedNode: NodeDetailResponse | null
  expandedNodes: Set<string>
  highlightedNodes: Set<string>
  traceNodeIds: Set<string>
  onNodeClick: (nodeId: string) => void
  onNodeExpand: (nodeId: string) => void
}

export default function GraphPanel({
  nodes,
  edges,
  loading,
  selectedNode,
  expandedNodes,
  highlightedNodes,
  traceNodeIds,
  onNodeClick,
  onNodeExpand,
}: Props) {
  const graphRef = useRef<any>(null)
  const selectedRef = useRef(selectedNode)
  const expandedRef = useRef(expandedNodes)
  const highlightedRef = useRef(highlightedNodes)
  const traceRef = useRef(traceNodeIds)
  selectedRef.current = selectedNode
  expandedRef.current = expandedNodes
  highlightedRef.current = highlightedNodes
  traceRef.current = traceNodeIds

  const [showGranular, setShowGranular] = useState(false)
  const [minimized, setMinimized] = useState(false)

  const filteredNodes = useMemo(
    () => showGranular ? nodes : nodes.filter((n: any) => !GRANULAR_TYPES.has(n.type)),
    [nodes, showGranular]
  )

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map((n: any) => n.id))
    return edges.filter((e: any) => {
      const s = typeof e.source === 'string' ? e.source : e.source?.id
      const t = typeof e.target === 'string' ? e.target : e.target?.id
      return ids.has(s) && ids.has(t)
    })
  }, [edges, filteredNodes])

  const graphData = useMemo(
    () => ({ nodes: filteredNodes, links: filteredEdges }),
    [filteredNodes, filteredEdges]
  )

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = NODE_RADII[node.type] || 3
      const color = NODE_COLORS[node.type] || '#94a3b8'
      const selected = selectedRef.current?.id === node.id
      const highlighted = highlightedRef.current.has(node.id)
      const traced = traceRef.current.has(node.id)
      const emphasis = highlighted || traced
      const drawR = emphasis ? r + 1.5 : r

      if (traced && !selected) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, drawR + 4, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = 2.5
        ctx.stroke()
      } else if (highlighted && !selected) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, drawR + 3, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, drawR, 0, Math.PI * 2)

      if (selected) {
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 2
        ctx.stroke()
      } else if (emphasis) {
        ctx.fillStyle = color
        ctx.fill()
      } else if (expandedRef.current.has(node.id)) {
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = `${color}60`
        ctx.lineWidth = 1.2
        ctx.stroke()
      } else {
        ctx.fillStyle = `${color}c0`
        ctx.fill()
      }

      const showLabel = globalScale > 2.5 || traced
      if (showLabel) {
        const fs = traced ? Math.max(10 / globalScale, 3) : Math.max(8 / globalScale, 2)
        ctx.font = `${traced ? '600' : '500'} ${fs}px 'IBM Plex Sans', sans-serif`
        ctx.fillStyle = traced ? '#0f172a' : '#1e293b'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(node.label || '', node.x, node.y + drawR + 1.5)
      }
    },
    []
  )

  const handleClick = useCallback((node: any) => onNodeClick(node.id), [onNodeClick])
  const handleRightClick = useCallback((node: any) => onNodeExpand(node.id), [onNodeExpand])

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground text-[13px]">
        <div className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
        <p>Loading graph...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" style={minimized ? { maxHeight: 200 } : undefined}>
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] font-medium shadow-sm bg-card gap-1.5"
          onClick={() => setMinimized(!minimized)}
        >
          {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          {minimized ? 'Expand' : 'Minimize'}
        </Button>
        <Button
          variant={showGranular ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-[11px] font-medium shadow-sm bg-card gap-1.5"
          onClick={() => setShowGranular(!showGranular)}
        >
          {showGranular ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showGranular ? 'Hide' : 'Show'} Granular
        </Button>
        <span className="ml-1 text-[10px] text-muted-foreground font-mono tabular-nums">
          {filteredNodes.length} nodes · {filteredEdges.length} edges
          {highlightedNodes.size > 0 && (
            <span className="ml-1 text-blue-600 font-semibold">
              · {highlightedNodes.size} highlighted
            </span>
          )}
        </span>
      </div>

      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          ctx.beginPath()
          ctx.arc(node.x, node.y, (NODE_RADII[node.type] || 3) + 3, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }}
        onNodeClick={handleClick}
        onNodeRightClick={handleRightClick}
        linkColor={() => 'rgba(148, 163, 184, 0.18)'}
        linkWidth={0.5}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={() => 'rgba(148, 163, 184, 0.3)'}
        d3AlphaDecay={0.04}
        d3VelocityDecay={0.25}
        cooldownTicks={120}
        warmupTicks={60}
        backgroundColor="transparent"
      />

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 px-3 py-1.5 bg-card/95 backdrop-blur-sm border rounded-md shadow-sm">
        {LEGEND.map(([type, label]) => (
          <span key={type} className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[type] }} />
            {label}
          </span>
        ))}
      </div>

      <div className="absolute bottom-3 right-3 z-10 text-[10px] text-muted-foreground/60 font-mono">
        click: inspect · right-click: expand
      </div>
    </div>
  )
}
