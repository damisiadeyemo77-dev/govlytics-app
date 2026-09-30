'use server'

import { createClient } from '@/lib/supabase/server'

const DESCRIPTION_MAX = 2000

export async function saveFirmProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const companyName = formData.get('company_name') as string
  const certifications = formData.getAll('certifications') as string[]
  const naicsCodesRaw = formData.get('naics_codes') as string
  const naicsCodes = naicsCodesRaw
    ? naicsCodesRaw.split(',').map((c) => c.trim()).filter(Boolean)
    : []

  const invalidCodes = naicsCodes.filter((code) => !/^\d{6}$/.test(code))
  if (invalidCodes.length > 0) {
    return { error: `NAICS codes must be 6-digit numbers. Invalid: ${invalidCodes.join(', ')}` }
  }

  const capabilities = formData.get('capabilities') as string
  const yearsInBusiness = formData.get('years_in_business')
    ? parseInt(formData.get('years_in_business') as string)
    : null
  const teamSize = formData.get('team_size')
    ? parseInt(formData.get('team_size') as string)
    : null
  const pastPerformance = formData.get('past_performance') as string

  const profile: Record<string, unknown> = {
    user_id: user.id,
    company_name: companyName,
    certifications,
    naics_codes: naicsCodes,
    capabilities,
    years_in_business: yearsInBusiness,
    team_size: teamSize,
    past_performance: pastPerformance,
    updated_at: new Date().toISOString(),
  }

  // New fields are only written when the form actually includes them,
  // so a form without these inputs never wipes saved values.
  if (formData.has('cage_code')) {
    const cageCode = ((formData.get('cage_code') as string) || '').trim().toUpperCase()
    if (cageCode && !/^[A-Z0-9]{5}$/.test(cageCode)) {
      return { error: 'CAGE code must be exactly 5 letters or numbers.' }
    }
    profile.cage_code = cageCode || null
  }

  if (formData.has('uei')) {
    const uei = ((formData.get('uei') as string) || '').trim().toUpperCase()
    if (uei && !/^[A-Z0-9]{12}$/.test(uei)) {
      return { error: 'UEI must be exactly 12 letters or numbers.' }
    }
    profile.uei = uei || null
  }

  if (formData.has('firm_description')) {
    // Browsers submit textarea line breaks as \r\n; normalize so the
    // length matches what the user saw in the character limit.
    const firmDescription = ((formData.get('firm_description') as string) || '')
      .replace(/\r\n/g, '\n')
      .trim()
    if (firmDescription.length > DESCRIPTION_MAX) {
      return { error: `Firm description must be ${DESCRIPTION_MAX.toLocaleString()} characters or fewer.` }
    }
    profile.firm_description = firmDescription || null
  }

  const { error } = await supabase
    .from('firm_profiles')
    .upsert(profile, { onConflict: 'user_id' })

  if (error) {
    console.error('Failed to save firm profile:', error)
    return { error: 'Failed to save firm profile.' }
  }

  return { success: true }
}