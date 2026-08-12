'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <header className="border-b border-border bg-surface px-6 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <Link href="/dashboard" className="font-semibold text-foreground">
          Govlytics
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-muted hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/pricing" className="text-muted hover:text-foreground">
            Pricing
          </Link>
          <Link href="/settings" className="text-muted hover:text-foreground">
            Firm profile
          </Link>
          <button
            onClick={handleLogout}
            className="rounded border border-border px-3 py-1.5 text-foreground hover:bg-background"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  )
}