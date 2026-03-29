'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavLink({
  href,
  exact = false,
  children,
}: {
  href: string
  exact?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={`rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-panel-alt hover:text-ink ${
        isActive ? 'text-ink' : 'text-dim'
      }`}
    >
      {children}
    </Link>
  )
}
