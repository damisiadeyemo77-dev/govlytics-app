'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { ReportPDF } from './ReportPDF'

type ReportContent = {
  win_probability: number
  go_no_go: string
  reasoning: string
  competitive_landscape: string
  teaming_recommendations: string
  key_risks: string[]
}

export function DownloadButton({
  title,
  agency,
  content,
}: {
  title: string
  agency: string
  content: ReportContent
}) {
  return (
    <PDFDownloadLink
      document={<ReportPDF title={title} agency={agency} content={content} />}
      fileName={`${title.slice(0, 40)}-report.pdf`}
      className="inline-block rounded bg-black px-4 py-2 text-sm text-white"
    >
      {({ loading }) => (loading ? 'Preparing PDF...' : 'Download PDF')}
    </PDFDownloadLink>
  )
}