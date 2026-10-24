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

export function EChart({ option, className = 'chart' }: { option: EChartsCoreOption; className?: string }) {
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
    inst.current?.setOption(
      {
        backgroundColor: 'transparent',
        textStyle: { color: c.text, fontFamily: 'system-ui, sans-serif' },
        ...option,
      },
      { notMerge: true },
    )
  }, [option, theme])

  return <div ref={ref} className={className} role="img" />
}
