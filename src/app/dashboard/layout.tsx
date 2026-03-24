import { LogoutButton } from './components/logout-button'
import { ThemeSidebar } from './components/theme-sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-bold">Distill</h1>
        <LogoutButton />
      </header>
      <main className="p-6">
        <div className="flex gap-6">
          <div className="flex-1">{children}</div>
          <ThemeSidebar />
        </div>
      </main>
    </div>
  )
}
