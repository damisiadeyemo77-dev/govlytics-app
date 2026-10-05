import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  PAGE_SIZE,
  SamGovError,
  searchOpportunities,
  toOpportunityRow,
  type SamOpportunity,
} from '@/lib/samgov'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// o = Solicitation, k = Combined Synopsis/Solicitation.
// Add 'p' (Presolicitation) or 'r' (Sources Sought) if your quota allows.
const NOTICE_TYPES = ['o', 'k']

// Hard cap on SAM.gov calls per run, to protect the daily quota.
const MAX_REQUESTS = Number(process.env.SAM_SYNC_MAX_REQUESTS ?? 4)

const MAX_BACKFILL_DAYS = 14
const RETENTION_DAYS = 30
const UPSERT_CHUNK = 500
const DAY_MS = 24 * 60 * 60 * 1000

type TypeSummary = { ptype: string; totalRecords: number; fetched: number }

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?days=N backfills N days (default 1 = yesterday only).
  const daysParam = parseInt(new URL(request.url).searchParams.get('days') ?? '1')
  const days = Math.min(Math.max(Number.isNaN(daysParam) ? 1 : daysParam, 1), MAX_BACKFILL_DAYS)

  const now = new Date()
  const postedTo = new Date(now.getTime() - DAY_MS)
  const postedFrom = new Date(now.getTime() - days * DAY_MS)

  const supabase = createAdminClient()
  const types: TypeSummary[] = []
  let requests = 0
  let saved = 0
  let stoppedReason: string | null = null
  let failed = false

  outer: for (const ptype of NOTICE_TYPES) {
    const summary: TypeSummary = { ptype, totalRecords: 0, fetched: 0 }
    types.push(summary)
    let offset = 0

    while (true) {
      if (requests >= MAX_REQUESTS) {
        stoppedReason = `Reached the ${MAX_REQUESTS}-request cap for this run`
        break outer
      }

      let page: { totalRecords: number; opportunities: SamOpportunity[] }
      requests++
      try {
        page = await searchOpportunities({ postedFrom, postedTo, ptype, offset })
      } catch (err) {
        stoppedReason = err instanceof SamGovError ? err.message : 'Unexpected SAM.gov error'
        failed = true
        console.error('SAM sync request failed:', err)
        break outer
      }

      summary.totalRecords = page.totalRecords
      summary.fetched += page.opportunities.length

      // Dedupe within the page; Postgres rejects duplicate keys in one upsert.
      const unique = new Map<string, ReturnType<typeof toOpportunityRow>>()
      for (const opp of page.opportunities) {
        if (opp.noticeId) unique.set(opp.noticeId, toOpportunityRow(opp))
      }
      const rows = [...unique.values()]

      for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
        const { error } = await supabase
          .from('opportunities')
          .upsert(rows.slice(i, i + UPSERT_CHUNK), { onConflict: 'notice_id' })
        if (error) {
          stoppedReason = `Supabase upsert failed: ${error.message}`
          failed = true
          break outer
        }
      }
      saved += rows.length

      if (page.opportunities.length < PAGE_SIZE || summary.fetched >= page.totalRecords) break
      offset += PAGE_SIZE
    }
  }

  // Drop opportunities whose deadline passed more than RETENTION_DAYS ago.
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS).toISOString()
  const { count: removed, error: cleanupError } = await supabase
    .from('opportunities')
    .delete({ count: 'exact' })
    .lt('response_deadline', cutoff)
  if (cleanupError) console.error('SAM sync cleanup failed:', cleanupError)

  const result = {
    ok: !failed,
    window: { postedFrom: postedFrom.toISOString().slice(0, 10), postedTo: postedTo.toISOString().slice(0, 10) },
    requests,
    saved,
    removed: removed ?? 0,
    types,
    stoppedReason,
  }

  console.log('SAM sync result:', JSON.stringify(result))
  return NextResponse.json(result, { status: failed ? 502 : 200 })
}