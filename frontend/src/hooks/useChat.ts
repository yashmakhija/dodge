import { useCallback, useState } from 'react'
import { sendChatQuery, type ChatResponse } from '@/api/client'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql?: string | null
  data?: Record<string, string | null>[] | null
  off_topic?: boolean
  loading?: boolean
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I can help you analyze the **Order to Cash** process.',
    },
  ])
  const [loading, setLoading] = useState(false)

  const sendMessage = useCallback(async (question: string) => {
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

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setLoading(true)

    const history = messages
      .filter((m) => m.id !== 'welcome' && !m.loading)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const response: ChatResponse = await sendChatQuery(question, history)

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sql: response.sql,
        data: response.data,
        off_topic: response.off_topic,
      }

      setMessages((prev) => prev.filter((m) => !m.loading).concat(aiMsg))
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }
      setMessages((prev) => prev.filter((m) => !m.loading).concat(errorMsg))
    } finally {
      setLoading(false)
    }
  }, [messages])

  return { messages, loading, sendMessage }
}
