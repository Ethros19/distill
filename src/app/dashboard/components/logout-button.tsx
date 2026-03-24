'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-md px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      Logout
    </button>
  )
}
