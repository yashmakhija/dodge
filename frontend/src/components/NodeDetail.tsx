import { Button } from '@/components/ui/button'
import { X, ArrowRight } from 'lucide-react'
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

interface Props {
  node: NodeDetailResponse
  onClose: () => void
  onExpand: (nodeId: string) => void
  isExpanded: boolean
}

export default function NodeDetail({ node, onClose, onExpand, isExpanded }: Props) {
  const fields = Object.entries(node.metadata).filter(([, v]) => v !== null && v !== '')
  const hiddenCount = Object.keys(node.metadata).length - fields.length

  return (
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-20 w-[340px] max-h-[60vh] bg-card border rounded-lg shadow-xl flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold">{TYPE_LABELS[node.type] || node.type}</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-3">
        <div className="space-y-0">
          {fields.map(([key, value]) => (
            <div key={key} className="py-1">
              <span className="text-[12.5px] font-semibold text-foreground">{key}</span>
              <span className="text-[12.5px] text-muted-foreground">: {String(value)}</span>
            </div>
          ))}
          {hiddenCount > 0 && (
            <p className="text-[11px] text-muted-foreground/60 italic pt-1">
              Additional fields hidden for readability
            </p>
          )}
          <div className="pt-1.5 text-[12.5px]">
            <span className="font-semibold text-foreground">Connections</span>
            <span className="text-muted-foreground">: {node.connections}</span>
          </div>
        </div>

        {!isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-[11px] font-medium text-muted-foreground hover:text-foreground justify-between"
            onClick={() => onExpand(node.id)}
          >
            View Related
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
