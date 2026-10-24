import { useMemo } from 'react'
import { EChart, type EChartsCoreOption } from './EChart'
import { chartColors } from './theme'
import type { Fluid } from '../../engine/props'
import type { CycleResult } from '../../engine/types'
import { useT, useTheme, useUnits } from '../../hooks'
import { toDisplay, unitLabel } from '../../units'

const K0 = 273.15

export function PhDiagram({ fluid, cycle, title }: { fluid: Fluid; cycle: CycleResult; title?: string }) {
  const t = useT()
  const theme = useTheme()
  const { sys } = useUnits()

  const option = useMemo<EChartsCoreOption>(() => {
    const c = chartColors(theme)
    const pts = cycle.path
    const Pmin = Math.min(...pts.map((p) => p.P)) / 2.2
    const Pmax = Math.min(Math.max(...pts.map((p) => p.P)) * 2.5, fluid.pressureGrid[fluid.pressureGrid.length - 1])
    const dome = fluid.dome()
    const inRange = (p: number) => p >= Pmin && p <= Pmax
    const liquid = dome.liquid.filter(([, P]) => inRange(P))
    const vapor = dome.vapor.filter(([, P]) => inRange(P))
    const hMin = Math.min(...liquid.map(([h]) => h), ...pts.map((p) => p.h)) - 40
    const hMax = Math.max(...vapor.map(([h]) => h), ...pts.map((p) => p.h)) + 60
    const cx = (h: number) => toDisplay('enthalpy', h, sys)
    const cy = (P: number) => toDisplay('pressure', P, sys)

    // isotermas a cada 20 K dentro da janela
    const Tlo = Math.floor((fluid.tDew(Math.max(Pmin, fluid.PminSat)) - K0) / 20) * 20
    const Thi = Math.ceil((Math.max(...pts.map((p) => p.T)) - K0 + 20) / 20) * 20
    const isoSeries: object[] = []
    for (let Tc = Tlo; Tc <= Thi; Tc += 20) {
      const data = fluid
        .isotherm(Tc + K0)
        .filter(([h, P]) => inRange(P) && h >= hMin && h <= hMax)
        .map(([h, P]) => [cx(h), cy(P)])
      if (data.length < 2) continue
      isoSeries.push({
        type: 'line',
        name: `${Tc} °C`,
        data,
        symbol: 'none',
        lineStyle: { color: c.muted, width: 0.7, opacity: 0.55, type: 'dashed' },
        tooltip: { show: false },
        silent: true,
        endLabel: { show: true, formatter: `${Tc}°`, color: c.muted, fontSize: 10, offset: [2, 0] },
        z: 1,
      })
    }

    const cyclePath = pts.map((p) => ({ value: [cx(p.h), cy(p.P)], name: p.id, T: p.T - K0, x: p.x }))
    return {
      animation: false,
      title: title ? { text: title, left: 'center', textStyle: { fontSize: 13, color: c.text } } : undefined,
      grid: { left: 58, right: 36, top: title ? 36 : 16, bottom: 46 },
      tooltip: {
        trigger: 'item',
        formatter: (p: { seriesName: string; data: { value: number[]; name?: string; T?: number; x?: number } }) => {
          if (!p.data || !Array.isArray(p.data.value)) return ''
          const [h, P] = p.data.value
          const extra = p.data.T !== undefined ? `<br/>T = ${p.data.T.toFixed(1)} °C${p.data.x !== undefined && p.data.x < 1 ? ` · x = ${p.data.x.toFixed(2)}` : ''}` : ''
          return `<b>${p.data.name ?? p.seriesName}</b><br/>h = ${h.toFixed(1)} ${unitLabel('enthalpy', sys)}<br/>P = ${P.toFixed(2)} ${unitLabel('pressure', sys)}${extra}`
        },
      },
      xAxis: { type: 'value', name: `${t('cyc.ph_x')} (${unitLabel('enthalpy', sys)})`, nameLocation: 'middle', nameGap: 28, min: cx(hMin), max: cx(hMax), axisLine: { lineStyle: { color: c.grid } }, splitLine: { lineStyle: { color: c.grid, opacity: 0.5 } }, axisLabel: { color: c.muted } },
      yAxis: { type: 'log', name: `${t('cyc.ph_y')} (${unitLabel('pressure', sys)})`, min: cy(Pmin), max: cy(Pmax), axisLine: { lineStyle: { color: c.grid } }, splitLine: { lineStyle: { color: c.grid, opacity: 0.5 } }, axisLabel: { color: c.muted, formatter: (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1)) } },
      series: [
        { type: 'line', name: 'liq', data: liquid.map(([h, P]) => [cx(h), cy(P)]), symbol: 'none', smooth: true, lineStyle: { color: c.accent, width: 2 }, tooltip: { show: false }, silent: true, z: 2 },
        { type: 'line', name: 'vap', data: vapor.map(([h, P]) => [cx(h), cy(P)]), symbol: 'none', smooth: true, lineStyle: { color: c.accent, width: 2 }, tooltip: { show: false }, silent: true, z: 2 },
        ...isoSeries,
        {
          type: 'line',
          name: cycle.fluid,
          data: cyclePath,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#dc2626', width: 2.5 },
          itemStyle: { color: '#dc2626', borderColor: c.surface, borderWidth: 1.5 },
          label: { show: true, formatter: (p: { data: { name: string } }) => p.data.name, position: 'top', color: c.text, fontWeight: 'bold', fontSize: 11 },
          z: 5,
        },
      ],
    }
  }, [fluid, cycle, sys, theme, t, title])

  return <EChart option={option} className="chart tall" />
}
