import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { addContract } from '@/app/actions/contracts'
import { generateReport } from '@/app/actions/reports'
import { createPortalSession } from '@/app/actions/stripe'
import GenerateReportButton from '@/app/components/GenerateReportButton'
import AddContractForm from '@/app/components/AddContractForm'
import SubmitButton from '@/app/components/SubmitButton'

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

  const winProbabilityColor = (pct: number) => {
    if (pct >= 60) return 'bg-success/10 text-success border-success/30'
    if (pct >= 35) return 'bg-warning/10 text-warning border-warning/30'
    return 'bg-danger/10 text-danger border-danger/30'
  }

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
              <SubmitButton pendingText="Loading..." className="ml-4 whitespace-nowrap underline hover:no-underline">
                Update billing
              </SubmitButton>
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
              <SubmitButton
                pendingText="Loading..."
                className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-background"
              >
                Manage subscription
              </SubmitButton>
            </form>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl px-4">
        <h1 className="text-2xl font-bold text-foreground">Your Contracts</h1>
        <p className="mt-1 text-muted">
          Welcome back, {profile?.full_name || user.email}. Paste a SAM.gov contract link to get started.
        </p>
      </div>

      <AddContractForm action={handleAddContract} />

      <div className="w-full max-w-2xl space-y-4 px-4">
        {contracts && contracts.length > 0 ? (
          contracts.map((contract) => (
            <div key={contract.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">{contract.title || contract.sam_gov_id}</h2>
                  <p className="text-sm text-muted">{contract.agency}</p>
                </div>
                {contract.reports && contract.reports.length > 0 && (
                  <span className="whitespace-nowrap rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted">
                    {contract.reports.length} report{contract.reports.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {contract.reports && contract.reports.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Reports</p>
                  {contract.reports.map((report: { id: string; win_probability: number; created_at: string }) => (
                    <Link
                      key={report.id}
                      href={`/reports/${report.id}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${winProbabilityColor(report.win_probability)}`}>
                        {report.win_probability}%
                      </span>
                      <span className="text-accent">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              <form action={handleGenerateReport} className="mt-3">
                <input type="hidden" name="contractId" value={contract.id} />
                <GenerateReportButton />
              </form>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-foreground">No contracts yet</p>
            <p className="mt-1 text-sm text-muted">
              Paste a SAM.gov link above to generate your first win-strategy report.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}