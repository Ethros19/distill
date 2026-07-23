import Anthropic from '@anthropic-ai/sdk'
import { NextResponse, type NextRequest } from 'next/server'
import { chatTools, executeChatTool, buildSignalContext } from '@/lib/chat/tools'
import { getChatClient, buildSystemPrompt, ChatUnavailableError } from '@/lib/chat/anthropic-chat'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_MESSAGES = 50
const MAX_CONTENT_CHARS = 8000
const MAX_TURNS = 6 // agentic tool-use round trips per request

interface ClientMessage {
  role: 'user' | 'assistant'
  content: string
}

function parseMessages(body: unknown): ClientMessage[] | { error: string } {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { messages?: unknown }).messages)) {
    return { error: 'Request body must include a "messages" array.' }
  }
  const raw = (body as { messages: unknown[] }).messages
  if (raw.length === 0) return { error: 'At least one message is required.' }
  if (raw.length > MAX_MESSAGES) return { error: `Too many messages (max ${MAX_MESSAGES}).` }

  const messages: ClientMessage[] = []
  for (const m of raw) {
    if (!m || typeof m !== 'object') return { error: 'Each message must be an object.' }
    const { role, content } = m as { role?: unknown; content?: unknown }
    if (role !== 'user' && role !== 'assistant') {
      return { error: 'Each message role must be "user" or "assistant".' }
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
      return { error: 'Each message must have non-empty string content.' }
    }
    if (content.length > MAX_CONTENT_CHARS) {
      return { error: `Message too long (max ${MAX_CONTENT_CHARS} characters).` }
    }
    messages.push({ role, content })
  }

  if (messages[messages.length - 1].role !== 'user') {
    return { error: 'The last message must be from the user.' }
  }
  return messages
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = parseMessages(body)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  // Resolve config + seed context up front so setup errors are clean HTTP responses
  // (before we commit to a streaming response).
  let client: Anthropic
  let model: string
  let system: string
  try {
    const resolved = await getChatClient()
    client = resolved.client
    model = resolved.model
    const signalContext = await buildSignalContext()
    system = buildSystemPrompt(signalContext)
  } catch (error) {
    if (error instanceof ChatUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Chat setup failed:', error)
    return NextResponse.json({ error: 'Failed to initialize chat.' }, { status: 500 })
  }

  const anthropicTools: Anthropic.Tool[] = chatTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
  }))

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      try {
        const convo: Anthropic.MessageParam[] = parsed.map((m) => ({
          role: m.role,
          content: m.content,
        }))

        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const messageStream = client.messages.stream({
            model,
            max_tokens: 2048,
            system,
            messages: convo,
            tools: anthropicTools,
          })

          messageStream.on('text', (delta) => send({ type: 'text', value: delta }))

          const final = await messageStream.finalMessage()

          if (final.stop_reason === 'tool_use') {
            const toolUses = final.content.filter(
              (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
            )
            convo.push({ role: 'assistant', content: final.content })

            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const toolUse of toolUses) {
              send({ type: 'tool', name: toolUse.name })
              const result = await executeChatTool(toolUse.name, toolUse.input)
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: result,
              })
            }
            convo.push({ role: 'user', content: toolResults })
            continue
          }

          break
        }

        send({ type: 'done' })
      } catch (error) {
        console.error('Chat stream error:', error)
        let message = 'Something went wrong generating a response.'
        if (error instanceof Anthropic.RateLimitError) {
          message = 'Rate limited by the AI provider. Try again shortly.'
        } else if (error instanceof Anthropic.APIError && error.status === 529) {
          message = 'The AI provider is temporarily overloaded. Try again in a minute.'
        } else if (error instanceof Error) {
          message = error.message
        }
        send({ type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
