'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

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

  if (limit !== Infinity) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    if ((count ?? 0) >= limit) {
      return { error: `You've reached your ${tier} plan's limit of ${limit} reports this month. Upgrade your plan to generate more.` }
    }
  }

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single()

  if (contractError || !contract) {
    return { error: 'Contract not found.' }
  }

  const prompt = `You are a government contracting analyst. Analyze this federal contract opportunity and produce a win-strategy report.

Contract Title: ${contract.title}
Agency: ${contract.agency}
Raw Data: ${JSON.stringify(contract.raw_data)}

Respond ONLY with valid JSON in this exact structure, no markdown, no preamble:
{
  "win_probability": <number 0-100>,
  "go_no_go": "<GO or NO-GO>",
  "reasoning": "<2-3 sentence explanation>",
  "competitive_landscape": "<paragraph on likely competition>",
  "teaming_recommendations": "<paragraph on teaming/subcontracting strategy>",
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

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  const cleanedText = responseText.replace(/```json\s*|```\s*/g, '').trim()

  let reportData
  try {
    reportData = JSON.parse(cleanedText)
  } catch (parseError) {
    console.error('Failed to parse Claude response:', responseText)
    return { error: 'Failed to parse report response.' }
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

  if (insertError) {
    console.error('Supabase insert error:', insertError)
    return { error: 'Failed to save report.' }
  }
  return { reportId: newReport.id }
}