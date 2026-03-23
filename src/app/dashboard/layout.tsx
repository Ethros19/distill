'use client'

import { useRouter } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-bold">Distill</h1>
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Logout
        </button>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
