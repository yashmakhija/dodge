import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, ArrowRight, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import type { NodeDetailResponse } from '@/api/client'

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SalesOrder: { label: 'Sales Order', color: '#2563eb', bg: '#eff6ff' },
  Delivery: { label: 'Delivery', color: '#059669', bg: '#ecfdf5' },
  BillingDocument: { label: 'Billing Document', color: '#d97706', bg: '#fffbeb' },
  JournalEntry: { label: 'Journal Entry', color: '#7c3aed', bg: '#f5f3ff' },
  Payment: { label: 'Payment', color: '#0d9488', bg: '#f0fdfa' },
  BusinessPartner: { label: 'Business Partner', color: '#dc2626', bg: '#fef2f2' },
  Product: { label: 'Product', color: '#ea580c', bg: '#fff7ed' },
}

const PRIORITY_KEYS = new Set([
  'salesOrder', 'deliveryDocument', 'billingDocument', 'accountingDocument',
  'businessPartner', 'customer', 'product', 'material',
  'businessPartnerName', 'businessPartnerFullName', 'productDescription',
  'totalNetAmount', 'netAmount', 'transactionCurrency', 'amountInTransactionCurrency',
  'creationDate', 'billingDocumentDate', 'postingDate',
  'overallDeliveryStatus', 'overallGoodsMovementStatus',
  'soldToParty', 'plant', 'productionPlant',
])

interface Props {
  node: NodeDetailResponse
  onClose: () => void
  onExpand: (nodeId: string) => void
  isExpanded: boolean
}

export default function NodeDetail({ node, onClose, onExpand, isExpanded }: Props) {
  const [showAll, setShowAll] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanding, setExpanding] = useState(false)

  const config = TYPE_CONFIG[node.type] || { label: node.type, color: '#64748b', bg: '#f8fafc' }
  const allFields = Object.entries(node.metadata).filter(([, v]) => v !== null && v !== '')

  const priorityFields = allFields.filter(([k]) => PRIORITY_KEYS.has(k))
  const otherFields = allFields.filter(([k]) => !PRIORITY_KEYS.has(k))
  const visibleFields = showAll ? allFields : priorityFields.slice(0, 8)
  const hiddenCount = allFields.length - visibleFields.length

  const handleCopy = () => {
    const text = allFields.map(([k, v]) => `${k}: ${v}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="absolute top-3 left-3 z-20 w-[320px] max-h-[calc(100%-24px)] flex flex-col bg-card border rounded-lg shadow-xl overflow-hidden">
      <div className="px-4 py-3 shrink-0 flex items-start justify-between" style={{ backgroundColor: config.bg }}>
        <div>
          <Badge
            className="text-[10px] font-semibold border-0 mb-1.5"
            style={{ backgroundColor: `${config.color}18`, color: config.color }}
          >
            {config.label}
          </Badge>
          <h3 className="text-[15px] font-bold tracking-tight leading-tight">{node.label}</h3>
          <p className="text-[11px] mt-0.5" style={{ color: config.color }}>
            {node.connections} connection{node.connections !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-0.5 -mr-1 text-muted-foreground" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
        <div className="space-y-0">
          {visibleFields.map(([key, value]) => (
            <div key={key} className="group flex items-baseline justify-between py-[5px] border-b border-border/40 last:border-0">
              <span className="text-[11.5px] font-medium text-muted-foreground shrink-0 mr-2">{key}</span>
              <span className="text-[11.5px] text-foreground text-right max-w-[170px] break-all font-mono leading-tight">
                {formatValue(String(value))}
              </span>
            </div>
          ))}
        </div>

        {hiddenCount > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronDown className="h-3 w-3" />
            Show {hiddenCount} more fields
          </button>
        )}

        {showAll && otherFields.length > 0 && (
          <button
            onClick={() => setShowAll(false)}
            className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronUp className="h-3 w-3" />
            Show less
          </button>
        )}
      </div>

      <div className="px-3 py-2.5 border-t shrink-0 flex gap-1.5">
        {!isExpanded ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-[11px] h-7 justify-between"
            disabled={expanding}
            onClick={async () => {
              setExpanding(true)
              await onExpand(node.id)
              setExpanding(false)
            }}
          >
            {expanding ? 'Loading...' : 'Expand Related'}
            <ArrowRight className="h-3 w-3" />
          </Button>
        ) : (
          <div className="flex-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <Check className="h-3 w-3" />
            Expanded
          </div>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  )
}

function formatValue(value: string): string {
  if (value.includes('T00:00:00.000Z')) return value.split('T')[0]
  if (value.startsWith('{') && value.includes('"hours"')) {
    try {
      const t = JSON.parse(value)
      return `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`
    } catch { return value }
  }
  return value
}
