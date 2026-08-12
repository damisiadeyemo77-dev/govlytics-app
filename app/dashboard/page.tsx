import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { addContract } from '@/app/actions/contracts'
import { generateReport } from '@/app/actions/reports'
import { createPortalSession } from '@/app/actions/stripe'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_tier, subscription_status')
    .eq('id', user.id)
    .single()

    const { data: firmProfile } = await supabase
    .from('firm_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!firmProfile) {
    redirect('/onboarding')
  }

const { data: contracts } = await supabase
  .from('contracts')
  .select('*, reports(id, win_probability, created_at)')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

  async function handleAddContract(formData: FormData) {
    'use server'
    const url = formData.get('url') as string
    const result = await addContract(url)

    if (result.error) {
      redirect(`/dashboard?error=${encodeURIComponent(result.error)}`)
    }

    redirect('/dashboard')
  }

  async function handleGenerateReport(formData: FormData) {
    'use server'
    const contractId = formData.get('contractId') as string
    const result = await generateReport(contractId)

    if (result.error) {
      redirect(`/dashboard?error=${encodeURIComponent(result.error)}`)
    }

    redirect(`/reports/${result.reportId}`)
  }

  async function handleManageBilling() {
    'use server'
    const result = await createPortalSession()

    if (result.error) {
      redirect(`/dashboard?error=${encodeURIComponent(result.error)}`)
    }

    redirect(result.url!)
  }

  const tier = profile?.subscription_tier || 'free'
  const status = profile?.subscription_status || 'inactive'

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-background py-12">
      <div className="w-full max-w-2xl px-4">
        {error && (
          <div className="mb-4 rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {status === 'past_due' && (
          <div className="mb-4 flex items-center justify-between rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            <span>Your last payment failed. Please update your billing info to avoid losing access.</span>
            <form action={handleManageBilling}>
              <button type="submit" className="ml-4 whitespace-nowrap underline hover:no-underline">
                Update billing
              </button>
            </form>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-sm text-muted">Current plan</p>
            <p className="font-medium capitalize text-foreground">
              {tier} · {status === 'active' ? 'Active' : status === 'past_due' ? 'Past due' : 'Inactive'}
            </p>
          </div>
          {tier !== 'free' && (
            <form action={handleManageBilling}>
              <button
                type="submit"
                className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-background"
              >
                Manage subscription
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Welcome, {profile?.full_name || user.email}</h1>
        <p className="mt-2 text-muted">Paste a SAM.gov contract link to get started.</p>
      </div>

      <form action={handleAddContract} className="w-full max-w-md space-y-3">
        <input
          type="url"
          name="url"
          placeholder="https://sam.gov/workspace/contract/opp/.../view"
          required
          className="w-full rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted"
        />
        <button
          type="submit"
          className="w-full rounded bg-accent px-3 py-2 text-white hover:bg-accent-hover"
        >
          Add Contract
        </button>
      </form>

      <div className="w-full max-w-2xl space-y-4">
        {contracts?.map((contract) => (
          <div key={contract.id} className="rounded-lg border border-border bg-surface p-4">
            <h2 className="font-semibold text-foreground">{contract.title || contract.sam_gov_id}</h2>
            <p className="text-sm text-muted">{contract.agency}</p>

            {contract.reports && contract.reports.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Reports</p>
                {contract.reports.map((report: { id: string; win_probability: number; created_at: string }) => (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="block text-sm text-accent hover:underline"
                  >
                    {report.win_probability}% win probability — {new Date(report.created_at).toLocaleDateString()}
                  </Link>
                ))}
              </div>
            )}

            <form action={handleGenerateReport} className="mt-3">
              <input type="hidden" name="contractId" value={contract.id} />
              <button
                type="submit"
                className="rounded bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover"
              >
                Generate Report
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}