import { useCallback, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { NodeDetailResponse } from '@/api/client'

const NODE_COLORS: Record<string, string> = {
  SalesOrder: '#3b82f6',
  Delivery: '#10b981',
  BillingDocument: '#f59e0b',
  JournalEntry: '#8b5cf6',
  Payment: '#14b8a6',
  BusinessPartner: '#ef4444',
  Product: '#f97316',
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
  BusinessPartner: 8,
  SalesOrder: 6,
  Delivery: 5,
  BillingDocument: 5,
  Product: 5,
  JournalEntry: 4,
  Payment: 4,
}

const GRANULAR_TYPES = new Set([
  'SalesOrderItem', 'DeliveryItem', 'BillingDocumentItem',
  'ScheduleLine', 'Cancellation', 'Address', 'SalesAreaAssignment',
])

const LEGEND: [string, string][] = [
  ['SalesOrder', 'Sales Order'],
  ['Delivery', 'Delivery'],
  ['BillingDocument', 'Billing'],
  ['JournalEntry', 'Journal Entry'],
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
  onNodeClick: (nodeId: string) => void
  onNodeExpand: (nodeId: string) => void
}

export default function GraphPanel({
  nodes,
  edges,
  loading,
  selectedNode,
  expandedNodes,
  onNodeClick,
  onNodeExpand,
}: Props) {
  const graphRef = useRef<any>(null)
  const [showGranular, setShowGranular] = useState(false)
  const [minimized, setMinimized] = useState(false)

  const filteredNodes = showGranular
    ? nodes
    : nodes.filter((n: any) => !GRANULAR_TYPES.has(n.type))

  const visibleIds = new Set(filteredNodes.map((n: any) => n.id))
  const filteredEdges = edges.filter((e: any) => {
    const src = typeof e.source === 'string' ? e.source : e.source?.id
    const tgt = typeof e.target === 'string' ? e.target : e.target?.id
    return visibleIds.has(src) && visibleIds.has(tgt)
  })

  const graphData = { nodes: filteredNodes, links: filteredEdges }

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = NODE_RADII[node.type] || 3.5
      const color = NODE_COLORS[node.type] || '#94a3b8'
      const isSelected = selectedNode?.id === node.id

      ctx.beginPath()
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2)

      if (isSelected) {
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 2.5
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2)
        ctx.strokeStyle = `${color}40`
        ctx.lineWidth = 3
        ctx.stroke()
      } else if (expandedNodes.has(node.id)) {
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = `${color}80`
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else {
        ctx.fillStyle = `${color}cc`
        ctx.fill()
      }

      if (globalScale > 2) {
        const fontSize = Math.max(9 / globalScale, 2.5)
        ctx.font = `500 ${fontSize}px 'Geist Variable', sans-serif`
        ctx.fillStyle = '#334155'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(node.label || '', node.x, node.y + r + 2)
      }
    },
    [selectedNode, expandedNodes]
  )

  const handleNodeClick = useCallback(
    (node: any) => onNodeClick(node.id),
    [onNodeClick]
  )

  const handleNodeRightClick = useCallback(
    (node: any) => onNodeExpand(node.id),
    [onNodeExpand]
  )

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
        <div className="w-6 h-6 border-[2.5px] border-muted border-t-primary rounded-full animate-spin" />
        <p>Loading graph data...</p>
      </div>
    )
  }

  return (
    <div className={`relative w-full ${minimized ? 'h-[180px]' : 'h-full'}`}>
      <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-7 text-xs shadow-sm" onClick={() => setMinimized(!minimized)}>
          {minimized ? '⤢ Expand' : '⤡ Minimize'}
        </Button>
        <Button
          variant={showGranular ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs shadow-sm"
          onClick={() => setShowGranular(!showGranular)}
        >
          {showGranular ? '◉ Hide' : '○ Show'} Granular Overlay
        </Button>
        <span className="ml-1.5 text-[11px] text-muted-foreground font-mono">
          {filteredNodes.length} nodes · {filteredEdges.length} edges
        </span>
      </div>

      {!minimized && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            ctx.beginPath()
            ctx.arc(node.x, node.y, (NODE_RADII[node.type] || 3.5) + 3, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
          }}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
          linkColor={() => 'rgba(148, 163, 184, 0.3)'}
          linkWidth={0.6}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowColor={() => 'rgba(148, 163, 184, 0.45)'}
          d3AlphaDecay={0.04}
          d3VelocityDecay={0.25}
          cooldownTicks={120}
          warmupTicks={60}
          backgroundColor="transparent"
        />
      )}

      <div className="absolute bottom-3.5 left-3.5 z-10 flex flex-wrap gap-2 px-3 py-2 bg-card/90 backdrop-blur-sm border rounded-md shadow-sm">
        {LEGEND.map(([type, label]) => (
          <Badge key={type} variant="secondary" className="gap-1.5 text-[10.5px] font-medium py-0.5 px-2">
            <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: NODE_COLORS[type] }} />
            {label}
          </Badge>
        ))}
      </div>

      <div className="absolute bottom-3.5 right-3.5 z-10 text-[10.5px] text-muted-foreground bg-card/85 px-2.5 py-1 rounded-md border">
        Click to inspect · Right-click to expand
      </div>
    </div>
  )
}
