import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Send, ChevronDown, ChevronUp, Database, Loader2 } from 'lucide-react'
import type { ChatMessage } from '@/hooks/useChat'

interface Props {
  messages: ChatMessage[]
  loading: boolean
  onSend: (question: string) => void
}

export default function ChatPanel({ messages, loading, onSend }: Props) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <aside className="w-[370px] shrink-0 bg-card flex flex-col border-l">
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl grid place-items-center font-bold text-base tracking-tight shrink-0">
          D
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight">Dodge AI</div>
          <div className="text-[11.5px] text-muted-foreground">Graph Agent</div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 space-y-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
          {loading ? 'Dodge AI is thinking...' : 'Dodge AI is awaiting instructions'}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Analyze anything"
            disabled={loading}
            className="text-sm"
          />
          <Button size="icon" onClick={handleSubmit} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </aside>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [showSql, setShowSql] = useState(false)
  const [showData, setShowData] = useState(false)

  if (message.loading) {
    return (
      <div className="flex gap-2 items-center max-w-[90%] px-3.5 py-2.5 bg-muted rounded-xl rounded-bl-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Thinking...</span>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3.5 py-2.5 bg-primary text-primary-foreground rounded-xl rounded-br-sm text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[95%] space-y-2">
      <div className="px-3.5 py-2.5 bg-muted rounded-xl rounded-bl-sm text-sm leading-relaxed text-muted-foreground">
        <FormattedContent content={message.content} />
      </div>

      {message.sql && (
        <div>
          <button
            onClick={() => setShowSql(!showSql)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Database className="h-3 w-3" />
            <span>SQL Query</span>
            {showSql ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showSql && (
            <pre className="mt-1.5 p-3 bg-primary/5 border rounded-md text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap text-foreground/80">
              {message.sql}
            </pre>
          )}
        </div>
      )}

      {message.data && message.data.length > 0 && (
        <div>
          <button
            onClick={() => setShowData(!showData)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {message.data.length} rows
            </Badge>
            <span>Results</span>
            {showData ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showData && <DataTable data={message.data} />}
        </div>
      )}
    </div>
  )
}

function FormattedContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function DataTable({ data }: { data: Record<string, string | null>[] }) {
  if (!data.length) return null
  const columns = Object.keys(data[0])

  return (
    <div className="mt-1.5 border rounded-md overflow-auto max-h-[250px]">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-muted/50 sticky top-0">
            {columns.map((col) => (
              <th key={col} className="px-2.5 py-1.5 text-left font-semibold text-foreground whitespace-nowrap border-b">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-2.5 py-1.5 text-muted-foreground whitespace-nowrap font-mono">
                  {row[col] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
