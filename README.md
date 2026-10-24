# FrigoCalc

Calculadora visual de **carga térmica, ciclo de refrigeração e dimensionamento de sala de máquinas** para refrigeração comercial e industrial: câmaras frias (resfriados e congelados), túneis de congelamento, frigoríficos, salas de processo alimentício, supermercados, indústria química e data centers — com todos os fluidos refrigerantes usuais (amônia, CO₂ subcrítico/transcrítico, hidrocarbonetos, HFCs, HFOs e misturas).

Aplicação **100 % estática**: todo o cálculo roda no navegador, nada é enviado a servidor. Os cenários ficam salvos no próprio dispositivo (localStorage), podem ser exportados em JSON/CSV, impressos em PDF e compartilhados por link.

## Funcionalidades

- **Carga térmica** (ASHRAE Refrigeration): transmissão pelo isolamento, infiltração (renovações ou modelo de abertura de portas Gosney–Tanner), produto (sensível, latente de congelamento, respiração, embalagem), pessoas, iluminação, empilhadeiras, equipamentos, degelo, ar de renovação e cargas diretas (processo, expositores, TI). Modelos prontos por aplicação e por produto.
- **Ciclo** com propriedades reais dos fluidos (tabelas geradas com CoolProp): estágio simples, duplo estágio com resfriador intermediário, cascata (dois fluidos) e CO₂ transcrítico com pressão ótima. Rendimentos estimados por tipo de compressor ou informados. Diagrama pressão–entalpia com o ciclo desenhado, pontos de estado, sensibilidade a temperaturas de evaporação/condensação.
- **Sala de máquinas**: número de compressores (N+1), motores comerciais, deslocamento, rejeição de calor por tipo de condensador, demanda elétrica (kW, kVA, corrente, transformador), carga de fluido e CO₂ equivalente, ventilação de emergência e contínua (ASHRAE 15 / NBR 16069), área estimada e requisitos de segurança por classe ASHRAE 34.
- **Comparação**: todos os fluidos nas mesmas condições (COP, potência, descarga, deslocamento, GWP, classe) e tabela de cenários salvos.
- Unidades SI / imperiais, PT-BR / EN, tema claro/escuro, impressão.

## Stack

React 19 + TypeScript + Vite · ECharts · Zustand · Zod · Vitest · Cloudflare Workers (Static Assets).

## Como rodar

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # testes do motor de cálculo (interpolação, ciclo, carga)
npm run build      # dist/
```

Regerar as tabelas de propriedades (opcional, requer Python 3 + CoolProp):

```bash
pip install -r tools/requirements.txt
python tools/gen_tables.py
```

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `src\engine\` | Motor de cálculo: `props.ts` (propriedades/interpolação), `cycle.ts`, `load.ts`, `plant.ts`, `psychro.ts`, `presets.ts`, `refrigerants.ts` |
| `src\data\tables\` | Tabelas JSON por fluido geradas com CoolProp |
| `src\components\` | Interface (painéis, gráficos, campos) |
| `src\state\` | Estado (Zustand + persistência) e validação (Zod) |
| `src\i18n\` | Textos PT-BR / EN |
| `tools\gen_tables.py` | Gerador das tabelas |
| `public\_headers` | Cabeçalhos de segurança (CSP, HSTS etc.) para o Cloudflare |

## Segurança

Ver `SECURITY.md`: CSP estrita sem scripts externos, validação de toda entrada (links, importação, localStorage), CI com lint, tipos, testes, `npm audit`, CodeQL, gitleaks e Dependabot.

## Publicação

Cloudflare Workers Static Assets (upload direto): `npm run deploy`. Via GitHub Actions: cadastrar `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` em *Secrets* e a variável `CF_DEPLOY_ENABLED=true` em *Variables*.

## Aviso

Ferramenta de pré-dimensionamento. Não substitui o projeto executivo, a seleção em software de fabricante nem a verificação por engenheiro responsável conforme NBR 16069, NBR 16401 e normas aplicáveis.

## Licença

Todos os direitos reservados ao autor — © 2026. Licença definitiva será definida na abertura do repositório.
