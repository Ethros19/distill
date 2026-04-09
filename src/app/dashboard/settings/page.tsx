export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq, inArray } from 'drizzle-orm'
import { getStreams } from '@/lib/stream-config'
import { ProductContextEditor } from './product-context-editor'
import { StreamEditor } from './stream-editor'
import { BrandingEditor } from './branding-editor'
import Link from 'next/link'

export default async function SettingsPage() {
  const [brandingRows, [row], streams] = await Promise.all([
    db.select().from(settings).where(inArray(settings.key, ['company_name', 'company_logo_url'])),
    db.select().from(settings).where(eq(settings.key, 'product_context')),
    getStreams(),
  ])
  const brandingMap = Object.fromEntries(brandingRows.map((r) => [r.key, r.value]))

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
          Branding
        </h3>
        <p className="mt-1 text-xs text-muted">
          Set your company name and logo. This replaces the default Distill branding in the header.
        </p>
        <div className="mt-4">
          <BrandingEditor
            initialName={brandingMap.company_name ?? ''}
            initialLogoUrl={brandingMap.company_logo_url ?? ''}
          />
        </div>
      </div>

      <div className="rounded-xl border border-edge bg-panel p-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-dim">
          Intelligence Streams
        </h3>
        <p className="mt-1 text-xs text-muted">
          Define your domain streams. Each stream represents a category of intelligence
          that Distill tracks and synthesizes. The AI uses stream descriptions to classify incoming content.
        </p>
        <div className="mt-4">
          <StreamEditor initialStreams={streams} />
        </div>
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
