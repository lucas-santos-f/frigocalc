# Security policy

## Threat model

FrigoCalc is a static site. All calculations run in the user's browser and no data is sent anywhere. Saved scenarios live only in the browser's `localStorage`. There is no login, no database and no API of its own.

What can still reach the app from outside:

- **Share links** (`#s=...`): the scenario is decoded and checked against a strict Zod schema before it is used. The URL fragment never reaches the server and nothing in it is executed.
- **Imported JSON files:** the same schema check plus a 256 kB size limit. Nothing in them is treated as code.
- **Dependencies:** versions pinned by the lockfile, `npm audit` in CI, grouped monthly Dependabot updates and CodeQL.
- **Hosting** (Cloudflare Workers Static Assets): HTTPS only, HSTS, a strict CSP with no `unsafe-eval` and no third-party scripts, and `frame-ancestors 'none'` (see `public/_headers`).

## Controls

| Control | Where |
| --- | --- |
| CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP/COEP/CORP | `public/_headers` |
| No `eval`, `new Function` or `dangerouslySetInnerHTML` | ESLint rules and code review |
| Validation of share links, imported files and stored scenarios | `src/state/schema.ts` |
| Secret scanning (gitleaks over the full history), CodeQL, `npm audit` | `.github/workflows/` |
| Dependabot for npm, GitHub Actions and pip | `.github/dependabot.yml` |
| Deploy tokens kept in GitHub Secrets and Cloudflare only; `.env` files ignored | `.gitignore` |

## Reporting a vulnerability

Please open a private security advisory on GitHub (**Security → Report a vulnerability** on this repository) instead of a public issue with exploitable details. You should get a first reply within 7 days.

## Supported versions

Only the version deployed from `main` gets fixes.
