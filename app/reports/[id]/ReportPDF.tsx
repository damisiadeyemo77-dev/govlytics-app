import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  agency: { fontSize: 11, color: '#555', marginBottom: 20 },
  scoreBox: { border: '1pt solid #ccc', padding: 12, marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  score: { fontSize: 28, fontWeight: 'bold' },
  reasoning: { fontSize: 10, color: '#333', marginTop: 6 },
  banner: { padding: 10, marginBottom: 16, border: '1pt solid #ccc' },
  bannerGo: { backgroundColor: '#e8f7ee' },
  bannerNoGo: { backgroundColor: '#fdecec' },
  bannerTextGo: { color: '#15803d', fontWeight: 'bold', fontSize: 12 },
  bannerTextNoGo: { color: '#b91c1c', fontWeight: 'bold', fontSize: 12 },
  bannerSub: { fontSize: 9, color: '#333', marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  sectionText: { fontSize: 10, color: '#333', lineHeight: 1.4 },
  riskItem: { fontSize: 10, color: '#333', marginBottom: 2 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  barLabel: { fontSize: 9, color: '#333' },
  barValue: { fontSize: 9, fontWeight: 'bold', color: '#333' },
  barTrack: { height: 6, backgroundColor: '#e5e5e5', borderRadius: 3, marginTop: 2 },
  barFill: { height: 6, borderRadius: 3 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  statBox: { flex: 1, border: '1pt solid #ddd', padding: 8, textAlign: 'center' },
  statNumber: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 8, color: '#555', marginTop: 2 },
})

type ReportContent = {
  win_probability: number
  go_no_go: string
  reasoning: string
  competitive_landscape: string
  teaming_recommendations: string
  key_risks: string[]
  scoring_factors?: {
    past_performance_relevance: number
    certification_match: number
    agency_familiarity: number
    incumbent_risk: number
  }
  competitive_stats?: {
    similar_awards_last_3_years: number
    small_business_set_asides: number
    likely_competitor_range: string
  }
  positioning_guidance?: string[]
  plain_english_summary?: string
}

function barColor(value: number) {
  if (value >= 70) return '#22c55e'
  if (value >= 40) return '#f59e0b'
  return '#ef4444'
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${value}%`, backgroundColor: barColor(value) }]} />
      </View>
    </View>
  )
}

export function ReportPDF({
  title,
  agency,
  content,
}: {
  title: string
  agency: string
  content: ReportContent
}) {
  const isGo = content.go_no_go === 'GO'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.agency}>{agency}</Text>

        <View style={styles.scoreBox}>
          <View style={styles.scoreRow}>
            <Text style={styles.score}>{content.win_probability}%</Text>
            <Text style={styles.reasoning}>{content.reasoning}</Text>
          </View>
        </View>

        <View style={[styles.banner, isGo ? styles.bannerGo : styles.bannerNoGo]}>
          <Text style={isGo ? styles.bannerTextGo : styles.bannerTextNoGo}>
            {isGo ? 'Recommendation — Go' : 'Recommendation — No-Go'}
          </Text>
          <Text style={styles.bannerSub}>
            {isGo
              ? 'This opportunity aligns strongly with your firm profile. Pursue it.'
              : 'Proceed with caution — review the risks below.'}
          </Text>
        </View>

        {content.scoring_factors && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scoring Factors</Text>
            <ScoreBar label="Past performance relevance" value={content.scoring_factors.past_performance_relevance} />
            <ScoreBar label="Certification match" value={content.scoring_factors.certification_match} />
            <ScoreBar label="Agency familiarity" value={content.scoring_factors.agency_familiarity} />
            <ScoreBar label="Incumbent risk" value={content.scoring_factors.incumbent_risk} />
          </View>
        )}

        {content.competitive_stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Competitive Landscape</Text>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{content.competitive_stats.similar_awards_last_3_years}</Text>
                <Text style={styles.statLabel}>Similar awards in last 3 years</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{content.competitive_stats.small_business_set_asides}</Text>
                <Text style={styles.statLabel}>Small business set-asides</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{content.competitive_stats.likely_competitor_range}</Text>
                <Text style={styles.statLabel}>Likely competitors</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Competitive Landscape Detail</Text>
          <Text style={styles.sectionText}>{content.competitive_landscape}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teaming Recommendations</Text>
          <Text style={styles.sectionText}>{content.teaming_recommendations}</Text>
        </View>

        {content.positioning_guidance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Positioning Guidance</Text>
            {content.positioning_guidance.map((tip, i) => (
              <Text key={i} style={styles.riskItem}>• {tip}</Text>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Risks</Text>
          {content.key_risks?.map((risk, i) => (
            <Text key={i} style={styles.riskItem}>• {risk}</Text>
          ))}
        </View>

        {content.plain_english_summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plain English Summary</Text>
            <Text style={styles.sectionText}>{content.plain_english_summary}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}