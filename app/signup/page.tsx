'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthLayout from '@/app/components/AuthLayout'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle=""
        footer={
          <>
            Already confirmed?{' '}
            <Link href="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </>
        }
      >
        <p className="text-sm text-foreground">
          We sent a confirmation link to <strong>{email}</strong>. Click it to finish
          setting up your account.
        </p>
        <p className="mt-3 text-sm text-muted">
          Don&apos;t see it? Check your spam folder, or make sure the email address is
          correct.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start generating tailored win-strategy reports."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}

        <input
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted"
        />

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
          minLength={6}
          className="w-full rounded border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-accent px-3 py-2 text-white hover:bg-accent-hover"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
    </AuthLayout>
  )
}