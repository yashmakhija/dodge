import { useMemo } from 'react'
import type { ChatMessage } from '@/store/chatStore'

const MAX_HIGHLIGHTED = 15

const PREFIX_MAP: Record<string, string[]> = {
  salesOrder: ['SO:'],
  salesorder: ['SO:'],
  deliveryDocument: ['DL:'],
  deliverydocument: ['DL:'],
  billingDocument: ['BD:'],
  billingdocument: ['BD:'],
  accountingDocument: ['JE:', 'PAY:'],
  accountingdocument: ['JE:', 'PAY:'],
  businessPartner: ['BP:'],
  businesspartner: ['BP:'],
  customer: ['BP:'],
  product: ['PRD:'],
  material: ['PRD:'],
  product_id: ['PRD:'],
}

export function useHighlightedNodes(
  messages: ChatMessage[],
  graphNodeIds: Set<string>
): Set<string> {
  return useMemo(() => {
    const highlighted = new Set<string>()

    const lastAiMsg = [...messages].reverse().find(
      (m) => m.role === 'assistant' && m.data && m.data.length > 0
    )

    if (!lastAiMsg?.data) return highlighted

    for (const row of lastAiMsg.data) {
      if (highlighted.size >= MAX_HIGHLIGHTED) break
      for (const [key, value] of Object.entries(row)) {
        if (!value || highlighted.size >= MAX_HIGHLIGHTED) continue
        const prefixes = PREFIX_MAP[key] || PREFIX_MAP[key.toLowerCase()]
        if (!prefixes) continue
        for (const prefix of prefixes) {
          const nodeId = `${prefix}${value}`
          if (graphNodeIds.has(nodeId)) {
            highlighted.add(nodeId)
          }
        }
      }
    }

    return highlighted
  }, [messages, graphNodeIds])
}
