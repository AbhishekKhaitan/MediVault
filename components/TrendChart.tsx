import { View, Text, Dimensions } from 'react-native'
import { VictoryLine, VictoryChart, VictoryAxis, VictoryScatter, VictoryTooltip } from 'victory-native'
import type { HealthMetric } from '../types'

interface Props {
  metricName: string
  metrics: HealthMetric[]
}

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 64  // 32px padding on each side

export function TrendChart({ metricName, metrics }: Props) {
  if (metrics.length === 0) return null

  // Sort by date ascending for line chart
  const sorted = [...metrics].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  )

  const dataPoints = sorted.map((m, i) => ({
    x: i + 1,
    y: Number(m.value),
    label: `${m.value} ${m.unit}\n${m.recorded_at}`,
  }))

  const values = dataPoints.map((d) => d.y)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const padding = (maxVal - minVal) * 0.2 || 1
  const yDomain: [number, number] = [minVal - padding, maxVal + padding]

  // Determine trend direction
  const first = values[0]
  const last = values[values.length - 1]
  const trend = values.length > 1
    ? last > first ? 'up' : last < first ? 'down' : 'flat'
    : 'flat'

  // Check if latest value is flagged
  const latestFlagged = sorted[sorted.length - 1]?.is_flagged ?? false
  const latestValue = sorted[sorted.length - 1]
  const lineColor = latestFlagged ? '#EF4444' : '#0EA5E9'

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
  const trendColor = latestFlagged
    ? '#EF4444'
    : trend === 'flat' ? '#94A3B8' : '#22C55E'

  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
      {/* Header row */}
      <View className="flex-row items-center justify-between mb-1">
        <Text className="font-bold text-slate-900 text-base flex-1" numberOfLines={1}>
          {metricName}
        </Text>
        <View className="flex-row items-center gap-2">
          {latestFlagged && (
            <View className="bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
              <Text className="text-red-500 text-xs font-semibold">Flagged</Text>
            </View>
          )}
          <Text className="text-lg font-bold" style={{ color: trendColor }}>
            {trendIcon}
          </Text>
        </View>
      </View>

      {/* Latest value */}
      {latestValue && (
        <Text className="text-slate-500 text-sm mb-2">
          Latest: <Text className={`font-semibold ${latestFlagged ? 'text-red-500' : 'text-slate-900'}`}>
            {latestValue.value} {latestValue.unit}
          </Text>
          {latestValue.reference_min != null && latestValue.reference_max != null && (
            <Text className="text-slate-400">
              {' '}(ref: {latestValue.reference_min}–{latestValue.reference_max})
            </Text>
          )}
        </Text>
      )}

      {/* Chart — only show if more than 1 data point */}
      {dataPoints.length > 1 ? (
        <VictoryChart
          width={CHART_WIDTH}
          height={140}
          padding={{ top: 16, bottom: 32, left: 44, right: 16 }}
          domain={{ y: yDomain }}
        >
          <VictoryAxis
            tickCount={Math.min(sorted.length, 5)}
            tickFormat={(t) => {
              const m = sorted[t - 1]
              if (!m) return ''
              return new Date(m.recorded_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
            }}
            style={{
              axis: { stroke: '#E2E8F0' },
              tickLabels: { fontSize: 9, fill: '#94A3B8' },
              grid: { stroke: 'transparent' },
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: '#E2E8F0' },
              tickLabels: { fontSize: 9, fill: '#94A3B8' },
              grid: { stroke: '#F1F5F9', strokeDasharray: '4,4' },
            }}
          />
          <VictoryLine
            data={dataPoints}
            style={{ data: { stroke: lineColor, strokeWidth: 2.5 } }}
            interpolation="monotoneX"
          />
          <VictoryScatter
            data={dataPoints}
            size={4}
            style={{ data: { fill: lineColor } }}
            labelComponent={<VictoryTooltip />}
          />
        </VictoryChart>
      ) : (
        <View className="py-3">
          <Text className="text-slate-400 text-xs text-center">Upload more reports to see trends</Text>
        </View>
      )}

      {/* Reading count */}
      <Text className="text-xs text-slate-400 mt-1">{metrics.length} reading{metrics.length !== 1 ? 's' : ''}</Text>
    </View>
  )
}
