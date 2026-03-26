import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  traceFlow?: string[] | null
}

interface ChatState {
  messages: ChatMessage[]
  loading: boolean
  sendMessage: (question: string) => Promise<void>
  clearHistory: () => void
}

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi! I can help you analyze the **Order to Cash** process.',
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [WELCOME_MSG],
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

        useGraphStore.getState().clearTrace()

        const history = get()
          .messages.filter((m) => m.id !== 'welcome' && !m.loading)
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }))

        try {
          const response: ChatResponse = await sendChatQuery(question, history)

          if (response.trace_doc_id) {
            await useGraphStore.getState().traceDocument(response.trace_doc_id)
          }

          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: response.answer,
            sql: response.sql,
            data: response.data,
            off_topic: response.off_topic,
            traceFlow: response.trace_flow,
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

      clearHistory: () => set({ messages: [WELCOME_MSG], loading: false }),
    }),
    {
      name: 'dodge-chat-history',
      partialize: (state) => ({
        messages: state.messages.filter((m) => !m.loading),
      }),
    }
  )
)
