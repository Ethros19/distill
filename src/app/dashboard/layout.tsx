import { Suspense } from 'react'
import Link from 'next/link'
import { LogoutButton } from './components/logout-button'
import { HelpButton } from './components/help-modal'
import { ThemeSwitcher } from './components/theme-switcher'
// ThemeSidebar removed — Theme Landscape serves this purpose
import { SignalStats } from './components/signal-stats'
import NavLink from './components/NavLink'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-edge-dim">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-2xl tracking-tight text-ink">
              Distill
            </h1>
            <span className="hidden text-sm text-muted sm:inline">
              Signal Intelligence
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard" exact>
              Signals
            </NavLink>
            <NavLink href="/dashboard/inputs">
              Inputs
            </NavLink>
            <NavLink href="/dashboard/radar">
              Radar
            </NavLink>
            <NavLink href="/dashboard/streams">
              Streams
            </NavLink>
            <NavLink href="/dashboard/sources">
              Sources
            </NavLink>
          </nav>
          <div className="flex items-center gap-1">
            <HelpButton />
            <ThemeSwitcher />
            <Link
              href="/dashboard/settings"
              className="rounded-lg px-2 py-1.5 text-sm text-dim transition-colors hover:bg-panel-alt hover:text-ink"
              aria-label="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline-block" aria-hidden="true">
                <path d="M6.5 1.5h3l.5 2 1.5.9 2-.5 1.5 2.6-1.5 1.5v1.5l1.5 1.5-1.5 2.6-2-.5-1.5.9-.5 2h-3l-.5-2-1.5-.9-2 .5L1 11l1.5-1.5V8L1 6.5l1.5-2.6 2 .5L6 3.5l.5-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="8" cy="8.25" r="2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </Link>
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
