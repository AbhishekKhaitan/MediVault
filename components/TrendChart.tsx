import { View, Text, Dimensions } from 'react-native'
import Svg, { Line, Circle, Path, Text as SvgText } from 'react-native-svg'
import type { HealthMetric } from '../types'

interface Props {
  metricName: string
  metrics: HealthMetric[]
}

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 64
const CHART_HEIGHT = 110
const PAD = { top: 8, bottom: 28, left: 40, right: 12 }
const PLOT_W = CHART_WIDTH - PAD.left - PAD.right
const PLOT_H = CHART_HEIGHT - PAD.top - PAD.bottom

export function TrendChart({ metricName, metrics }: Props) {
  if (metrics.length === 0) return null

  const sorted = [...metrics].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  )
  const values = sorted.map((m) => Number(m.value))
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const padding = (maxVal - minVal) * 0.2 || 1
  const yMin = minVal - padding
  const yMax = maxVal + padding
  const yRange = yMax - yMin || 1

  const toX = (i: number) =>
    PAD.left + (sorted.length === 1 ? PLOT_W / 2 : (i / (sorted.length - 1)) * PLOT_W)
  const toY = (v: number) => PAD.top + PLOT_H - ((v - yMin) / yRange) * PLOT_H

  // Build SVG path
  const points = sorted.map((m, i) => ({ x: toX(i), y: toY(Number(m.value)) }))
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  const latestFlagged = sorted[sorted.length - 1]?.is_flagged ?? false
  const latestValue = sorted[sorted.length - 1]
  const lineColor = latestFlagged ? '#EF4444' : '#0EA5E9'

  const first = values[0]
  const last = values[values.length - 1]
  const trend = values.length > 1
    ? last > first ? 'up' : last < first ? 'down' : 'flat'
    : 'flat'
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
  const trendColor = latestFlagged ? '#EF4444' : trend === 'flat' ? '#94A3B8' : '#22C55E'

  // Y-axis ticks (3 labels)
  const yTicks = [yMin, (yMin + yMax) / 2, yMax].map((v) => ({
    value: v,
    y: toY(v),
    label: v.toFixed(1),
  }))

  // X-axis ticks (up to 4 labels)
  const xStep = Math.max(1, Math.ceil(sorted.length / 4))
  const xTicks = sorted
    .map((m, i) => ({ i, m }))
    .filter(({ i }) => i % xStep === 0 || i === sorted.length - 1)
    .map(({ i, m }) => ({
      x: toX(i),
      label: new Date(m.recorded_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    }))

  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
      {/* Header */}
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
          <Text className="text-lg font-bold" style={{ color: trendColor }}>{trendIcon}</Text>
        </View>
      </View>

      {/* Latest value */}
      {latestValue && (
        <Text className="text-slate-500 text-sm mb-2">
          Latest:{' '}
          <Text className={`font-semibold ${latestFlagged ? 'text-red-500' : 'text-slate-900'}`}>
            {latestValue.value} {latestValue.unit}
          </Text>
          {latestValue.reference_min != null && latestValue.reference_max != null && (
            <Text className="text-slate-400">
              {' '}(ref: {latestValue.reference_min}–{latestValue.reference_max})
            </Text>
          )}
        </Text>
      )}

      {/* Chart */}
      {points.length > 1 ? (
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid lines */}
          {yTicks.map((t) => (
            <Line
              key={t.value}
              x1={PAD.left}
              y1={t.y}
              x2={CHART_WIDTH - PAD.right}
              y2={t.y}
              stroke="#F1F5F9"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          ))}

          {/* Y-axis labels */}
          {yTicks.map((t) => (
            <SvgText
              key={t.value}
              x={PAD.left - 4}
              y={t.y + 3}
              fontSize={8}
              fill="#94A3B8"
              textAnchor="end"
            >
              {t.label}
            </SvgText>
          ))}

          {/* X-axis labels */}
          {xTicks.map((t) => (
            <SvgText
              key={t.x}
              x={t.x}
              y={CHART_HEIGHT - 4}
              fontSize={8}
              fill="#94A3B8"
              textAnchor="middle"
            >
              {t.label}
            </SvgText>
          ))}

          {/* Line */}
          <Path d={pathD} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinejoin="round" />

          {/* Dots */}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={4} fill={lineColor} />
          ))}
        </Svg>
      ) : (
        <View className="py-3">
          <Text className="text-slate-400 text-xs text-center">Upload more reports to see trends</Text>
        </View>
      )}

      <Text className="text-xs text-slate-400 mt-1">
        {metrics.length} reading{metrics.length !== 1 ? 's' : ''}
      </Text>
    </View>
  )
}
