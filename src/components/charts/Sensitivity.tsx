import { useMemo } from 'react'
import { EChart, type EChartsCoreOption } from './EChart'
import { chartColors } from './theme'
import { useT, useTheme, useUnits } from '../../hooks'
import { toDisplay, unitLabel } from '../../units'

export interface SweepPoint {
  x: number
  COP: number
  W: number
  Tdis: number
}

export function SensitivityChart({ data, xLabel, current }: { data: SweepPoint[]; xLabel: string; current: number }) {
  const t = useT()
  const theme = useTheme()
  const { sys } = useUnits()
  const option = useMemo<EChartsCoreOption>(() => {
    const c = chartColors(theme)
    const xs = data.map((d) => Math.round(toDisplay('temp', d.x, sys) * 10) / 10)
    return {
      animation: false,
      grid: { left: 48, right: 56, top: 30, bottom: 40 },
      legend: { top: 0, textStyle: { color: c.text, fontSize: 11 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xs, name: `${xLabel} (${unitLabel('temp', sys)})`, nameLocation: 'middle', nameGap: 26, axisLabel: { color: c.muted }, axisLine: { lineStyle: { color: c.grid } } },
      yAxis: [
        { type: 'value', name: t('cyc.cop'), axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.grid, opacity: 0.5 } } },
        { type: 'value', name: unitLabel('power', sys), axisLabel: { color: c.muted }, splitLine: { show: false } },
      ],
      series: [
        { type: 'line', name: t('cyc.cop'), data: data.map((d) => Math.round(d.COP * 1000) / 1000), smooth: true, symbol: 'none', lineStyle: { width: 2.5, color: c.primary }, itemStyle: { color: c.primary }, markLine: { symbol: 'none', data: [{ xAxis: String(Math.round(toDisplay('temp', current, sys) * 10) / 10) }], lineStyle: { color: '#dc2626', type: 'dashed' }, label: { show: false } } },
        { type: 'line', name: t('cyc.W'), yAxisIndex: 1, data: data.map((d) => Math.round(toDisplay('power', d.W, sys) * 100) / 100), smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#d97706' }, itemStyle: { color: '#d97706' } },
        { type: 'line', name: t('cyc.Tdis'), yAxisIndex: 1, data: data.map((d) => Math.round(toDisplay('temp', d.Tdis, sys) * 10) / 10), smooth: true, symbol: 'none', lineStyle: { width: 1, color: c.muted, type: 'dotted' }, itemStyle: { color: c.muted } },
      ],
    }
  }, [data, xLabel, current, t, theme, sys])
  return <EChart option={option} className="chart short" />
}
