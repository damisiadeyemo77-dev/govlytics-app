'use server'

export async function fetchSamGovOpportunity(samGovId: string) {
  const apiKey = process.env.SAM_GOV_API_KEY

  const postedFrom = '01/01/2026'
  const postedTo = '12/31/2026'
  
  const url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&noticeid=${samGovId}&postedFrom=${postedFrom}&postedTo=${postedTo}`

  const res = await fetch(url)

  if (!res.ok) {
    const errorText = await res.text()
    console.error('SAM.gov API error:', res.status, errorText)
    return { error: 'Failed to fetch SAM.gov data' }
  }

  const data = await res.json()

  if (!data.opportunitiesData || data.opportunitiesData.length === 0) {
    return { error: 'No opportunity found for that ID' }
  }

  const opp = data.opportunitiesData[0]

  return {
    title: opp.title,
    agency: opp.fullParentPathName,
    description: opp.description,
    postedDate: opp.postedDate,
    responseDeadline: opp.responseDeadLine,
    naicsCode: opp.naicsCode,
    setAside: opp.typeOfSetAsideDescription,
    raw: opp,
  }
}