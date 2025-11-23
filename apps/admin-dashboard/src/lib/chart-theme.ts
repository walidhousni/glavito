export const chartColors = {
  primary: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'],
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#10b981',
  orange: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  slate: '#64748b'
}

export const chartTheme = {
  // Victory chart theme
  axis: {
    style: {
      axis: {
        stroke: '#e2e8f0',
        strokeWidth: 1
      },
      axisLabel: {
        fontSize: 12,
        padding: 36,
        fill: '#64748b',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      },
      grid: {
        stroke: '#e2e8f0',
        strokeDasharray: '4,4',
        strokeWidth: 0.5
      },
      ticks: {
        stroke: '#e2e8f0',
        size: 5
      },
      tickLabels: {
        fontSize: 11,
        padding: 8,
        fill: '#64748b',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    }
  },
  bar: {
    style: {
      data: {
        fill: chartColors.blue,
        padding: 8,
        strokeWidth: 0
      },
      labels: {
        fontSize: 11,
        fill: '#64748b',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    }
  },
  line: {
    style: {
      data: {
        fill: 'transparent',
        stroke: chartColors.blue,
        strokeWidth: 2.5
      },
      labels: {
        fontSize: 11,
        fill: '#64748b',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    }
  },
  area: {
    style: {
      data: {
        fill: chartColors.blue,
        fillOpacity: 0.1,
        stroke: chartColors.blue,
        strokeWidth: 2.5
      }
    }
  },
  pie: {
    style: {
      data: {
        padding: 8,
        stroke: '#ffffff',
        strokeWidth: 2
      },
      labels: {
        fontSize: 11,
        fill: '#64748b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 20
      }
    },
    colorScale: chartColors.primary
  },
  scatter: {
    style: {
      data: {
        fill: chartColors.blue,
        opacity: 0.7,
        stroke: 'transparent',
        strokeWidth: 0
      }
    }
  }
}

// Dark theme variant
export const darkChartTheme = {
  ...chartTheme,
  axis: {
    style: {
      axis: {
        stroke: '#334155',
        strokeWidth: 1
      },
      axisLabel: {
        fontSize: 12,
        padding: 36,
        fill: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      },
      grid: {
        stroke: '#334155',
        strokeDasharray: '4,4',
        strokeWidth: 0.5
      },
      ticks: {
        stroke: '#334155',
        size: 5
      },
      tickLabels: {
        fontSize: 11,
        padding: 8,
        fill: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    }
  },
  bar: {
    style: {
      data: {
        fill: chartColors.blue,
        padding: 8,
        strokeWidth: 0
      },
      labels: {
        fontSize: 11,
        fill: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    }
  },
  line: {
    style: {
      data: {
        fill: 'transparent',
        stroke: chartColors.blue,
        strokeWidth: 2.5
      },
      labels: {
        fontSize: 11,
        fill: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    }
  },
  pie: {
    style: {
      data: {
        padding: 8,
        stroke: '#0f172a',
        strokeWidth: 2
      },
      labels: {
        fontSize: 11,
        fill: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 20
      }
    },
    colorScale: chartColors.primary
  }
}

