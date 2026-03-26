import { create } from 'zustand'
import { sendChatQuery, type ChatResponse } from '@/api/client'
import { useGraphStore } from '@/store/graphStore'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql?: string | null
  data?: Record<string, string | null>[] | null
  off_topic?: boolean
  loading?: boolean
}

const TRACE_PATTERN = /\b(?:trace|flow|journey|path)\b.*?\b(\d{6,})\b/i
const DOC_ID_PATTERN = /\b(\d{6,})\b/

interface ChatState {
  messages: ChatMessage[]
  loading: boolean
  sendMessage: (question: string) => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I can help you analyze the **Order to Cash** process.',
    },
  ],
  loading: false,

  sendMessage: async (question: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    }
    const loadingMsg: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      loading: true,
    }

    set((state) => ({
      messages: [...state.messages, userMsg, loadingMsg],
      loading: true,
    }))

    const traceMatch = question.match(TRACE_PATTERN)
    if (traceMatch) {
      const docId = traceMatch[1]
      useGraphStore.getState().traceDocument(docId)
    } else {
      useGraphStore.getState().clearTrace()
    }

    const history = get()
      .messages.filter((m) => m.id !== 'welcome' && !m.loading)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const response: ChatResponse = await sendChatQuery(question, history)

      if (!traceMatch && response.data && response.data.length > 0) {
        const firstRow = response.data[0]
        const idColumns = ['salesOrder', 'billingDocument', 'deliveryDocument', 'accountingDocument']
        for (const col of idColumns) {
          if (firstRow[col]) {
            const docMatch = String(firstRow[col]).match(DOC_ID_PATTERN)
            if (docMatch && response.data.length <= 5) {
              for (const row of response.data) {
                const val = row[col]
                if (val) useGraphStore.getState().traceDocument(String(val))
              }
              break
            }
          }
        }
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sql: response.sql,
        data: response.data,
        off_topic: response.off_topic,
      }
      set((state) => ({
        messages: state.messages.filter((m) => !m.loading).concat(aiMsg),
        loading: false,
      }))
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }
      set((state) => ({
        messages: state.messages.filter((m) => !m.loading).concat(errorMsg),
        loading: false,
      }))
    }
  },
}))
