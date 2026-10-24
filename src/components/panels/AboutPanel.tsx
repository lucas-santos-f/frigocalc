import { Card } from '../ui/Field'
import { useT } from '../../hooks'

export function AboutPanel() {
  const t = useT()
  return (
    <div className="grid">
      <Card title={t('about.title')} className="span-2">
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
      <Card title="Fórmulas principais / Key formulas" className="span-2">
        <div className="prose mono" style={{ fontSize: '0.82rem' }}>
          <p>Q_trans = U·A·(T_ext + ΔT_solar − T_int) ; U = 1 / (R_sup + e/k)</p>
          <p>Q_porta = 0,221·A·(h_i − h_r)·ρ_r·(1 − ρ_i/ρ_r)^0,5·(g·H)^0,5·F_m · D_t·D_f·(1 − E)  (Gosney–Tanner, ASHRAE)</p>
          <p>Δh_produto = cp_a·(T_in − T_cong) + L + cp_b·(T_cong − T_out) ; Q = m·Δh / t_pulldown</p>
          <p>Q_pessoa = 270 − 6·T_int [W] ; renovações/dia ≈ 196·V^−0,534 (×0,8 se T &lt; 0 °C)</p>
          <p>ṁ = Q_evap/(h₁ − h₄) ; W = ṁ·(h₂ − h₁) ; h₂ = h₁ + (h₂ₛ − h₁)/η_is ; COP = Q_evap/W ; V̇_desl = ṁ·v₁/η_vol</p>
          <p>Duplo estágio: ṁ_HP = ṁ_LP·(h₂ − h₇)/(h₃ − h₆) ; P_int = √(P_evap·P_cond)</p>
          <p>CO₂ P_gc,ót [bar] = (2,778 − 0,0157·T_evap)·T_gc + 0,381·T_evap − 9,34  (Liao, Zhao & Jakobsen)</p>
          <p>Ventilação de emergência: Q [L/s] = 70·√G [kg] (ASHRAE 15 §8.11.5) ; contínua 2,5 L/s·m²</p>
          <p>kVA = kW/FP ; I = kVA·1000/(√3·V)</p>
        </div>
      </Card>
    </div>
  )
}
