import { LogoutButton } from './components/logout-button'
import { ThemeSidebar } from './components/theme-sidebar'
import { SignalStats } from './components/signal-stats'

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
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">{children}</div>
          <ThemeSidebar />
        </div>
      </main>
      <footer className="sticky bottom-0 border-t border-edge-dim bg-panel/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <SignalStats />
        </div>
      </footer>
    </div>
  )
}
