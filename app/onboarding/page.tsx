'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveFirmProfile } from '@/app/actions/firmProfile'

const CERTIFICATION_OPTIONS = [
  { value: '8(a)', label: '8(a)' },
  { value: 'WOSB', label: 'WOSB' },
  { value: 'EDWOSB', label: 'EDWOSB' },
  { value: 'SDVOSB', label: 'SDVOSB' },
  { value: 'HUBZone', label: 'HUBZone' },
]

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    setLoading(true)

    const result = await saveFirmProfile(formData)

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12">
      <form action={handleSubmit} className="w-full max-w-lg space-y-4 px-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tell us about your firm</h1>
          <p className="mt-1 text-sm text-muted">
            This helps us tailor win-strategy reports to your business. You can update this anytime.
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div>
          <label className="mb-1 block text-sm text-muted">Company name</label>
          <input
            type="text"
            name="company_name"
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">Certifications</label>
          <div className="flex flex-wrap gap-3">
            {CERTIFICATION_OPTIONS.map((cert) => (
              <label key={cert.value} className="flex items-center gap-1.5 text-sm text-foreground">
                <input type="checkbox" name="certifications" value={cert.value} />
                {cert.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">NAICS codes</label>
          <input
            type="text"
            name="naics_codes"
            placeholder="e.g. 541511, 541512, 236220"
            className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
          />
          <p className="mt-1 text-xs text-muted">Separate multiple codes with commas.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">Core capabilities</label>
          <textarea
            name="capabilities"
            rows={3}
            placeholder="What does your firm do? e.g. IT modernization, construction, professional services..."
            className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-muted">Years in business</label>
            <input
              type="number"
              name="years_in_business"
              min={0}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Team size</label>
            <input
              type="number"
              name="team_size"
              min={1}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">Past performance highlights (optional)</label>
          <textarea
            name="past_performance"
            rows={3}
            placeholder="Brief notes on relevant past contracts or work, e.g. agency, contract type, outcome..."
            className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-accent px-3 py-2 text-white hover:bg-accent-hover"
        >
          {loading ? 'Saving...' : 'Continue to dashboard'}
        </button>
      </form>
    </div>
  )
}