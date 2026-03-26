import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import Logo from '@/components/Logo'
import { ChevronDown, ChevronUp, Code2, Table2, Trash2, MessageSquare } from 'lucide-react'
import type { ChatMessage } from '@/store/chatStore'

const SUGGESTIONS = [
  'How many sales orders are there?',
  'Which products have the most billing documents?',
  'Trace the flow of billing document 91150187',
  'Find sales orders delivered but not billed',
  'Show all business partners',
  'What is the total net amount across all sales orders?',
]

interface Props {
  messages: ChatMessage[]
  loading: boolean
  onSend: (question: string) => void
  onClear: () => void
}

export default function ChatPanel({ messages, loading, onSend, onClear }: Props) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const showSuggestions = messages.length <= 1

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return
    onSend(trimmed)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <aside className="w-[380px] max-md:w-full h-full shrink-0 bg-card flex flex-col rounded-md max-md:rounded-none border max-md:border-0 overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b shrink-0 flex items-start justify-between">
        <div>
          <div className="text-[13px] font-semibold">Chat with Graph</div>
          <div className="text-[11px] text-muted-foreground">Order to Cash</div>
        </div>
        {messages.length > 1 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all messages and start a fresh conversation. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                <AlertDialogAction className="text-xs" onClick={onClear}>Clear All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 py-4 space-y-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {showSuggestions && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <MessageSquare className="h-3 w-3" />
                Try asking
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => { if (!loading) onSend(q) }}
                    disabled={loading}
                    className="text-left text-[11.5px] px-2.5 py-1.5 bg-muted/60 hover:bg-muted border rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 mx-4 mb-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-1.5 px-3.5 pt-3 text-[10.5px] text-muted-foreground">
          <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          {loading ? 'Dodge AI is thinking...' : 'Dodge AI is awaiting instructions'}
        </div>
        <div className="px-3.5 pt-1.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Analyze anything"
            disabled={loading}
            rows={1}
            className="w-full bg-transparent text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 resize-none outline-none disabled:opacity-50 min-h-[24px] max-h-[120px]"
          />
        </div>
        <div className="flex justify-end px-3 pb-3">
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="px-4 py-1.5 bg-foreground text-background text-[12px] font-semibold rounded-md disabled:opacity-25 hover:opacity-90 transition-opacity"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] h-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-muted-foreground/60"
          style={{
            animation: 'thinking 1.4s infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes thinking {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </span>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [showSql, setShowSql] = useState(false)
  const hasData = message.data && message.data.length > 0
  const [showData, setShowData] = useState(hasData && message.data!.length <= 20)

  if (message.loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <Logo size={28} className="shrink-0" />
          <div>
            <div className="text-[12px] font-bold leading-tight">Dodge AI</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Graph Agent</div>
          </div>
        </div>
        <div className="pl-[38px]">
          <ThinkingDots />
        </div>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">You</span>
          <div className="w-6 h-6 bg-muted rounded-full grid place-items-center text-[12px]">
            👤
          </div>
        </div>
        <div className="bg-foreground text-background px-4 py-2.5 rounded-2xl rounded-tr-sm text-[13px] leading-relaxed max-w-[90%]">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <Logo size={28} className="shrink-0" />
        <div>
          <div className="text-[12px] font-bold leading-tight">Dodge AI</div>
          <div className="text-[10px] text-muted-foreground leading-tight">Graph Agent</div>
        </div>
      </div>

      <div className="pl-[38px] space-y-2.5">
        <div className="text-[13px] leading-relaxed text-foreground/90">
          <FormattedContent content={message.content} />
        </div>

        {message.traceFlow && message.traceFlow.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 py-2">
            {message.traceFlow.map((step, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="px-2 py-0.5 bg-foreground/5 border rounded text-[11px] font-mono font-medium">
                  {step}
                </span>
                {i < message.traceFlow!.length - 1 && (
                  <span className="text-muted-foreground text-xs">→</span>
                )}
              </span>
            ))}
          </div>
        )}

        {message.sql && (
          <button
            onClick={() => setShowSql(!showSql)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          >
            <Code2 className="h-3 w-3" />
            <span className="group-hover:underline">SQL Query</span>
            {showSql ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        {message.sql && showSql && (
          <pre className="p-3 bg-foreground/[0.03] border rounded-md text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap text-foreground/70">
            {message.sql}
          </pre>
        )}

        {hasData && (
          <button
            onClick={() => setShowData(!showData)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          >
            <Table2 className="h-3 w-3" />
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
              {message.data!.length}
            </Badge>
            <span className="group-hover:underline">Results</span>
            {showData ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        {hasData && showData && <DataTable data={message.data!} />}
      </div>
    </div>
  )
}

function FormattedContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/).map((part, pi) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pi} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
            }
            return <span key={pi}>{part}</span>
          })}
        </span>
      ))}
    </>
  )
}

function DataTable({ data }: { data: Record<string, string | null>[] }) {
  if (!data.length) return null
  const columns = Object.keys(data[0])

  return (
    <div className="border rounded-md overflow-auto max-h-[220px]">
      <table className="w-full text-[10.5px]">
        <thead>
          <tr className="bg-muted/60 sticky top-0">
            {columns.map((col) => (
              <th key={col} className="px-2 py-1.5 text-left font-semibold text-foreground whitespace-nowrap border-b">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-2 py-1 text-muted-foreground whitespace-nowrap font-mono">
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
