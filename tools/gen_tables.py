"""
Generate refrigerant property tables with CoolProp.
Output: src/data/tables/<fluid>.json (compact) and src/data/tables/_reference.json (test points).

Usage:  python tools/gen_tables.py [--only R134a,R717]
Needs:  pip install -r tools/requirements.txt  (CoolProp >= 8.0)

Conventions:
  P in kPa, T in K, h in kJ/kg, s in kJ/(kg.K), rho in kg/m3.
  The saturation table is indexed by pressure (Tb = bubble, Td = dew) so blends with glide work.
  The superheated / supercritical grid is indexed by pressure; subcritical rows start at the dew point.
"""
import json
import math
import os
import sys
import time

import CoolProp.CoolProp as CP

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "src", "data", "tables"))
os.makedirs(OUT, exist_ok=True)

FLUIDS = {
    # id: (backend, components, mass fractions); None means a pure or pseudo-pure fluid
    "R717": ("HEOS", "Ammonia", None),
    "R744": ("HEOS", "CarbonDioxide", None),
    "R290": ("HEOS", "Propane", None),
    "R1270": ("HEOS", "Propylene", None),
    "R600a": ("HEOS", "IsoButane", None),
    "R134a": ("HEOS", "R134a", None),
    "R22": ("HEOS", "R22", None),
    "R32": ("HEOS", "R32", None),
    "R1234yf": ("HEOS", "R1234yf", None),
    "R1234ze(E)": ("HEOS", "R1234ze(E)", None),
    "R404A": ("HEOS", "R404A", None),
    "R407C": ("HEOS", "R407C", None),
    "R410A": ("HEOS", "R410A", None),
    "R507A": ("HEOS", "R507A", None),
    # blends defined by mass composition (ASHRAE 34)
    "R407F": ("HEOS", "R32&R125&R134a", [0.30, 0.30, 0.40]),
    "R448A": ("HEOS", "R32&R125&R1234yf&R134a&R1234ze(E)", [0.26, 0.26, 0.20, 0.21, 0.07]),
    "R449A": ("HEOS", "R32&R125&R1234yf&R134a", [0.243, 0.247, 0.253, 0.257]),
    "R450A": ("HEOS", "R134a&R1234ze(E)", [0.42, 0.58]),
    "R452A": ("HEOS", "R32&R125&R1234yf", [0.11, 0.59, 0.30]),
    "R454B": ("HEOS", "R32&R1234yf", [0.689, 0.311]),
    "R454C": ("HEOS", "R32&R1234yf", [0.215, 0.785]),
    "R455A": ("HEOS", "CarbonDioxide&R32&R1234yf", [0.03, 0.215, 0.755]),
    "R513A": ("HEOS", "R1234yf&R134a", [0.56, 0.44]),
}

T_MIN_C = {"R744": -56.0, "R717": -70.0}
T_MIN_DEFAULT_C = -80.0
N_SAT = 150
N_P_SH = 60
SH_OFFSETS = [0, 1, 2, 3, 5, 7, 10, 13, 16, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100,
              115, 130, 145, 160, 180, 200, 225, 250, 275, 300]


def rnd(x, nd):
    if x is None:
        return None
    if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
        return None
    return round(x, nd)


def make_state(backend, comps, fracs):
    state = CP.AbstractState(backend, comps)
    if fracs:
        state.set_mass_fractions(fracs)
    return state


def crit_estimate(state, comps, fracs):
    """Critical point: exact for pure fluids, mass-weighted average of the components for blends."""
    if not fracs:
        try:
            tc, pc = state.T_critical(), state.p_critical()
            if tc > 0 and pc > 0:
                return tc, pc, True
        except Exception:
            pass
    names = comps.split("&")
    tc0 = sum(f * CP.PropsSI("Tcrit", n) for f, n in zip(fracs, names))
    pc0 = sum(f * CP.PropsSI("pcrit", n) for f, n in zip(fracs, names))
    return tc0, pc0, False


def sat_props(state, p, q):
    state.update(CP.PQ_INPUTS, p, q)
    return state.T(), state.hmass() / 1e3, state.smass() / 1e3, state.rhomass()


