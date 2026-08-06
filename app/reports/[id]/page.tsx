import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DownloadButton } from './DownloadButtonWrapper'

type ReportContent = {
  win_probability: number
  go_no_go: string
  reasoning: string
  competitive_landscape: string
  teaming_recommendations: string
  key_risks: string[]
  scoring_factors: {
    past_performance_relevance: number
    certification_match: number
    agency_familiarity: number
    incumbent_risk: number
  }
  competitive_stats: {
    similar_awards_last_3_years: number
    small_business_set_asides: number
    likely_competitor_range: string
  }
  positioning_guidance: string[]
  plain_english_summary: string
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'bg-success' : value >= 40 ? 'bg-warning' : 'bg-danger'
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-border">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: report } = await supabase
    .from('reports')
    .select('*, contracts(title, agency, sam_gov_id)')
    .eq('id', id)
    .single()

  if (!report) {
    notFound()
  }

  const content = report.content as ReportContent
  const isGo = content.go_no_go === 'GO'

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Win Strategy Report</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">{report.contracts?.title}</h1>
            <p className="mt-1 text-muted">{report.contracts?.agency}</p>
          </div>
          <DownloadButton
            title={report.contracts?.title || 'report'}
            agency={report.contracts?.agency || ''}
            content={content}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-surface p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Win Probability</p>
              <div className="mt-2 text-4xl font-bold text-accent">{content.win_probability}%</div>
              <p className="mt-3 text-sm text-muted">{content.reasoning}</p>
            </div>

            <div
              className={`rounded-lg border p-4 ${
                isGo ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10'
              }`}
            >
              <p className={`font-semibold ${isGo ? 'text-success' : 'text-danger'}`}>
                {isGo ? '✓ Recommendation — Go' : '✕ Recommendation — No-Go'}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {isGo ? 'This opportunity aligns strongly with your firm profile. Pursue it.' : 'Proceed with caution — review the risks below.'}
              </p>
            </div>

            {content.scoring_factors && (
              <div className="space-y-4 rounded-lg border border-border bg-surface p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Scoring Factors</p>
                <ScoreBar label="Past performance relevance" value={content.scoring_factors.past_performance_relevance} />
                <ScoreBar label="Certification match" value={content.scoring_factors.certification_match} />
                <ScoreBar label="Agency familiarity" value={content.scoring_factors.agency_familiarity} />
                <ScoreBar label="Incumbent risk" value={content.scoring_factors.incumbent_risk} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-surface p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Teaming Recommendations</p>
              <p className="mt-2 text-sm text-foreground">{content.teaming_recommendations}</p>
            </div>

            {content.positioning_guidance && (
              <div className="rounded-lg border border-border bg-surface p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Positioning Guidance</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                  {content.positioning_guidance.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {content.competitive_stats && (
              <div className="rounded-lg border border-border bg-surface p-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Competitive Landscape</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded bg-background p-3 text-center">
                    <div className="text-xl font-bold text-foreground">{content.competitive_stats.similar_awards_last_3_years}</div>
                    <div className="mt-1 text-xs text-muted">Similar awards in last 3 years</div>
                  </div>
                  <div className="rounded bg-background p-3 text-center">
                    <div className="text-xl font-bold text-foreground">{content.competitive_stats.small_business_set_asides}</div>
                    <div className="mt-1 text-xs text-muted">Small business set-asides</div>
                  </div>
                  <div className="rounded bg-background p-3 text-center">
                    <div className="text-xl font-bold text-foreground">{content.competitive_stats.likely_competitor_range}</div>
                    <div className="mt-1 text-xs text-muted">Likely competitors</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Competitive Landscape</p>
          <p className="mt-2 text-foreground">{content.competitive_landscape}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Key Risks</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground">
            {content.key_risks?.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        </div>

        {content.plain_english_summary && (
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Plain English Summary</p>
            <p className="mt-2 text-foreground">{content.plain_english_summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}