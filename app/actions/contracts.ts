'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchSamGovOpportunity } from './samgov'

export async function addContract(url: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const match = url.match(/\/opp\/([a-f0-9]+)\/view/)
  if (!match) {
    return { error: 'That doesn\'t look like a valid SAM.gov opportunity link.' }
  }
  const samGovId = match[1]

  const { data: existing } = await supabase
    .from('contracts')
    .select('id')
    .eq('sam_gov_id', samGovId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return { contractId: existing.id }
  }

  const oppData = await fetchSamGovOpportunity(samGovId)

  if (oppData.error) {
    return { error: oppData.error }
  }

  const { data: newContract, error } = await supabase
    .from('contracts')
    .insert({
      user_id: user.id,
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