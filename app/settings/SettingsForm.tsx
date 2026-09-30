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

const DESCRIPTION_MAX = 2000

type FirmProfile = {
  company_name: string | null
  firm_description: string | null
  uei: string | null
  cage_code: string | null
  certifications: string[] | null
  naics_codes: string[] | null
  capabilities: string | null
  years_in_business: number | null
  team_size: number | null
  past_performance: string | null
} | null

export default function SettingsForm({ firmProfile }: { firmProfile: FirmProfile }) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [descriptionLength, setDescriptionLength] = useState(
    firmProfile?.firm_description?.length ?? 0
  )
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    setSuccess(false)
    setLoading(true)

    const result = await saveFirmProfile(formData)

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(true)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12">
      <form action={handleSubmit} className="w-full max-w-lg space-y-4 px-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Firm profile</h1>
          <p className="mt-1 text-sm text-muted">
            Update your firm details. This is used to tailor your win-strategy reports.
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">Saved.</p>}

        <div>
          <label className="mb-1 block text-sm text-muted">Company name</label>
          <input
            type="text"
            name="company_name"
            defaultValue={firmProfile?.company_name || ''}
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">Firm description (optional)</label>
          <textarea
            name="firm_description"
            rows={4}
            maxLength={DESCRIPTION_MAX}
            defaultValue={firmProfile?.firm_description || ''}
            onChange={(e) => setDescriptionLength(e.target.value.length)}
            placeholder="A short overview of your firm: who you serve, what sets you apart, and the kind of work you want to win."
            className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
          />
          <p className="mt-1 text-right text-xs text-muted">
            {descriptionLength.toLocaleString()} / {DESCRIPTION_MAX.toLocaleString()}
          </p>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-muted">UEI (optional)</label>
              <input
                type="text"
                name="uei"
                maxLength={12}
                pattern="[A-Za-z0-9]{12}"
                title="12 letters or numbers"
                autoComplete="off"
                spellCheck={false}
                defaultValue={firmProfile?.uei || ''}
                placeholder="12 characters"
                className="w-full rounded border border-border bg-surface px-3 py-2 uppercase text-foreground placeholder:normal-case placeholder:text-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">CAGE code (optional)</label>
              <input
                type="text"
                name="cage_code"
                maxLength={5}
                pattern="[A-Za-z0-9]{5}"
                title="5 letters or numbers"
                autoComplete="off"
                spellCheck={false}
                defaultValue={firmProfile?.cage_code || ''}
                placeholder="5 characters"
                className="w-full rounded border border-border bg-surface px-3 py-2 uppercase text-foreground placeholder:normal-case placeholder:text-muted"
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-muted">Both are listed in your SAM.gov entity registration.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">Certifications</label>
          <div className="flex flex-wrap gap-3">
            {CERTIFICATION_OPTIONS.map((cert) => (
              <label key={cert.value} className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  name="certifications"
                  value={cert.value}
                  defaultChecked={firmProfile?.certifications?.includes(cert.value)}
                />
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
            defaultValue={firmProfile?.naics_codes?.join(', ') || ''}
            placeholder="e.g. 541511, 541512, 236220"
            pattern="^\d{6}(\s*,\s*\d{6})*$"
            title="Enter 6-digit NAICS codes separated by commas"
            className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
          />
          <p className="mt-1 text-xs text-muted">6-digit codes only, separated by commas.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">Core capabilities</label>
          <textarea
            name="capabilities"
            rows={3}
            defaultValue={firmProfile?.capabilities || ''}
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
              defaultValue={firmProfile?.years_in_business ?? ''}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Team size</label>
            <input
              type="number"
              name="team_size"
              min={1}
              defaultValue={firmProfile?.team_size ?? ''}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">Past performance highlights (optional)</label>
          <textarea
            name="past_performance"
            rows={3}
            defaultValue={firmProfile?.past_performance || ''}
            placeholder="Brief notes on relevant past contracts or work, e.g. agency, contract type, outcome..."
            className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-accent px-3 py-2 text-white hover:bg-accent-hover"
        >
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}