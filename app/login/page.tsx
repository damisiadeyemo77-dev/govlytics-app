'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'
import AuthLayout from '@/app/components/AuthLayout'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!captchaToken) {
      setError('Please complete the verification check.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    })

    // Turnstile tokens are single-use, so get a fresh one for any retry.
    turnstileRef.current?.reset()
    setCaptchaToken(null)
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back — pick up where you left off."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted"
        />

        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
          onError={() => setCaptchaToken(null)}
          options={{ theme: 'dark', size: 'flexible' }}
        />

        <button
          type="submit"
          disabled={loading || !captchaToken}
          className="w-full rounded bg-accent px-3 py-2 text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}