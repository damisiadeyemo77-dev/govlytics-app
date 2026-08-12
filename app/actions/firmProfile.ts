'use server'

import { createClient } from '@/lib/supabase/server'

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

  const { error } = await supabase
    .from('firm_profiles')
    .upsert(
      {
        user_id: user.id,
        company_name: companyName,
        certifications,
        naics_codes: naicsCodes,
        capabilities,
        years_in_business: yearsInBusiness,
        team_size: teamSize,
        past_performance: pastPerformance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('Failed to save firm profile:', error)
    return { error: 'Failed to save firm profile.' }
  }

  return { success: true }
}