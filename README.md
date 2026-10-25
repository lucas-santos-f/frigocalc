# FrigoCalc

Cooling load, refrigeration cycle and machine room sizing for commercial and industrial refrigeration. It covers chilled and frozen cold rooms, blast freezers, carcass chilling, food processing rooms, supermarket racks, glycol process loops and chilled-water data centers. All the usual refrigerants are in: ammonia, subcritical and transcritical CO₂, hydrocarbons, HFCs, HFOs and blends.

**Live:** https://frigocalc.frioeclima.workers.dev

Everything runs in the browser. Nothing is sent to a server: scenarios stay in the device's local storage and can be exported as JSON or CSV, printed to PDF or shared as a link.

## Features

- **Cooling load** (ASHRAE Refrigeration Handbook): transmission through insulation, infiltration by air changes or by the Gosney–Tanner door-opening model, product heat (sensible, latent of freezing, respiration, packaging), people, lighting, forklifts, equipment, defrost, fresh air and direct loads such as process lines, display cases or IT. Templates per application and per product.
- **Cycle** with real fluid properties from CoolProp tables: single stage, two stage with flash intercooler, cascade with two fluids, and transcritical CO₂ at optimum gas cooler pressure. Compressor efficiencies are estimated by compressor type or typed in. Pressure–enthalpy diagram with the cycle drawn on it, state point table and sensitivity to evaporating and condensing temperatures.
- **Machine room:** number of compressors (N+1), standard motor sizes, displacement, heat rejection by condenser type, electrical demand (kW, kVA, current, transformer), refrigerant charge and CO₂ equivalent, emergency and continuous ventilation (ASHRAE 15, NBR 16069), estimated floor area and safety requirements by ASHRAE 34 class.
- **Compare:** every fluid under the same conditions (COP, power, discharge temperature, displacement, GWP, safety class), plus a side-by-side table of all saved scenarios.
- SI or IP units, English or Portuguese, light or dark theme, print layout.

## Running locally

Needs Node 20.19 or newer.

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # engine tests: interpolation, cycle, load
npm run lint
npm run build      # output in dist/
```

The property tables in `src/data/tables/` are already in the repo. To rebuild them you need Python 3 and CoolProp:

```bash
pip install -r tools/requirements.txt
python tools/gen_tables.py
```

## Project layout

| Path | What's there |
| --- | --- |
| `src/engine/` | Calculation engine: `props.ts` (properties and interpolation), `cycle.ts`, `load.ts`, `plant.ts`, `psychro.ts`, `presets.ts`, `refrigerants.ts` |
| `src/data/tables/` | One JSON table per fluid, generated with CoolProp |
| `src/components/` | Panels, charts and form controls |
| `src/state/` | Zustand store with persistence, Zod schemas for every input |
| `src/i18n/` | English and Portuguese strings |
| `tools/gen_tables.py` | Table generator |
| `public/_headers` | Security headers served by Cloudflare (CSP, HSTS and others) |

## Stack

React 19, TypeScript 5.9, Vite 7, ECharts 6, Zustand 5, Zod 4, lz-string, Vitest, ESLint 9. Hosted on Cloudflare Workers Static Assets.

## Security

Strict CSP with no third-party scripts, validation of everything that comes from outside (share links, imported files, local storage), and CI with lint, typecheck, tests, `npm audit`, CodeQL, gitleaks and Dependabot. Details in [SECURITY.md](SECURITY.md).

## Deploying

`npm run deploy` builds and uploads with wrangler. The GitHub Actions workflow does the same on every push to `main` once the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets exist and the `CF_DEPLOY_ENABLED` variable is set to `true`.

## Disclaimer

This is a pre-design tool. It does not replace detailed design, manufacturer selection software or review by a licensed engineer under NBR 16069, NBR 16401 and the codes that apply to the project.

## License

© 2026. All rights reserved by the author. See [LICENSE](LICENSE).
