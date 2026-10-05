'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchOpportunityById, SamGovError } from '@/lib/samgov'

const NOTICE_ID_PATTERN = /^[a-f0-9]{16,64}$/

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

  // Check the daily-sync cache first so manual adds don't spend SAM.gov quota.
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
    try {
      const opp = await fetchOpportunityById(noticeId)
      if (!opp) {
        return { error: 'No opportunity found for that ID.' }
      }
      title = opp.title || 'Untitled opportunity'
      agency = opp.fullParentPathName ?? null
      rawData = opp
    } catch (err) {
      if (err instanceof SamGovError && err.status === 429) {
        return { error: 'SAM.gov\'s daily lookup limit has been reached. Try again tomorrow, or pick an opportunity from your feed.' }
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