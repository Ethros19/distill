import { Suspense } from 'react'
import Image from 'next/image'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { inArray } from 'drizzle-orm'
import { LogoutButton } from './components/logout-button'
import { HelpButton } from './components/help-modal'
import { ThemeSwitcher } from './components/theme-switcher'
import { SettingsDropdown } from './components/settings-dropdown'
import { TextSizeControl } from './components/text-size-control'
import { SignalStats } from './components/signal-stats'
import NavLink from './components/NavLink'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const brandingRows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, ['company_name', 'company_logo_url']))
  const branding = Object.fromEntries(brandingRows.map((r) => [r.key, r.value]))
  const companyName = branding.company_name || ''
  const companyLogoUrl = branding.company_logo_url || ''
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-edge-dim bg-canvas/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            {companyLogoUrl && (
              <Image
                src={companyLogoUrl}
                alt={companyName || 'Company logo'}
                width={28}
                height={28}
                className="rounded-md"
              />
            )}
            <h1 className="font-display text-2xl tracking-tight text-ink">
              {companyName || 'Distill'}
            </h1>
            <span className="hidden text-sm text-muted sm:inline">
              {companyName ? 'Signal Intelligence' : 'Signal Intelligence'}
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard" exact>
              Dashboard
            </NavLink>
            <NavLink href="/dashboard/signals">
              Signals
            </NavLink>
            <NavLink href="/dashboard/radar">
              Radar
            </NavLink>
            <NavLink href="/dashboard/streams">
              Streams
            </NavLink>
            <span className="mx-1 hidden h-4 w-px bg-edge-dim sm:inline-block" aria-hidden="true" />
            <span className="hidden text-[10px] uppercase tracking-wider text-muted sm:inline">Data</span>
            <NavLink href="/dashboard/inputs">
              Inputs
            </NavLink>
            <NavLink href="/dashboard/sources">
              Sources
            </NavLink>
          </nav>
          <div className="flex items-center gap-1">
            <TextSizeControl />
            <HelpButton />
            <ThemeSwitcher />
            <SettingsDropdown />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {children}
      </main>
      <footer className="sticky bottom-0 border-t border-edge-dim bg-panel/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <Suspense>
            <SignalStats />
          </Suspense>
        </div>
      </footer>
    </div>
  )
}
