import 'server-only'

const SEARCH_URL = 'https://api.sam.gov/opportunities/v2/search'
const DAY_MS = 24 * 60 * 60 * 1000

export const PAGE_SIZE = 1000

export type SamOpportunity = {
  noticeId: string
  title?: string
  solicitationNumber?: string
  fullParentPathName?: string
  postedDate?: string
  type?: string
  typeOfSetAside?: string | null
  typeOfSetAsideDescription?: string | null
  responseDeadLine?: string | null
  naicsCode?: string | null
  active?: string
  uiLink?: string
  [key: string]: unknown
}

export class SamGovError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'SamGovError'
    this.status = status
  }
}

// SAM.gov expects MM/dd/yyyy
function formatSamDate(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${mm}/${dd}/${d.getUTCFullYear()}`
}

async function samSearch(params: Record<string, string>) {
  const apiKey = process.env.SAM_GOV_API_KEY
  if (!apiKey) {
    throw new SamGovError('SAM_GOV_API_KEY is not set')
  }

  const qs = new URLSearchParams({ api_key: apiKey, ...params })
  const res = await fetch(`${SEARCH_URL}?${qs}`, { cache: 'no-store' })

  if (!res.ok) {
    const body = (await res.text()).split(apiKey).join('[redacted]')
    console.error('SAM.gov API error:', res.status, body.slice(0, 500))
    throw new SamGovError(
      res.status === 429
        ? 'SAM.gov daily request limit reached'
        : `SAM.gov request failed (${res.status})`,
      res.status
    )
  }

  const data = await res.json()
  return {
    totalRecords: Number(data.totalRecords ?? 0),
    opportunities: (data.opportunitiesData ?? []) as SamOpportunity[],
  }
}

export async function searchOpportunities(opts: {
  postedFrom: Date
  postedTo: Date
  ptype?: string
  offset?: number
}) {
  return samSearch({
    postedFrom: formatSamDate(opts.postedFrom),
    postedTo: formatSamDate(opts.postedTo),
    limit: String(PAGE_SIZE),
    offset: String(opts.offset ?? 0),
    ...(opts.ptype ? { ptype: opts.ptype } : {}),
  })
}

// Single-notice lookup over a rolling one-year window (SAM.gov's max range).
export async function fetchOpportunityById(noticeId: string): Promise<SamOpportunity | null> {
  const postedTo = new Date()
  const postedFrom = new Date(postedTo.getTime() - 364 * DAY_MS)

  const { opportunities } = await samSearch({
    noticeid: noticeId,
    postedFrom: formatSamDate(postedFrom),
    postedTo: formatSamDate(postedTo),
    limit: '1',
  })

  return opportunities[0] ?? null
}

function toTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function toDateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

// Maps a SAM.gov record to a row in the opportunities table.
export function toOpportunityRow(opp: SamOpportunity) {
  return {
    notice_id: opp.noticeId,
    title: opp.title || 'Untitled opportunity',
    solicitation_number: opp.solicitationNumber ?? null,
    agency: opp.fullParentPathName ?? null,
    naics_code: opp.naicsCode ?? null,
    set_aside_code: opp.typeOfSetAside?.trim() || null,
    set_aside: opp.typeOfSetAsideDescription?.trim() || null,
    notice_type: opp.type ?? null,
    posted_date: toDateOnly(opp.postedDate),
    response_deadline: toTimestamp(opp.responseDeadLine),
    ui_link: opp.uiLink ?? null,
    active: opp.active !== 'No',
    raw_data: opp,
    fetched_at: new Date().toISOString(),
  }
}