export const dynamic = 'force-dynamic'

import { DashboardIntelligence } from './components/dashboard-intelligence'

export default async function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="font-display text-lg font-semibold text-ink">
          Intelligence Overview
        </h1>
        <p className="mt-1 text-sm text-muted">
          Real-time synthesis of signals, themes, and input streams.
        </p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <DashboardIntelligence />
      </div>
    </div>
  )
}
