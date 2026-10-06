'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const REPORT_LIMITS: Record<string, number> = {
  free: 3,
  starter: 5,
  pro: 20,
  agency: Infinity,
}

export async function generateReport(contractId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = profile?.subscription_tier || 'free'
  const limit = REPORT_LIMITS[tier] ?? REPORT_LIMITS.free

  const { data: firmProfile } = await supabase
    .from('firm_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!firmProfile) {
    return { error: 'Please complete your firm profile before generating reports.' }
  }

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single()

  if (contractError || !contract) {
    return { error: 'Contract not found.' }
  }

  // Reserve a report slot BEFORE counting. Simultaneous requests each see the
  // others' reservations, so none can slip past the monthly limit together.
  const admin = createAdminClient()
  let usageId: number | null = null

  const releaseSlot = async () => {
    if (usageId !== null) {
      await admin.from('report_usage').delete().eq('id', usageId)
      usageId = null
    }
  }

  if (limit !== Infinity) {
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

    const { data: usage, error: usageError } = await admin
      .from('report_usage')
      .insert({ user_id: user.id })
      .select('id')
      .single()

    if (usageError || !usage) {
      console.error('Failed to reserve report slot:', usageError)
      return { error: 'Something went wrong. Please try again.' }
    }
    usageId = usage.id

    const { count, error: countError } = await admin
      .from('report_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth)

    if (countError) {
      console.error('Failed to count report usage:', countError)
      await releaseSlot()
      return { error: 'Something went wrong. Please try again.' }
    }

    if ((count ?? 0) > limit) {
      await releaseSlot()
      return { error: `You've reached your ${tier} plan's limit of ${limit} reports this month. Upgrade your plan to generate more.` }
    }
  }

  const prompt = `You are a government contracting analyst. Analyze this federal contract opportunity and produce a win-strategy report tailored specifically to the firm described below. Your scoring and recommendations must reflect how well THIS firm fits THIS contract — not a generic assessment.

FIRM PROFILE:
Company: ${firmProfile.company_name || 'Not specified'}
Firm description: ${firmProfile.firm_description || 'Not provided'}
SAM.gov registration: UEI ${firmProfile.uei || 'not provided'}, CAGE code ${firmProfile.cage_code || 'not provided'}
Certifications: ${firmProfile.certifications?.length ? firmProfile.certifications.join(', ') : 'None'}
NAICS codes: ${firmProfile.naics_codes?.length ? firmProfile.naics_codes.join(', ') : 'Not specified'}
Core capabilities: ${firmProfile.capabilities || 'Not specified'}
Years in business: ${firmProfile.years_in_business ?? 'Not specified'}
Team size: ${firmProfile.team_size ?? 'Not specified'}
Past performance: ${firmProfile.past_performance || 'None provided'}

CONTRACT OPPORTUNITY:
Contract Title: ${contract.title}
Agency: ${contract.agency}
Raw Data: ${JSON.stringify(contract.raw_data)}

Using the firm profile above, assess fit and produce a report. Use the firm description to understand the firm's focus, differentiators, and target market when judging fit and positioning. certification_match should reflect whether the firm's actual certifications align with likely set-aside requirements for this contract. past_performance_relevance should reflect the firm's stated past performance against what this contract calls for. If no UEI is provided, include unconfirmed SAM.gov registration as one of the key risks, since an active registration is required to receive a federal award. Respond ONLY with valid JSON in this exact structure, no markdown, no preamble:
{
  "win_probability": <number 0-100>,
  "go_no_go": "<GO or NO-GO>",
  "reasoning": "<2-3 sentence explanation referencing the firm's specific fit>",
  "competitive_landscape": "<paragraph on likely competition>",
  "teaming_recommendations": "<paragraph on teaming/subcontracting strategy given this firm's size and capabilities>",
  "key_risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "scoring_factors": {
    "past_performance_relevance": <number 0-100>,
    "certification_match": <number 0-100>,
    "agency_familiarity": <number 0-100>,
    "incumbent_risk": <number 0-100>
  },
  "competitive_stats": {
    "similar_awards_last_3_years": <estimated number>,
    "small_business_set_asides": <estimated number>,
    "likely_competitor_range": "<e.g. 4-6>"
  },
  "positioning_guidance": ["<short actionable tip 1>", "<short actionable tip 2>", "<short actionable tip 3>"],
  "plain_english_summary": "<2-3 sentence casual summary of the opportunity>"
}`

  let responseText = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })
    const first = message.content[0]
    responseText = first && first.type === 'text' ? first.text : ''
  } catch (err) {
    console.error('Claude API request failed:', err)
    await releaseSlot()
    return { error: 'Report generation is temporarily unavailable. Please try again later. This attempt didn\'t count toward your limit.' }
  }

  const cleanedText = responseText.replace(/```json\s*|```\s*/g, '').trim()

  let reportData
  try {
    reportData = JSON.parse(cleanedText)
  } catch {
    console.error('Failed to parse Claude response:', responseText)
    await releaseSlot()
    return { error: 'Failed to parse report response. This attempt didn\'t count toward your limit.' }
  }

  const { data: newReport, error: insertError } = await supabase
    .from('reports')
    .insert({
      user_id: user.id,
      contract_id: contractId,
      win_probability: reportData.win_probability,
      content: reportData,
    })
    .select('id')
    .single()

  if (insertError || !newReport) {
    console.error('Supabase insert error:', insertError)
    await releaseSlot()
    return { error: 'Failed to save report.' }
  }

  return { reportId: newReport.id }
}