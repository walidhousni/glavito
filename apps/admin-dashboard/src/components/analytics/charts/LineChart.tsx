'use client'

import React from 'react'
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory'
import { chartTheme, chartColors } from '@/lib/chart-theme'
import { useTheme } from 'next-themes'

interface DataPoint {
  x: Date | string | number
  y: number
  label?: string
}

interface LineChartProps {
  data: DataPoint[]
  color?: string
  height?: number
  showGrid?: boolean
  showTooltip?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
  formatX?: (value: any) => string
  formatY?: (value: number) => string
}

export function LineChart({
  data,
  color = chartColors.blue,
  height = 300,
  showGrid = true,
  showTooltip = true,
  xAxisLabel,
  yAxisLabel,
  formatX,
  formatY
}: LineChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Transform data for Victory
  const chartData = data.map(point => ({
    x: point.x instanceof Date ? point.x.getTime() : point.x,
    y: point.y,
    label: point.label || `${point.y}`
  }))

  return (
    <div style={{ width: '100%', height }}>
      <VictoryChart
        height={height}
        padding={{ top: 20, bottom: 60, left: 60, right: 20 }}
        containerComponent={
          showTooltip ? (
            <VictoryVoronoiContainer
              labels={({ datum }) => formatY ? formatY(datum.y) : datum.label}
              labelComponent={
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
              }
            />
          ) : undefined
        }
      >
        <VictoryAxis
          style={{
            ...chartTheme.axis.style,
            grid: showGrid ? chartTheme.axis.style.grid : { stroke: 'none' }
          }}
          tickFormat={formatX || ((t) => {
            if (typeof t === 'number' && t > 1000000000000) {
              return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
            return String(t)
          })}
          label={xAxisLabel}
        />
        <VictoryAxis
          dependentAxis
          style={{
            ...chartTheme.axis.style,
            grid: showGrid ? chartTheme.axis.style.grid : { stroke: 'none' }
          }}
          tickFormat={formatY || ((y) => String(y))}
          label={yAxisLabel}
        />
        <VictoryLine
          data={chartData}
          style={{
            data: {
              stroke: color,
              strokeWidth: 2.5,
              strokeLinecap: 'round'
            }
          }}
          interpolation="monotoneX"
        />
      </VictoryChart>
    </div>
  )
}

