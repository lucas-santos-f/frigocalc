import { useMemo } from 'react'
import { EChart, type EChartsCoreOption } from './EChart'
import { chartColors } from './theme'
import { useT, useTheme, useUnits } from '../../hooks'
import { toDisplay, unitLabel } from '../../units'

export interface CompareRow {
  id: string
  name: string
  color: string
  safety: string
  gwp: number
  ok: boolean
  cop: number
  W: number
  Tdis: number
  Vdisp: number
  mode: string
}

export function CopBars({ rows, highlight }: { rows: CompareRow[]; highlight: string }) {
  const t = useT()
  const theme = useTheme()
  const option = useMemo<EChartsCoreOption>(() => {
    const c = chartColors(theme)
    const data = rows.filter((r) => r.ok).sort((a, b) => a.cop - b.cop)
    return {
      animation: false,
      grid: { left: 8, right: 50, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps: { name: string; value: number }[]) => `${ps[0].name}: COP ${ps[0].value.toFixed(2)}` },
      xAxis: { type: 'value', name: t('cyc.cop'), axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.grid, opacity: 0.5 } } },
      yAxis: { type: 'category', data: data.map((r) => r.id), axisLabel: { color: c.text, fontSize: 11 } },
      series: [
        {
          type: 'bar',
          barMaxWidth: 20,
          data: data.map((r) => ({ value: Math.round(r.cop * 100) / 100, itemStyle: { color: r.id === highlight ? '#dc2626' : r.color, opacity: r.id === highlight ? 1 : 0.85 } })),
          label: { show: true, position: 'right', color: c.text, fontSize: 10, formatter: (p: { value: number }) => p.value.toFixed(2) },
        },
      ],
    }
  }, [rows, highlight, t, theme])
  return (
    <div style={{ height: Math.max(240, 24 * rows.filter((r) => r.ok).length + 40) }}>
      <EChart option={option} className="chart" />
    </div>
  )
}

export function CopGwpScatter({ rows, highlight }: { rows: CompareRow[]; highlight: string }) {
  const t = useT()
  const theme = useTheme()
  const { sys } = useUnits()
  const option = useMemo<EChartsCoreOption>(() => {
    const c = chartColors(theme)
    const data = rows.filter((r) => r.ok)
    return {
      animation: false,
      grid: { left: 52, right: 24, top: 24, bottom: 44 },
      tooltip: { trigger: 'item', formatter: (p: { data: { name: string; value: number[]; Tdis: number; safety: string } }) => `<b>${p.data.name}</b> (${p.data.safety})<br/>GWP ${p.data.value[0]} · COP ${p.data.value[1].toFixed(2)}<br/>${t('cyc.Tdis')}: ${p.data.Tdis.toFixed(0)} ${unitLabel('temp', sys)}` },
      xAxis: { type: 'log', name: 'GWP (AR4)', nameLocation: 'middle', nameGap: 28, min: 0.5, axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.grid, opacity: 0.5 } } },
      yAxis: { type: 'value', name: t('cyc.cop'), axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.grid, opacity: 0.5 } }, scale: true },
      series: [
        {
          type: 'scatter',
          symbolSize: 14,
          data: data.map((r) => ({ name: r.id, value: [Math.max(r.gwp, 0.5), Math.round(r.cop * 1000) / 1000], Tdis: toDisplay('temp', r.Tdis, sys), safety: r.safety, itemStyle: { color: r.id === highlight ? '#dc2626' : r.color, borderColor: c.surface, borderWidth: 1 } })),
          label: { show: true, formatter: (p: { data: { name: string } }) => p.data.name, position: 'right', color: c.text, fontSize: 10 },
        },
      ],
    }
  }, [rows, highlight, t, theme, sys])
  return <EChart option={option} className="chart" />
}
