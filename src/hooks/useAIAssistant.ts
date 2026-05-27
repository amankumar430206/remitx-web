import { useState, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolCallState {
  id: string
  name: string
  label: string
  status: 'running' | 'done'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls: ToolCallState[]
  timestamp: Date
  streaming: boolean
  error?: boolean
}

// ─── Tool metadata ────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  get_accounts:         'Fetching account balances',
  search_payments:      'Searching your payments',
  get_spending_summary: 'Calculating spending summary',
  list_beneficiaries:   'Looking up your recipients',
  get_fx_rates:         'Fetching exchange rates',
}

// ─── Mock scenarios ───────────────────────────────────────────────────────────

interface Scenario {
  tools: string[]
  response: string
}

function getScenario(query: string): Scenario {
  const q = query.toLowerCase()

  if (q.includes('balance') || (q.includes('account') && !q.includes('payment'))) {
    return {
      tools: ['get_accounts'],
      response: `Here are your current account balances:\n\n**USD Account** — $12,450.00\n**GBP Account** — £8,230.50\n**EUR Account** — €5,100.00\n\nYour total portfolio is approximately **$27,400 USD** at today's rates.`,
    }
  }

  if (q.includes('fail')) {
    return {
      tools: ['search_payments'],
      response: `I found **3 failed payments** in the last 30 days:\n\n• **$500 to Ahmed Al-Rashid** — May 2nd (insufficient funds)\n• **£1,200 to Priya Sharma** — May 8th (invalid account number)\n• **€800 to Carlos Rodriguez** — May 10th (compliance hold)\n\nWould you like me to help you retry any of these?`,
    }
  }

  if (q.includes('pending') || q.includes('approval')) {
    return {
      tools: ['search_payments'],
      response: `You have **2 payments awaiting approval**:\n\n• **$3,200 to Ahmed Al-Rashid** — submitted May 11, awaiting checker sign-off\n• **£850 to Priya Sharma** — submitted May 12, awaiting checker sign-off\n\nApprovals typically complete within 1–2 business hours during working hours.`,
    }
  }

  if (q.includes('recipient') || q.includes('beneficiar') || q.includes('frequent') || q.includes('top')) {
    return {
      tools: ['list_beneficiaries', 'get_spending_summary'],
      response: `Your **top 3 recipients** by total volume this year:\n\n1. **Ahmed Al-Rashid** (UAE) — $24,500 across 8 transfers\n2. **Priya Sharma** (India) — ₹18,50,000 (~$22,200) across 12 transfers\n3. **Carlos Rodriguez** (Mexico) — $18,900 across 5 transfers\n\nThese three account for **67%** of your total outbound volume.`,
    }
  }

  if (q.includes('rate') || q.includes('fx') || q.includes('exchange')) {
    return {
      tools: ['get_fx_rates'],
      response: `Current mid-market rates (vs USD):\n\n• **USD → INR** — 83.42\n• **USD → AED** — 3.6725\n• **USD → MXN** — 17.14\n• **USD → GBP** — 0.7891\n• **USD → EUR** — 0.9234\n\nRates refresh every 30 seconds. RemitX applies a small spread when processing transfers.`,
    }
  }

  if (q.includes('fee') || q.includes('cost') || q.includes('charge')) {
    return {
      tools: ['get_spending_summary'],
      response: `Fee summary for the **last 30 days**:\n\n• **Total fees paid** — $147.50\n• **Average per payment** — $6.25\n• **Effective rate** — 0.31% of transfer volume\n\nYour highest single fee was $18.00 on a large USD→INR transfer on May 3rd.`,
    }
  }

  return {
    tools: ['get_spending_summary', 'search_payments'],
    response: `Here's your payment activity for the **last 30 days**:\n\n• **Total sent** — $47,230 across 23 payments\n• **Completed** — 20 payments ($44,100)\n• **Pending approval** — 2 payments ($3,130)\n• **Failed** — 1 payment (since retried successfully)\n\nYour most active corridors are **USD→INR** and **USD→AED**. Busiest day: May 8th with 4 transfers.\n\nWhat else would you like to know?`,
  }
}

// ─── Mock streaming runner ────────────────────────────────────────────────────

function runMock(
  query: string,
  onStart:    (msg: ChatMessage) => void,
  onToolDone: (idx: number) => void,
  onDelta:    (char: string) => void,
  onDone:     () => void,
): () => void {
  const timers: ReturnType<typeof setTimeout>[] = []
  let interval: ReturnType<typeof setInterval> | null = null

  const { tools, response } = getScenario(query)

  const shell: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: '',
    toolCalls: tools.map((name, i) => ({
      id: `tc-${i}`,
      name,
      label: TOOL_LABELS[name] ?? name,
      status: 'running',
    })),
    timestamp: new Date(),
    streaming: true,
  }

  // Emit assistant shell after short delay
  timers.push(setTimeout(() => onStart(shell), 280))

  // Resolve each tool sequentially
  tools.forEach((_, i) => {
    timers.push(setTimeout(() => onToolDone(i), 280 + 520 * (i + 1)))
  })

  // Stream text after all tools resolve
  const textDelay = 280 + 520 * tools.length + 280
  timers.push(setTimeout(() => {
    let idx = 0
    interval = setInterval(() => {
      if (idx < response.length) {
        onDelta(response[idx++])
      } else {
        if (interval) clearInterval(interval)
        onDone()
      }
    }, 11)
  }, textDelay))

  return () => {
    timers.forEach(clearTimeout)
    if (interval) clearInterval(interval)
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const patchLast = useCallback((updater: (m: ChatMessage) => ChatMessage) => {
    setMessages(prev => {
      const next = [...prev]
      const idx = next.findLastIndex(m => m.role === 'assistant')
      if (idx < 0) return prev
      next[idx] = updater(next[idx])
      return next
    })
  }, [])

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      toolCalls: [],
      timestamp: new Date(),
      streaming: false,
    }])
    setIsLoading(true)

    const stop = runMock(
      trimmed,
      msg  => setMessages(prev => [...prev, msg]),
      idx  => patchLast(m => ({
        ...m,
        toolCalls: m.toolCalls.map((tc, i) => i === idx ? { ...tc, status: 'done' as const } : tc),
      })),
      char => patchLast(m => ({ ...m, content: m.content + char })),
      ()   => {
        patchLast(m => ({ ...m, streaming: false }))
        setIsLoading(false)
      },
    )
    cleanupRef.current = stop
  }, [isLoading, patchLast])

  const stopStreaming = useCallback(() => {
    cleanupRef.current?.()
    patchLast(m => ({ ...m, streaming: false }))
    setIsLoading(false)
  }, [patchLast])

  const clearChat = useCallback(() => {
    cleanupRef.current?.()
    setMessages([])
    setIsLoading(false)
  }, [])

  return { messages, isLoading, sendMessage, stopStreaming, clearChat }
}
