'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchSamGovOpportunity } from './samgov'

export async function addContract(url: string) {
  const supabase = await createClient()

  // 1. Auth check — reject if not logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in.' }
  }

  // 2. Validate the URL format before trusting it
  const match = url.match(/\/opp\/([a-f0-9]+)\/view/)
  if (!match) {
    return { error: 'That doesn\'t look like a valid SAM.gov opportunity link.' }
  }
  const samGovId = match[1]

  // 3. Check if this contract already exists
  const { data: existing } = await supabase
    .from('contracts')
    .select('id')
    .eq('sam_gov_id', samGovId)
    .single()

  if (existing) {
    return { contractId: existing.id }
  }

  // 4. Fetch real contract details from SAM.gov
  const oppData = await fetchSamGovOpportunity(samGovId)

  if (oppData.error) {
    return { error: oppData.error }
  }

  // 5. Insert new contract record with real data
  const { data: newContract, error } = await supabase
    .from('contracts')
    .insert({
      sam_gov_id: samGovId,
      title: oppData.title,
      agency: oppData.agency,
      raw_data: oppData.raw,
    })
    .select('id')
    .single()

  if (error) {
    return { error: 'Something went wrong saving that contract.' }
  }

  return { contractId: newContract.id }
}