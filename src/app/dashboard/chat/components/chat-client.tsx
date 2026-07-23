'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  tools?: string[]
  streaming?: boolean
  interrupted?: boolean
}

const TOOL_LABELS: Record<string, string> = {
  get_intelligence_briefing: 'Reading the intelligence briefing',
  get_synthesis_summary: 'Reading the latest synthesis',
  get_signals: 'Pulling signals',
  get_signal_detail: 'Opening a signal',
  get_themes: 'Aggregating themes',
  search_inputs: 'Searching raw inputs',
}

const PROSE_CLASS =
  'prose max-w-none text-sm leading-relaxed text-dim prose-headings:text-ink prose-strong:text-ink prose-blockquote:border-l-accent prose-blockquote:text-dim prose-code:rounded prose-code:bg-panel-alt prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:text-accent prose-a:text-accent prose-p:my-2 prose-li:my-0.5 prose-ul:my-2'

function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string
  return DOMPurify.sanitize(html, { ADD_ATTR: ['class'] })
}

function suggestionGroups(companyName?: string) {
  const positioning = companyName ? `${companyName}'s positioning` : 'our positioning'
  return [
    {
      label: 'Industry intelligence',
      icon: 'globe' as const,
      items: [
        'Give me the latest intelligence briefing on industry trends.',
        `How do current market shifts affect ${positioning}?`,
      ],
    },
    {
      label: 'Internal signals',
      icon: 'layers' as const,
      items: [
        'What are the strongest internal product signals right now?',
        'What feedback is behind our top signal?',
      ],
    },
  ]
}

function GroupIcon({ name }: { name: 'globe' | 'layers' }) {
  if (name === 'globe') {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M1.75 8h12.5M8 1.75c1.8 1.7 2.8 3.9 2.8 6.25S9.8 12.55 8 14.25C6.2 12.55 5.2 10.35 5.2 8S6.2 3.45 8 1.75Z"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2 1.75 5 8 8l6.25-3L8 2ZM2 8l6 3 6-3M2 11l6 3 6-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChatClient({ companyName }: { companyName?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottom = useRef(true)

  // Only the message list scrolls (never the page), and only when the user is
  // already near the bottom — so streaming text doesn't yank the view around.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  useEffect(resizeTextarea, [input])

  const updateLastAssistant = useCallback((updater: (msg: ChatMessage) => ChatMessage) => {
    setMessages((prev) => {
      const copy = [...prev]
      const last = copy[copy.length - 1]
      if (last?.role === 'assistant') copy[copy.length - 1] = updater(last)
      return copy
    })
  }, [])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || streaming) return

      setError(null)
      setInput('')
      stickToBottom.current = true

      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const apiMessages = [...history, { role: 'user', content: trimmed }]

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '', tools: [], streaming: true },
      ])
      setStreaming(true)

      let receivedText = false
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
        })

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}))
          setError((data as { error?: string }).error ?? 'Request failed. Please try again.')
          setMessages((prev) => prev.slice(0, -1))
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
              receivedText = true
              updateLastAssistant((m) => ({ ...m, content: m.content + event.value }))
            } else if (event.type === 'tool' && event.name) {
              updateLastAssistant((m) => ({ ...m, tools: [...(m.tools ?? []), event.name!] }))
            } else if (event.type === 'error') {
              setError(event.message ?? 'Something went wrong.')
            }
          }
        }
      } catch {
        // Keep any partial answer and flag it; only hard-fail if nothing streamed.
        if (receivedText) {
          updateLastAssistant((m) => ({ ...m, interrupted: true }))
        } else {
          setError('Connection lost. Please try again.')
          setMessages((prev) => prev.slice(0, -1))
        }
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
  const groups = suggestionGroups(companyName)

  return (
    <div className="flex h-[calc(100dvh-17rem)] min-h-[460px] flex-col">
      <div className="card-elevated flex flex-1 flex-col overflow-hidden rounded-xl border border-edge bg-panel">
        {/* Conversation — the only region that scrolls */}
        <div ref={scrollRef} onScroll={handleScroll} className="intel-scroll flex-1 overflow-y-auto">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent-wash">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3v18M16 6H9.75a3.25 3.25 0 0 0 0 6.5h4.5a3.25 3.25 0 0 1 0 6.5H7"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="mt-5 text-center font-display text-2xl text-ink">
                What can I surface for you?
              </h2>
              <p className="mt-1.5 max-w-md text-center text-sm text-dim">
                Ask across {companyName ? `${companyName}'s` : 'your'} distilled industry
                intelligence and internal product signals — answers stay grounded in your data.
              </p>

              <div className="mt-8 grid w-full max-w-2xl gap-5 sm:grid-cols-2">
                {groups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <div className="flex items-center gap-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      <GroupIcon name={group.icon} />
                      {group.label}
                    </div>
                    {group.items.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="block w-full rounded-lg border border-edge bg-canvas px-3.5 py-2.5 text-left text-sm text-dim transition-all hover:border-accent/40 hover:bg-accent-wash hover:text-ink"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 px-4 py-6 sm:px-6">
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-accent/10 bg-accent-wash px-4 py-2.5 text-sm text-ink">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink text-canvas ring-1 ring-black/5">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M12 3v18M16 6H9.75a3.25 3.25 0 0 0 0 6.5h4.5a3.25 3.25 0 0 1 0 6.5H7"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {m.tools && m.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.tools.map((tool, ti) => (
                            <span
                              key={ti}
                              className="inline-flex items-center gap-1.5 rounded-full border border-edge-dim bg-panel-alt px-2.5 py-0.5 text-[11px] text-muted"
                            >
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path
                                  d="M3 8.5 6.5 12 13 4.5"
                                  stroke="var(--signal-low)"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              {TOOL_LABELS[tool] ?? tool}
                            </span>
                          ))}
                        </div>
                      )}
                      {m.content ? (
                        <>
                          <div
                            className={PROSE_CLASS}
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(
                                m.streaming ? `${m.content} <span class="stream-cursor"></span>` : m.content,
                              ),
                            }}
                          />
                          {m.interrupted && (
                            <p className="text-xs text-muted">
                              Response interrupted &mdash; press Send to continue.
                            </p>
                          )}
                        </>
                      ) : (
                        m.streaming && (
                          <div className="flex items-center gap-2 py-1 text-sm text-muted">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                            Thinking&hellip;
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ),
              )}
              {error && (
                <div className="rounded-lg border border-sig-high/30 bg-sig-high/5 px-4 py-2.5 text-sm text-sig-high">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer — pinned to the bottom of the panel */}
        <form onSubmit={handleSubmit} className="border-t border-edge bg-panel p-3">
          <div className="rounded-xl border border-edge bg-canvas transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={`Ask about ${companyName ? `${companyName}'s ` : ''}industry trends or internal signals…`}
              className="block max-h-40 w-full resize-none bg-transparent px-3.5 py-3 text-sm text-ink placeholder:text-muted focus:outline-none"
            />
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="text-[11px] text-muted">Enter to send &middot; Shift+Enter for a new line</span>
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="rounded-lg bg-ink px-4 py-1.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {streaming ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
