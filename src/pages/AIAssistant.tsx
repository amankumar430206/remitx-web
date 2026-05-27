import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useAIAssistant, type ChatMessage, type ToolCallState } from '@/hooks/useAIAssistant'

// ─── Icons ────────────────────────────────────────────────────────────────────

const SparkleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
)

const SendIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
)

const StopIcon = () => (
  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
)

const CheckIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
)

// ─── AI Avatar ────────────────────────────────────────────────────────────────

function AIAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const icon = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <div className={cn(
      sz,
      'rounded-xl flex items-center justify-center shrink-0',
      'bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500',
      'shadow-lg shadow-primary/30',
    )}>
      <SparkleIcon className={cn(icon, 'text-white')} />
    </div>
  )
}

// ─── Tool call chip ───────────────────────────────────────────────────────────

function ToolChip({ tool }: { tool: ToolCallState }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all duration-300',
      tool.status === 'running'
        ? 'bg-surface-overlay border-border text-muted-fg'
        : 'bg-success/10 border-success/20 text-success-fg',
    )}>
      {tool.status === 'running' ? (
        <span className="h-2.5 w-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        <span className="text-success-fg"><CheckIcon /></span>
      )}
      {tool.label}
    </span>
  )
}

// ─── Content renderer (bold + code + line breaks) ─────────────────────────────

function RichText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
        return (
          <span key={li}>
            {parts.map((part, pi) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pi} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
              }
              if (part.startsWith('`') && part.endsWith('`')) {
                return (
                  <code key={pi} className="font-mono text-xs bg-surface-overlay px-1.5 py-0.5 rounded-md">
                    {part.slice(1, -1)}
                  </code>
                )
              }
              return <span key={pi}>{part}</span>
            })}
            {li < lines.length - 1 && <br />}
          </span>
        )
      })}
    </>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-white shadow-sm shadow-primary/20">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <AIAvatar size="sm" />
      <div className="flex-1 min-w-0">
        {/* Tool call chips */}
        {message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {message.toolCalls.map(tc => (
              <ToolChip key={tc.id} tool={tc} />
            ))}
          </div>
        )}

        {/* Text content */}
        {message.content && (
          <div className="text-sm text-foreground leading-relaxed">
            <RichText text={message.content} />
            {message.streaming && (
              <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-pulse align-middle" />
            )}
          </div>
        )}

        {/* Waiting for text (tools done, stream not started) */}
        {!message.content && message.toolCalls.every(tc => tc.status === 'done') && (
          <div className="flex items-center gap-1 mt-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-muted-fg animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const PROMPTS = [
  { icon: '💳', label: 'Account balances', query: "What are my current account balances?" },
  { icon: '📊', label: 'Last 30 days summary', query: "Give me a summary of my payments this month" },
  { icon: '👥', label: 'Top recipients', query: "Who are my most frequent recipients?" },
  { icon: '❌', label: 'Failed payments', query: "Show me any failed payments recently" },
  { icon: '⏳', label: 'Pending approvals', query: "Any payments pending approval?" },
  { icon: '💱', label: 'Exchange rates', query: "What are the current FX rates?" },
]

function EmptyState({ onPrompt }: { onPrompt: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
      {/* Glow ring + avatar */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 via-violet-500/20 to-fuchsia-500/20 blur-xl scale-150" />
        <AIAvatar size="lg" />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">Ask me anything</h2>
      <p className="text-sm text-muted-fg max-w-sm mb-8">
        I have access to your payments, accounts, recipients, and exchange rates. Ask in plain English.
      </p>

      {/* Prompt grid */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-md">
        {PROMPTS.map(p => (
          <button
            key={p.query}
            onClick={() => onPrompt(p.query)}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-sm text-foreground transition-all hover:border-primary/40 hover:bg-surface-overlay hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="text-base shrink-0">{p.icon}</span>
            <span className="font-medium text-xs leading-tight">{p.label}</span>
          </button>
        ))}
      </div>

      <p className="mt-10 text-[11px] text-muted-fg/60 flex items-center gap-1.5">
        <SparkleIcon className="h-3 w-3" />
        Answers are based on your account data only
      </p>
    </div>
  )
}

// ─── Input bar ────────────────────────────────────────────────────────────────

interface InputBarProps {
  onSend: (text: string) => void
  onStop: () => void
  isLoading: boolean
}

function InputBar({ onSend, onStop, isLoading }: InputBarProps) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [value, isLoading, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const canSend = value.trim().length > 0 && !isLoading

  return (
    <div className={cn(
      'rounded-2xl border bg-surface transition-all duration-200',
      focused
        ? 'border-primary/40 shadow-lg shadow-primary/8 ring-4 ring-primary/8'
        : 'border-border shadow-md shadow-black/5',
    )}>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Ask anything about your finances…"
        rows={1}
        className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm text-foreground placeholder:text-muted-fg focus:outline-none leading-relaxed"
        style={{ maxHeight: 200 }}
      />

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <span className={cn(
          'text-[11px] select-none transition-colors',
          isLoading ? 'text-primary animate-pulse' : 'text-muted-fg/50',
        )}>
          {isLoading ? 'Generating…' : 'Shift ↵ new line'}
        </span>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <button
              onClick={onStop}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-border bg-surface-overlay px-3 text-xs font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface"
              aria-label="Stop generating"
            >
              <StopIcon />
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150',
                canSend
                  ? 'btn-gradient text-white shadow-sm shadow-primary/30 hover:opacity-90 hover:scale-105 active:scale-95'
                  : 'bg-surface-overlay text-muted-fg cursor-not-allowed opacity-50',
              )}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AIAssistant() {
  const { messages, isLoading, sendMessage, stopStreaming, clearChat } = useAIAssistant()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handlePrompt = useCallback((query: string) => {
    sendMessage(query)
  }, [sendMessage])

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <AIAvatar size="md" />
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">AI Assistant</h1>
            <p className="text-xs text-muted-fg">Your financial AI assistant</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <PlusIcon />
            New chat
          </button>
        )}
      </div>

      {/* ── Messages area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto -mx-4 md:-mx-6 lg:-mx-8"
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          {messages.length === 0 ? (
            <EmptyState onPrompt={handlePrompt} />
          ) : (
            <div className="flex flex-col gap-6 py-6">
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-border shrink-0 -mx-4 md:-mx-6 lg:-mx-8" />

      {/* ── Input ── */}
      <div className="shrink-0 pt-4 max-w-3xl mx-auto w-full">
        <InputBar onSend={sendMessage} onStop={stopStreaming} isLoading={isLoading} />
      </div>
    </div>
  )
}
