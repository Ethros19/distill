'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  tools?: string[]
  streaming?: boolean
}

const TOOL_LABELS: Record<string, string> = {
  get_synthesis_summary: 'Reading the latest synthesis',
  get_signals: 'Pulling signals',
  get_signal_detail: 'Opening a signal',
  get_themes: 'Aggregating themes',
  search_inputs: 'Searching raw inputs',
}

const SUGGESTIONS = [
  'What are the strongest signals right now?',
  'Summarize the latest synthesis.',
  'Which themes are trending?',
  'What feedback is behind our top signal?',
]

function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string
  return DOMPurify.sanitize(html)
}

const PROSE_CLASS =
  'prose max-w-none text-sm leading-relaxed text-dim prose-headings:text-ink prose-strong:text-ink prose-blockquote:border-l-accent prose-blockquote:text-dim prose-code:rounded prose-code:bg-panel-alt prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:text-accent prose-a:text-accent prose-p:my-2 prose-li:my-0.5 prose-ul:my-2'

export function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const updateLastAssistant = useCallback(
    (updater: (msg: ChatMessage) => ChatMessage) => {
      setMessages((prev) => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = updater(last)
        }
        return copy
      })
    },
    [],
  )

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || streaming) return

      setError(null)
      setInput('')

      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const apiMessages = [...history, { role: 'user', content: trimmed }]

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '', tools: [], streaming: true },
      ])
      setStreaming(true)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
        })

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}))
          const message = (data as { error?: string }).error ?? 'Request failed. Please try again.'
          setError(message)
          setMessages((prev) => prev.slice(0, -1)) // drop the empty assistant placeholder
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.trim()) continue
            let event: { type: string; value?: string; name?: string; message?: string }
            try {
              event = JSON.parse(line)
            } catch {
              continue
            }

            if (event.type === 'text' && event.value) {
              updateLastAssistant((m) => ({ ...m, content: m.content + event.value }))
            } else if (event.type === 'tool' && event.name) {
              updateLastAssistant((m) => ({ ...m, tools: [...(m.tools ?? []), event.name!] }))
            } else if (event.type === 'error') {
              setError(event.message ?? 'Something went wrong.')
            }
          }
        }
      } catch {
        setError('Connection lost. Please try again.')
      } finally {
        setStreaming(false)
        updateLastAssistant((m) => ({ ...m, streaming: false }))
      }
    },
    [messages, streaming, updateLastAssistant],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const empty = messages.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="min-h-[50vh] space-y-5">
        {empty ? (
          <div className="animate-fade-up rounded-xl border border-edge bg-panel p-6">
            <h2 className="font-display text-lg italic text-ink">Ask about your signals</h2>
            <p className="mt-1 text-sm text-dim">
              Chat with your synthesized signals, themes, and the raw feedback behind them. Answers
              are grounded in your Distill data.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-edge bg-canvas px-3 py-1.5 text-sm text-dim transition-colors hover:border-accent hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-xl bg-accent-wash px-4 py-2.5 text-sm text-ink">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[92%] space-y-2">
                  {m.tools && m.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.tools.map((tool, ti) => (
                        <span
                          key={ti}
                          className="inline-flex items-center gap-1.5 rounded-full border border-edge-dim bg-panel-alt px-2.5 py-0.5 text-xs text-muted"
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path
                              d="M8 1.5v13M1.5 8h13"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                          {TOOL_LABELS[tool] ?? tool}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.content ? (
                    <div
                      className={PROSE_CLASS}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                    />
                  ) : (
                    m.streaming && (
                      <div className="flex items-center gap-1.5 py-1 text-sm text-muted">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                        Thinking&hellip;
                      </div>
                    )
                  )}
                </div>
              </div>
            ),
          )
        )}
        {error && (
          <div className="rounded-lg border border-sig-high/30 bg-sig-high/5 px-4 py-2.5 text-sm text-sig-high">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-4 rounded-xl border border-edge bg-panel p-2 shadow-lg"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Ask about your signals, themes, or the feedback behind them&hellip;"
          className="block w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none"
        />
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted">Enter to send &middot; Shift+Enter for a new line</span>
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="rounded-lg bg-ink px-4 py-1.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {streaming ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
