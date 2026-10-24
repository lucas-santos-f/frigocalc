import { useMemo } from 'react'
import { EChart, type EChartsCoreOption } from './EChart'
import { PALETTE, chartColors } from './theme'
import type { LoadGroup, LoadResult } from '../../engine/types'
import { useT, useTheme, useUnits } from '../../hooks'
import { toDisplay, unitLabel } from '../../units'

const GROUP_ORDER: LoadGroup[] = ['transmission', 'infiltration', 'product', 'internal', 'ventilation', 'direct']
const GROUP_COLOR: Record<LoadGroup, string> = { transmission: PALETTE[0], infiltration: PALETTE[1], product: PALETTE[2], internal: PALETTE[3], ventilation: PALETTE[4], direct: PALETTE[5] }

export function LoadDonut({ load }: { load: LoadResult }) {
  const t = useT()
  const theme = useTheme()
  const option = useMemo<EChartsCoreOption>(() => {
    const c = chartColors(theme)
    const data = GROUP_ORDER.filter((g) => load.byGroup[g] > 0).map((g) => ({ name: t(`load.group.${g}`), value: Math.round(load.byGroup[g] * 10) / 10, itemStyle: { color: GROUP_COLOR[g] } }))
    return {
      animation: false,
      tooltip: { trigger: 'item', formatter: (p: { name: string; value: number; percent: number }) => `${p.name}: ${p.value.toLocaleString()} kWh/dia (${p.percent.toFixed(0)} %)` },
      legend: { bottom: 0, textStyle: { color: c.text, fontSize: 11 } },
      series: [{ type: 'pie', radius: ['42%', '70%'], center: ['50%', '45%'], data, label: { formatter: '{d}%', color: c.text, fontSize: 11 }, itemStyle: { borderColor: c.surface, borderWidth: 2 } }],
    }
  }, [load, t, theme])
  return <EChart option={option} className="chart short" />
}

export function LoadBars({ load }: { load: LoadResult }) {
  const t = useT()
  const theme = useTheme()
  const { sys } = useUnits()
  const option = useMemo<EChartsCoreOption>(() => {
    const c = chartColors(theme)
    const items = load.items.slice().sort((a, b) => a.kWSizing - b.kWSizing)
    const names = items.map((i) => (i.label ? (i.label.startsWith('prod.') || i.label.startsWith('direct.') ? t(i.label) : i.label) : t(i.labelKey)))
    return {
      animation: false,
      grid: { left: 8, right: 60, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${v.toFixed(2)} ${unitLabel('power', sys)}` },
      xAxis: { type: 'value', name: unitLabel('power', sys), axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.grid, opacity: 0.5 } } },
      yAxis: { type: 'category', data: names, axisLabel: { color: c.text, fontSize: 11, width: 140, overflow: 'truncate' }, axisLine: { lineStyle: { color: c.grid } } },
      series: [
        {
          type: 'bar',
          data: items.map((i) => ({ value: Math.round(toDisplay('power', i.kWSizing, sys) * 100) / 100, itemStyle: { color: GROUP_COLOR[i.group] } })),
          label: { show: true, position: 'right', color: c.text, fontSize: 10, formatter: (p: { value: number }) => p.value.toFixed(1) },
          barMaxWidth: 22,
        },
      ],
    }
  }, [load, t, theme, sys])
  const h = Math.max(220, 26 * load.items.length + 40)
  return (
    <div style={{ height: h }}>
      <EChart option={option} className="chart" />
    </div>
  )
}
