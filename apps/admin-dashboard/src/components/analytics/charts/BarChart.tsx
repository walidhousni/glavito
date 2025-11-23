'use client'

import React from 'react'
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTooltip } from 'victory'
import { chartTheme, chartColors } from '@/lib/chart-theme'
import { useTheme } from 'next-themes'

interface DataPoint {
  x: string | number
  y: number
  label?: string
}

interface BarChartProps {
  data: DataPoint[]
  color?: string
  height?: number
  showGrid?: boolean
  showTooltip?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
  formatX?: (value: any) => string
  formatY?: (value: number) => string
  horizontal?: boolean
}

export function BarChart({
  data,
  color = chartColors.blue,
  height = 300,
  showGrid = true,
  showTooltip = true,
  xAxisLabel,
  yAxisLabel,
  formatX,
  formatY,
  horizontal = false
}: BarChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Transform data for Victory
  const chartData = data.map(point => ({
    x: point.x,
    y: point.y,
    label: point.label || `${point.y}`
  }))

  return (
    <div style={{ width: '100%', height }}>
      <VictoryChart
        height={height}
        padding={{ top: 20, bottom: 60, left: 60, right: 20 }}
        domainPadding={{ x: 20 }}
      >
        <VictoryAxis
          style={{
            ...chartTheme.axis.style,
            grid: showGrid && !horizontal ? chartTheme.axis.style.grid : { stroke: 'none' }
          }}
          tickFormat={formatX || ((t) => String(t))}
          label={xAxisLabel}
        />
        <VictoryAxis
          dependentAxis={!horizontal}
          style={{
            ...chartTheme.axis.style,
            grid: showGrid && horizontal ? chartTheme.axis.style.grid : { stroke: 'none' }
          }}
          tickFormat={formatY || ((y) => String(y))}
          label={yAxisLabel}
        />
        <VictoryBar
          data={chartData}
          horizontal={horizontal}
          style={{
            data: {
              fill: color,
              width: 24
            }
          }}
          labels={showTooltip ? ({ datum }) => formatY ? formatY(datum.y) : datum.label : undefined}
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
          cornerRadius={{ top: 4 }}
        />
      </VictoryChart>
    </div>
  )
}

