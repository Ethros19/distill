import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { ProductContextEditor } from './product-context-editor'
import Link from 'next/link'

export default async function SettingsPage() {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'product_context'))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Settings</h2>
        <Link
          href="/dashboard"
          className="text-xs font-medium text-accent transition-colors hover:text-ink"
        >
          &larr; Back to dashboard
        </Link>
      </div>

      <div className="rounded-xl border border-edge bg-panel p-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-dim">
          Product Context
        </h3>
        <p className="mt-1 text-xs text-muted">
          Describe your product&apos;s current features so synthesis can distinguish between
          what&apos;s already built and what&apos;s genuinely missing. Use plain text or markdown.
        </p>
        <div className="mt-4">
          <ProductContextEditor initialValue={row?.value ?? ''} />
        </div>
      </div>
    </div>
  )
}