def gen_fluid(fid, backend, comps, fracs):
    t0 = time.time()
    state = make_state(backend, comps, fracs)
    tc, pc, exact = crit_estimate(state, comps, fracs)
    tmin = T_MIN_C.get(fid, T_MIN_DEFAULT_C) + 273.15
    try:
        ttrip = state.Ttriple()
        if ttrip > 0:
            tmin = max(tmin, ttrip + 0.5)
    except Exception:
        pass
    pmin = None
    for d_t in range(0, 80):
        try:
            state.update(CP.QT_INPUTS, 1.0, tmin + d_t)
            pmin = state.p()
            tmin = tmin + d_t
            break
        except Exception:
            continue
    if pmin is None:
        raise RuntimeError(f"{fid}: could not find Pmin")
    tsat_max = tc - (0.3 if exact else 6.0)
    pmax_sat = None
    for _ in range(80):
        try:
            state.update(CP.QT_INPUTS, 1.0, tsat_max)
            pmax_sat = state.p()
            state.update(CP.PQ_INPUTS, pmax_sat, 0.0)
            break
        except Exception:
            tsat_max -= 1.0
    if pmax_sat is None:
        raise RuntimeError(f"{fid}: could not find Pmax_sat")

    # saturation table, log-spaced in P
    sat = {k: [] for k in ("P", "Tb", "Td", "hl", "hv", "sl", "sv", "rl", "rv")}
    logs = [math.log(pmin) + (math.log(pmax_sat) - math.log(pmin)) * i / (N_SAT - 1) for i in range(N_SAT)]
    for lp in logs:
        p = math.exp(lp)
        try:
            td, hv, sv, rv = sat_props(state, p, 1.0)
            tb, hl, sl, rl = sat_props(state, p, 0.0)
        except Exception:
            continue
        if not (rl > rv and hv > hl):
            continue
        sat["P"].append(rnd(p / 1e3, 3))
        sat["Tb"].append(rnd(tb, 3))
        sat["Td"].append(rnd(td, 3))
        sat["hl"].append(rnd(hl, 3))
        sat["hv"].append(rnd(hv, 3))
        sat["sl"].append(rnd(sl, 5))
        sat["sv"].append(rnd(sv, 5))
        sat["rl"].append(rnd(rl, 3))
        sat["rv"].append(rnd(rv, 4))

    # superheated / supercritical grid
    if exact:
        pmax_grid = pc * (2.0 if fid == "R744" else 1.3)
    else:
        pmax_grid = pmax_sat * 0.98
    sh = {"P": [], "rows": []}
    logs = [math.log(pmin) + (math.log(pmax_grid) - math.log(pmin)) * i / (N_P_SH - 1) for i in range(N_P_SH)]
    for lp in logs:
        p = math.exp(lp)
        if p < pmax_sat:
            try:
                state.update(CP.PQ_INPUTS, p, 1.0)
                td = state.T()
            except Exception:
                continue
            temps = [td + d for d in SH_OFFSETS]
        else:
            temps = [tc + d for d in range(-40, -10, 5)] + [tc + d for d in range(-10, 31, 1)] + \
                    [tc + d for d in (35, 40, 45, 50, 60, 70, 80, 90, 100, 115, 130, 145, 160, 180, 200, 225, 250, 275, 300)]
        row = {"T": [], "h": [], "s": [], "r": []}
        for temp in temps:
            try:
                state.update(CP.PT_INPUTS, p, temp)
                h, s, rho = state.hmass() / 1e3, state.smass() / 1e3, state.rhomass()
            except Exception:
                continue
            if row["h"] and h <= row["h"][-1]:
                continue  # keep h monotonic in T
            row["T"].append(rnd(temp, 3))
            row["h"].append(rnd(h, 3))
            row["s"].append(rnd(s, 5))
            row["r"].append(rnd(rho, 4))
        if len(row["T"]) >= 4:
            sh["P"].append(rnd(p / 1e3, 3))
            sh["rows"].append(row)
    molar = None
    try:
        molar = state.molar_mass() * 1e3
    except Exception:
        pass
    out = {"id": fid, "Tcrit": rnd(tc, 3), "Pcrit": rnd(pc / 1e3, 3), "critExact": exact, "Tmin": rnd(tmin, 3),
           "M": rnd(molar, 3) if molar else None, "sat": sat, "sh": sh}
    fname = fid.replace("(", "_").replace(")", "") + ".json"
    with open(os.path.join(OUT, fname), "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"{fid:12s} sat={len(sat['P']):3d} shP={len(sh['P']):3d} Tc={tc - 273.15:7.2f}C "
          f"Pc={pc / 1e5:6.2f}bar exact={exact} {time.time() - t0:5.1f}s", flush=True)


def gen_reference():
    """Reference points for the interpolation and cycle unit tests."""
    ref = {}
    cases = [("R134a", 263.15, 313.15), ("R717", 253.15, 308.15), ("R744", 243.15, 268.15),
             ("R290", 263.15, 318.15), ("R404A", 243.15, 313.15)]
    for fid, te, tcond in cases:
        backend, comps, fracs = FLUIDS[fid]
        state = make_state(backend, comps, fracs)
        state.update(CP.QT_INPUTS, 1.0, te)
        pe = state.p()
        state.update(CP.QT_INPUTS, 1.0, tcond)
        pcd = state.p()
        state.update(CP.PT_INPUTS, pe, te + 5)
        h1, s1, v1 = state.hmass() / 1e3, state.smass() / 1e3, 1 / state.rhomass()
        state.update(CP.PSmass_INPUTS, pcd, s1 * 1e3)
        h2s, t2s = state.hmass() / 1e3, state.T()
        state.update(CP.PQ_INPUTS, pcd, 0.0)
        tb, hl = state.T(), state.hmass() / 1e3
        state.update(CP.PQ_INPUTS, pe, 1.0)
        hv_e, sv_e = state.hmass() / 1e3, state.smass() / 1e3
        state.update(CP.PQ_INPUTS, pe, 0.0)
        hl_e = state.hmass() / 1e3
        state.update(CP.PT_INPUTS, pcd, tb - 5)
        h3 = state.hmass() / 1e3
        ref[fid] = {"Te": te, "Tc": tcond, "Pe_kPa": pe / 1e3, "Pc_kPa": pcd / 1e3, "h1": h1, "s1": s1, "v1": v1,
                    "h2s": h2s, "T2s": t2s, "Tb_cond": tb, "hl_cond": hl, "hv_evap": hv_e, "sv_evap": sv_e,
                    "hl_evap": hl_e, "h3_sc5": h3, "COP_ideal_SC5": (h1 - h3) / (h2s - h1)}
    with open(os.path.join(OUT, "_reference.json"), "w", encoding="utf-8") as f:
        json.dump(ref, f, indent=1)
    print("reference written", flush=True)


if __name__ == "__main__":
    only = None
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a.startswith("--only"):
            only = a.split("=", 1)[1].split(",") if "=" in a else args[i + 1].split(",")
    failed = []
    for fid, (backend, comps, fracs) in FLUIDS.items():
        if only and fid not in only:
            continue
        try:
            gen_fluid(fid, backend, comps, fracs)
        except Exception as exc:  # noqa: BLE001
            failed.append(fid)
            print(f"{fid}: FAILED -> {exc}", flush=True)
    gen_reference()
    print("failed:", failed, flush=True)
