import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { ChatClient } from './components/chat-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Chat — Distill',
}

export default async function ChatPage() {
  const [row] = await db.select().from(settings).where(eq(settings.key, 'company_name'))
  const companyName = row?.value?.trim() || ''

  return (
    <div className="flex flex-col gap-4">
      <div className="animate-fade-up">
        <h1 className="font-display text-lg font-semibold text-ink">Chat</h1>
        <p className="mt-1 text-sm text-muted">
          Ask about your industry intelligence and internal signals.
        </p>
      </div>
      <ChatClient companyName={companyName} />
    </div>
  )
}
