# Política de segurança

## Modelo de ameaça

O FrigoCalc é um aplicativo **100% estático**: todo o cálculo roda no navegador do usuário e nenhum dado é enviado a servidor. Os cenários salvos ficam apenas no `localStorage` do próprio navegador. Não há autenticação, banco de dados nem API própria.

Superfícies relevantes:

- Conteúdo de terceiros injetado por link de compartilhamento (`#s=...`) → sempre validado com esquema estrito (zod) antes de ser usado; nunca executado.
- Arquivos JSON importados pelo usuário → mesma validação; limite de tamanho; nada é interpretado como código.
- Cadeia de dependências (npm) → versões travadas por lockfile, `npm audit` no CI, Dependabot semanal, CodeQL.
- Hospedagem (Cloudflare Workers Static Assets) → HTTPS obrigatório, HSTS, CSP estrita sem `unsafe-eval` e sem scripts externos, `frame-ancestors 'none'` (ver `public/_headers`).

## Controles implementados

| Controle | Onde |
| --- | --- |
| CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP/COEP/CORP | `public/_headers` |
| Sem `eval`, `new Function`, `dangerouslySetInnerHTML` | regras ESLint + revisão |
| Validação de entrada (links, importação, formulários) | `src/state/schema.ts` |
| Varredura de segredos (gitleaks), CodeQL, `npm audit` | `.github/workflows/*` |
| Dependabot (npm, GitHub Actions, pip) | `.github/dependabot.yml` |
| Segredos apenas no painel do Cloudflare / GitHub Secrets; `.env` ignorado | `.gitignore` |

## Como reportar uma vulnerabilidade

Abra uma *security advisory* privada no GitHub (aba **Security → Report a vulnerability**) do repositório. Não abra issue pública com detalhes exploráveis. Resposta inicial em até 7 dias.

## Versões suportadas

Apenas a versão publicada na branch `main` recebe correções.
