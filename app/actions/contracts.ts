'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchOpportunityById, SamGovError, toOpportunityRow } from '@/lib/samgov'

const NOTICE_ID_PATTERN = /^[a-f0-9]{16,64}$/
const DAY_MS = 24 * 60 * 60 * 1000

// Live SAM.gov lookups share the app's small daily API quota with the
// morning sync, so they're capped per user and across all users.
const USER_DAILY_LOOKUPS = Number(process.env.SAM_LOOKUP_USER_DAILY ?? 3)
const GLOBAL_DAILY_LOOKUPS = Number(process.env.SAM_LOOKUP_GLOBAL_DAILY ?? 4)

// Manual flow: user pastes a SAM.gov opportunity link.
export async function addContract(url: string) {
  const match = url.match(/\/opp\/([a-f0-9]+)\/view/i)
  if (!match) {
    return { error: 'That doesn\'t look like a valid SAM.gov opportunity link.' }
  }
  return addContractByNoticeId(match[1])
}

// Shared by the manual flow and the discovery feed.
export async function addContractByNoticeId(rawNoticeId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const noticeId = String(rawNoticeId).trim().toLowerCase()
  if (!NOTICE_ID_PATTERN.test(noticeId)) {
    return { error: 'That opportunity ID isn\'t valid.' }
  }

  const { data: existing } = await supabase
    .from('contracts')
    .select('id')
    .eq('sam_gov_id', noticeId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return { contractId: existing.id }
  }

  // Check the synced table first; those lookups are free.
  const { data: cached } = await supabase
    .from('opportunities')
    .select('title, agency, raw_data')
    .eq('notice_id', noticeId)
    .maybeSingle()

  let title: string
  let agency: string | null
  let rawData: unknown

  if (cached) {
    title = cached.title
    agency = cached.agency
    rawData = cached.raw_data
  } else {
    const admin = createAdminClient()
    const since = new Date(Date.now() - DAY_MS).toISOString()

    const [userLookups, allLookups] = await Promise.all([
      admin
        .from('sam_lookups')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', since),
      admin
        .from('sam_lookups')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
    ])

    if (userLookups.error || allLookups.error) {
      console.error('SAM lookup limit check failed:', userLookups.error ?? allLookups.error)
      return { error: 'Something went wrong. Please try again.' }
    }

    if ((userLookups.count ?? 0) >= USER_DAILY_LOOKUPS) {
      return {
        error: `You've used today's ${USER_DAILY_LOOKUPS} new SAM.gov lookups. Saving opportunities from your Discover feed doesn't count toward this limit. Try again tomorrow.`,
      }
    }

    if ((allLookups.count ?? 0) >= GLOBAL_DAILY_LOOKUPS) {
      return {
        error: 'New SAM.gov lookups are paused for today. Pick an opportunity from your Discover feed, or try again tomorrow.',
      }
    }

    // Record the attempt before calling SAM.gov: failed lookups use quota too.
    const { error: logError } = await admin
      .from('sam_lookups')
      .insert({ user_id: user.id, notice_id: noticeId })

    if (logError) {
      console.error('Failed to record SAM lookup:', logError)
      return { error: 'Something went wrong. Please try again.' }
    }

    try {
      const opp = await fetchOpportunityById(noticeId)
      if (!opp) {
        return { error: 'No opportunity found for that ID.' }
      }
      title = opp.title || 'Untitled opportunity'
      agency = opp.fullParentPathName ?? null
      rawData = opp

      // Cache it so the next lookup of this notice is free.
      const { error: cacheError } = await admin
        .from('opportunities')
        .upsert(toOpportunityRow(opp), { onConflict: 'notice_id' })
      if (cacheError) {
        console.error('Failed to cache opportunity:', cacheError)
      }
    } catch (err) {
      if (err instanceof SamGovError && err.status === 429) {
        return { error: 'SAM.gov\'s daily lookup limit has been reached. Try again tomorrow, or pick an opportunity from your Discover feed.' }
      }
      console.error('SAM.gov lookup failed:', err)
      return { error: 'Failed to fetch SAM.gov data.' }
    }
  }

  const { data: newContract, error } = await supabase
    .from('contracts')
    .insert({
      user_id: user.id,
      sam_gov_id: noticeId,
      title,
      agency,
      raw_data: rawData,
    })
    .select('id')
    .single()

  if (error) {
    return { error: 'Something went wrong saving that contract.' }
  }

  return { contractId: newContract.id }
}