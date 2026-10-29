import type { CycleResult, StatePoint } from '../../engine/types'
import { useT, useUnits } from '../../hooks'

const K0 = 273.15
// loop corners in viewBox units; point 1 is bottom right and the flow runs 1 → 2 → 3 → 4
const L = 84
const R = 316
const T = 66
const B = 190
const MID = (T + B) / 2
const BOX_L = 150
const BOX_R = 250

function coil(y: number): string {
  const pts: string[] = []
  for (let x = BOX_L + 8, i = 0; x <= BOX_R - 8; x += 7, i++) pts.push(`${x},${y + (i % 2 ? 6 : -6)}`)
  return `M${BOX_L + 8},${y} L${pts.join(' L')} L${BOX_R - 8},${y}`
}

// chevron pointing in the flow direction
function arrow(x: number, y: number, dir: 'up' | 'down' | 'left' | 'right'): string {
  const s = 5
  if (dir === 'left') return `M${x + s},${y - s} L${x - 2},${y} L${x + s},${y + s}`
  if (dir === 'right') return `M${x - s},${y - s} L${x + 2},${y} L${x - s},${y + s}`
  if (dir === 'up') return `M${x - s},${y + s} L${x},${y - 2} L${x + s},${y + s}`
  return `M${x - s},${y - s} L${x},${y + 2} L${x + s},${y - s}`
}

// Plain picture of a single-stage loop with the live state of each point.
export function CycleSchematic({ cycle }: { cycle: CycleResult }) {
  const t = useT()
  const u = useUnits()
  const [p1, p2, p3, p4] = cycle.points
  const gasCooler = cycle.system === 'transcritical'

  const values = (p: StatePoint, x: number, y: number, anchor: 'start' | 'end') => (
    <text x={x} y={y} textAnchor={anchor} className="num">
      <tspan x={x}>{u.show('pressure', p.P, 1)}</tspan>
      <tspan x={x} dy={15}>
        {u.show('temp', p.T - K0, 0)}
      </tspan>
    </text>
  )
  const point = (id: string, x: number, y: number) => (
    <g className="pt">
      <circle cx={x} cy={y} r={9} />
      <text x={x} y={y + 3.5} textAnchor="middle">
        {id}
      </text>
    </g>
  )

  return (
    <div className="schematic-wrap">
      <svg className="schematic" viewBox="0 0 400 250" role="img" aria-label={t('sch.title')}>
        <g className="hot line">
          <path d={`M${R},${MID - 18} V${T} H${BOX_R}`} />
          <path d={`M${BOX_L},${T} H${L} V${MID - 11}`} />
          <path d={arrow(284, T, 'left')} />
          <path d={arrow(L, 102, 'down')} />
        </g>
        <g className="cold line">
          <path d={`M${L},${MID + 11} V${B} H${BOX_L}`} />
          <path d={`M${BOX_R},${B} H${R} V${MID + 18}`} />
          <path d={arrow(116, B, 'right')} />
          <path d={arrow(R, 158, 'up')} />
        </g>

        <rect className="box hot" x={BOX_L} y={T - 13} width={BOX_R - BOX_L} height={26} rx={6} />
        <path className="hot line thin" d={coil(T)} />
        <text x={200} y={T - 40} textAnchor="middle" className="name">
          {t(gasCooler ? 'sch.gas_cooler' : 'sch.condenser')}
        </text>
        <text x={200} y={T - 23} textAnchor="middle" className="dim num">
          ↑ {u.show('power', cycle.Qcond, 1)} {t('sch.heat_out')}
        </text>

        <rect className="box cold" x={BOX_L} y={B - 13} width={BOX_R - BOX_L} height={26} rx={6} />
        <path className="cold line thin" d={coil(B)} />
        <text x={200} y={B + 31} textAnchor="middle" className="dim num">
          ↑ {u.show('power', cycle.Qevap, 1)} {t('sch.heat_in')}
        </text>
        <text x={200} y={B + 48} textAnchor="middle" className="name">
          {t('sch.evaporator')}
        </text>

        <circle className="part" cx={R} cy={MID} r={18} />
        <path className="part" d={`M${R - 10},${MID + 10} L${R - 5},${MID - 10} M${R + 10},${MID + 10} L${R + 5},${MID - 10}`} />
        <text x={R - 26} y={MID - 2} textAnchor="end" className="part-name">
          {t('sch.compressor')}
        </text>
        <text x={R - 26} y={MID + 13} textAnchor="end" className="dim num">
          {u.show('power', cycle.Wtotal, 1)}
        </text>

        <path className="part" d={`M${L - 10},${MID - 11} H${L + 10} L${L - 10},${MID + 11} H${L + 10} Z`} />
        <text x={L + 16} y={MID + 4} className="part-name">
          {t('sch.valve')}
        </text>

        <text x={L + 14} y={T + 22} className="tag hot">
          {t('sch.high')}
        </text>
        <text x={L + 14} y={B - 21} className="tag cold">
          {t('sch.low')}
        </text>

        {values(p2, R + 16, T - 3, 'start')}
        {values(p1, R + 16, B - 3, 'start')}
        {values(p3, L - 16, T - 3, 'end')}
        {values(p4, L - 16, B - 3, 'end')}
        {point(p1.id, R, B)}
        {point(p2.id, R, T)}
        {point(p3.id, L, T)}
        {point(p4.id, L, B)}
      </svg>
    </div>
  )
}
