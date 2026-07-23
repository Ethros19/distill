import { ChatClient } from './components/chat-client'

export const metadata = {
  title: 'Chat — Distill',
}

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-display text-lg font-semibold text-ink">Chat</h1>
        <p className="mt-1 text-sm text-muted">
          Ask questions about your signals, synthesis, and intelligence.
        </p>
      </div>
      <ChatClient />
    </div>
  )
}
