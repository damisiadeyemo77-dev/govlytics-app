import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addContractByNoticeId } from '@/app/actions/contracts'
import { generateReport } from '@/app/actions/reports'
import GenerateReportButton from '@/app/components/GenerateReportButton'
import SubmitButton from '@/app/components/SubmitButton'

export const FEED_PAGE_SIZE = 20
export const FEED_MAX = 200

const DAY_MS = 24 * 60 * 60 * 1000

// Unrestricted and small-business set-asides: open to any small business.
const BASE_SET_ASIDES = ['NONE', 'SBA', 'SBP']

// Competitive set-asides each certification qualifies for.
// Sole-source codes are left out on purpose: those target one specific firm.
const CERT_SET_ASIDES: Record<string, string[]> = {
  '8(a)': ['8A'],
  HUBZone: ['HZC'],
  SDVOSB: ['SDVOSBC', 'VSA'],
  WOSB: ['WOSB'],
  EDWOSB: ['WOSB', 'EDWOSB'],
}

const SET_ASIDE_LABELS: Record<string, string> = {
  NONE: 'Full & open',
  SBA: 'Small business',
  SBP: 'Partial small business',
  '8A': '8(a)',
  HZC: 'HUBZone',
  SDVOSBC: 'SDVOSB',
  VSA: 'Veteran-owned',
  WOSB: 'WOSB',
  EDWOSB: 'EDWOSB',
}

type FeedOpportunity = {
  notice_id: string
  title: string
  agency: string | null
  naics_code: string | null
  set_aside_code: string | null
  response_deadline: string
  ui_link: string | null
}

function allowedSetAsides(certifications: string[]) {
  const codes = new Set(BASE_SET_ASIDES)
  for (const cert of certifications) {
    for (const code of CERT_SET_ASIDES[cert] ?? []) codes.add(code)
  }
  return [...codes]
}

function feedPath(show: number, error?: string) {
  const params = new URLSearchParams({ tab: 'discover' })
  if (show > FEED_PAGE_SIZE) params.set('show', String(Math.min(show, FEED_MAX)))
  if (error) params.set('error', error)
  return `/dashboard?${params}`
}

function showFrom(formData: FormData) {
  const n = parseInt(formData.get('show') as string, 10)
  return Number.isNaN(n) ? FEED_PAGE_SIZE : n
}

// SAM.gov agency paths look like "DEPT OF DEFENSE.DEPT OF THE ARMY.W6QK ACC-PICA"
function formatAgency(path: string | null) {
  if (!path) return 'Agency not listed'
  const parts = path.split('.').map((p) => p.trim()).filter(Boolean)
  return parts.length > 1 ? `${parts[0]} · ${parts[parts.length - 1]}` : parts[0]
}

function deadlineBadge(deadline: string, now: number) {
  const days = Math.ceil((new Date(deadline).getTime() - now) / DAY_MS)
  const label = days <= 0 ? 'Due today' : days === 1 ? '1 day left' : `${days} days left`
  const style =
    days <= 7
      ? 'border-danger/30 bg-danger/10 text-danger'
      : days <= 14
        ? 'border-warning/30 bg-warning/10 text-warning'
        : 'border-border bg-background text-muted'
  return { label, style }
}

async function saveOpportunity(formData: FormData) {
  'use server'
  const show = showFrom(formData)
  const result = await addContractByNoticeId(formData.get('noticeId') as string)
  if (result.error) {
    redirect(feedPath(show, result.error))
  }
  redirect(feedPath(show))
}

async function analyzeOpportunity(formData: FormData) {
  'use server'
  const show = showFrom(formData)

  const added = await addContractByNoticeId(formData.get('noticeId') as string)
  if (!added.contractId) {
    redirect(feedPath(show, added.error ?? 'Could not add that opportunity.'))
  }

  const report = await generateReport(added.contractId)
  if (!report.reportId) {
    redirect(feedPath(show, report.error ?? 'Could not generate a report.'))
  }

  redirect(`/reports/${report.reportId}`)
}

