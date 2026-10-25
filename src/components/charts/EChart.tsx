import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import { GridComponent, LegendComponent, MarkLineComponent, MarkPointComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { useTheme } from '../../hooks'
import { chartColors } from './theme'

echarts.use([BarChart, LineChart, PieChart, ScatterChart, GridComponent, LegendComponent, MarkLineComponent, MarkPointComponent, TitleComponent, TooltipComponent, CanvasRenderer])

export type { EChartsCoreOption }

export function EChart({ option, className = 'chart', height }: { option: EChartsCoreOption; className?: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inst = useRef<echarts.ECharts | null>(null)
  const theme = useTheme()

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    inst.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      inst.current = null
    }
  }, [])

  useEffect(() => {
    const c = chartColors(theme)
    const tip: unknown = option.tooltip
    // shared tooltip look; each chart still decides trigger and formatter
    const tooltip =
      tip && typeof tip === 'object' && !Array.isArray(tip)
        ? {
            backgroundColor: c.surface,
            borderColor: c.grid,
            borderWidth: 1,
            padding: [8, 12],
            textStyle: { color: c.text, fontSize: 12 },
            extraCssText: 'border-radius:10px;box-shadow:0 12px 32px -12px rgba(15,23,42,.28);',
            ...tip,
          }
        : tip
    inst.current?.setOption(
      {
        backgroundColor: 'transparent',
        textStyle: { color: c.text, fontFamily: getComputedStyle(document.body).fontFamily },
        ...option,
        ...(tooltip !== undefined && { tooltip }),
      },
      { notMerge: true },
    )
  }, [option, theme])

  return <div ref={ref} className={className} style={height ? { height } : undefined} role="img" />
}
