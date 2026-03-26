import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { X } from 'lucide-react'
import type { NodeDetailResponse } from '@/api/client'

const TYPE_LABELS: Record<string, string> = {
  SalesOrder: 'Sales Order',
  Delivery: 'Delivery',
  BillingDocument: 'Billing Document',
  JournalEntry: 'Journal Entry',
  Payment: 'Payment',
  BusinessPartner: 'Business Partner',
  Product: 'Product',
}

const TYPE_COLORS: Record<string, string> = {
  SalesOrder: '#3b82f6',
  Delivery: '#10b981',
  BillingDocument: '#f59e0b',
  JournalEntry: '#8b5cf6',
  Payment: '#14b8a6',
  BusinessPartner: '#ef4444',
  Product: '#f97316',
}

interface Props {
  node: NodeDetailResponse
  onClose: () => void
  onExpand: (nodeId: string) => void
  isExpanded: boolean
}

export default function NodeDetail({ node, onClose, onExpand, isExpanded }: Props) {
  const fields = Object.entries(node.metadata).filter(([, v]) => v !== null && v !== '')
  const color = TYPE_COLORS[node.type] || '#64748b'

  return (
    <Card className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 w-[400px] max-h-[72vh] shadow-lg animate-[slide-down_0.2s_ease-out]">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <Badge
            variant="secondary"
            className="text-[11px] font-semibold tracking-wide"
            style={{ background: `${color}14`, color }}
          >
            {TYPE_LABELS[node.type] || node.type}
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <h3 className="text-[17px] font-bold tracking-tight mt-1">{node.label}</h3>
        <div className="flex gap-1.5 text-xs text-muted-foreground mt-1">
          <span>Entity: {TYPE_LABELS[node.type] || node.type}</span>
          <span className="text-border">·</span>
          <span>Connections: {node.connections}</span>
        </div>
      </CardHeader>

      <Separator />

      <ScrollArea className="max-h-[45vh]">
        <CardContent className="p-4 pt-3">
          <div className="space-y-0.5">
            {fields.map(([key, value]) => (
              <div key={key} className="flex justify-between items-baseline py-1.5 border-b border-muted/50 last:border-0">
                <span className="text-xs font-semibold text-foreground shrink-0">{key}</span>
                <span className="text-[11px] text-muted-foreground text-right max-w-[220px] break-all font-mono">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>

          {!isExpanded && (
            <Button variant="outline" className="w-full mt-4 text-xs" onClick={() => onExpand(node.id)}>
              View Related Entities →
            </Button>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  )
}