export default async function OpportunityFeed({
  naicsCodes,
  certifications,
  show,
  savedNoticeIds,
}: {
  naicsCodes: string[]
  certifications: string[]
  show: number
  savedNoticeIds: string[]
}) {
  if (naicsCodes.length === 0) {
    return (
      <div className="w-full max-w-2xl px-4">
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-foreground">Add NAICS codes to see matched opportunities</p>
          <p className="mt-1 text-sm text-muted">
            We match open federal opportunities to the NAICS codes in your firm profile.
          </p>
          <Link href="/settings" className="mt-3 inline-block text-sm text-accent hover:underline">
            Update firm profile
          </Link>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data, count, error } = await supabase
    .from('opportunities')
    .select('notice_id, title, agency, naics_code, set_aside_code, response_deadline, ui_link', {
      count: 'exact',
    })
    .in('naics_code', naicsCodes)
    .eq('active', true)
    .gt('response_deadline', new Date().toISOString())
    .or(`set_aside_code.is.null,set_aside_code.in.(${allowedSetAsides(certifications).join(',')})`)
    .order('response_deadline', { ascending: true })
    .range(0, show - 1)

  if (error) {
    console.error('Failed to load opportunity feed:', error)
    return (
      <div className="w-full max-w-2xl px-4">
        <p className="text-sm text-danger">Couldn&apos;t load opportunities right now. Try refreshing.</p>
      </div>
    )
  }

  const opportunities = (data ?? []) as FeedOpportunity[]
  const total = count ?? 0
  const saved = new Set(savedNoticeIds)
  const now = Date.now()

  return (
    <div className="w-full max-w-2xl space-y-4 px-4">
      <p className="text-sm text-muted">
        <span className="font-medium text-foreground">{total.toLocaleString()}</span>{' '}
        open {total === 1 ? 'opportunity matches' : 'opportunities match'} your NAICS codes and
        certifications.{' '}
        <Link href="/settings" className="text-accent hover:underline">
          Edit profile
        </Link>
      </p>

      {opportunities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-foreground">No open matches right now</p>
          <p className="mt-1 text-sm text-muted">
            New opportunities sync every morning. Adding more NAICS codes can widen your matches.
          </p>
        </div>
      ) : (
        opportunities.map((opp) => {
          const badge = deadlineBadge(opp.response_deadline, now)
          const setAsideLabel = opp.set_aside_code
            ? SET_ASIDE_LABELS[opp.set_aside_code] ?? opp.set_aside_code
            : 'Full & open'
          const dueDate = new Date(opp.response_deadline).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'America/New_York',
          })

          return (
            <div key={opp.notice_id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{opp.title}</h2>
                  <p className="text-sm text-muted">{formatAgency(opp.agency)}</p>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${badge.style}`}
                >
                  {badge.label}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded border border-border bg-background px-1.5 py-0.5 text-muted">
                  NAICS {opp.naics_code}
                </span>
                <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-accent">
                  {setAsideLabel}
                </span>
                <span className="text-muted">Due {dueDate}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={analyzeOpportunity}>
                  <input type="hidden" name="noticeId" value={opp.notice_id} />
                  <input type="hidden" name="show" value={show} />
                  <GenerateReportButton />
                </form>

                {saved.has(opp.notice_id) ? (
                  <span className="rounded border border-border px-3 py-1.5 text-sm text-muted">Saved</span>
                ) : (
                  <form action={saveOpportunity}>
                    <input type="hidden" name="noticeId" value={opp.notice_id} />
                    <input type="hidden" name="show" value={show} />
                    <SubmitButton
                      pendingText="Saving..."
                      className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-background"
                    >
                      Save
                    </SubmitButton>
                  </form>
                )}

                {opp.ui_link && (
                  <a
                    href={opp.ui_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    View on SAM.gov
                  </a>
                )}
              </div>
            </div>
          )
        })
      )}

      {total > opportunities.length && show < FEED_MAX && (
        <Link
          href={feedPath(show + FEED_PAGE_SIZE)}
          scroll={false}
          className="block w-full rounded border border-border bg-surface px-3 py-2 text-center text-sm text-foreground hover:bg-background"
        >
          Load more ({(total - opportunities.length).toLocaleString()} remaining)
        </Link>
      )}
    </div>
  )
}