import { Card } from '../ui/Field'
import { useT } from '../../hooks'

const FORMULAS = [
  'Q_trans = U·A·(T_ext + ΔT_solar − T_int),  U = 1 / (R_surf + e/k)',
  'Q_door = 0.221·A·(h_i − h_r)·ρ_r·(1 − ρ_i/ρ_r)^0.5·(g·H)^0.5·F_m·D_t·D_f·(1 − E)   (Gosney–Tanner, ASHRAE)',
  'Δh_product = cp_above·(T_in − T_freeze) + L + cp_below·(T_freeze − T_out),  Q = m·Δh / t_pulldown',
  'Q_person = 270 − 6·T_int [W],  air changes/day ≈ 196·V^−0.534  (×0.8 below 0 °C)',
  'ṁ = Q_evap / (h₁ − h₄),  W = ṁ·(h₂ − h₁),  h₂ = h₁ + (h₂ₛ − h₁) / η_is,  COP = Q_evap / W,  V̇_disp = ṁ·v₁ / η_vol',
  'Two-stage: ṁ_HP = ṁ_LP·(h₂ − h₇) / (h₃ − h₆),  P_int = √(P_evap·P_cond)',
  'CO₂: P_gc,opt [bar] = (2.778 − 0.0157·T_evap)·T_gc + 0.381·T_evap − 9.34   (Liao, Zhao & Jakobsen)',
  'Emergency ventilation: Q [L/s] = 70·√G [kg]  (ASHRAE 15 §8.11.5),  continuous 2.5 L/s·m²',
  'kVA = kW / PF,  I = kVA·1000 / (√3·V)',
]

export function AboutPanel() {
  const t = useT()
  return (
    <div className="grid wide">
      <Card title={t('about.title')}>
        <div className="prose">
          <p>{t('about.p1')}</p>
          <p>{t('about.p2')}</p>
          <p>{t('about.p3')}</p>
          <p>{t('about.p4')}</p>
          <p>
            <b>{t('about.disclaimer')}</b>
          </p>
          <p className="muted">{t('about.privacy')}</p>
          <p className="muted">{t('about.sources')}</p>
        </div>
      </Card>
      <Card title={t('about.formulas')}>
        <ul className="formulas">
          {FORMULAS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
