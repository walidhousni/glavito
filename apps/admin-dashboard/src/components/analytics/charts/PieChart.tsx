'use client'

import React from 'react'
import { VictoryPie, VictoryTooltip } from 'victory'
import { chartColors } from '@/lib/chart-theme'
import { useTheme } from 'next-themes'

interface DataPoint {
  x: string
  y: number
  label?: string
}

interface PieChartProps {
  data: DataPoint[]
  colors?: string[]
  height?: number
  showTooltip?: boolean
  innerRadius?: number
  formatValue?: (value: number) => string
}

export function PieChart({
  data,
  colors = chartColors.primary,
  height = 300,
  showTooltip = true,
  innerRadius = 0,
  formatValue
}: PieChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const chartData = data.map(point => ({
    x: point.x,
    y: point.y,
    label: point.label || `${point.x}: ${point.y}`
  }))

  return (
    <div style={{ width: '100%', height }} className="flex items-center justify-center">
      <VictoryPie
        data={chartData}
        colorScale={colors}
        innerRadius={innerRadius}
        height={height}
        padding={{ top: 20, bottom: 20, left: 80, right: 80 }}
        style={{
          data: {
            stroke: isDark ? '#0f172a' : '#ffffff',
            strokeWidth: 2
          },
          labels: {
            fill: isDark ? '#e2e8f0' : '#1e293b',
            fontSize: 12,
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }
        }}
        labels={({ datum }) => {
          const total = data.reduce((sum, d) => sum + d.y, 0)
          const percentage = total > 0 ? ((datum.y / total) * 100).toFixed(1) : '0'
          return `${datum.x}\n${percentage}%`
        }}
        labelComponent={
          showTooltip ? (
            <VictoryTooltip
              flyoutStyle={{
                fill: isDark ? '#1e293b' : '#ffffff',
                stroke: isDark ? '#334155' : '#e2e8f0',
                strokeWidth: 1
              }}
              style={{
                fill: isDark ? '#e2e8f0' : '#1e293b',
                fontSize: 12,
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            />
          ) : undefined
        }
      />
    </div>
  )
}

