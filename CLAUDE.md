# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stato del Progetto

**Fase corrente:** Pre-development. Nessun codice scritto. Documentazione completa.
**File principale:** `PLAN.md` — blueprint completo del progetto
**Stato dettagliato:** `docs/STATUS.md`

---

## Comandi

Una volta scaffoldato il progetto (Fase 1), i comandi attesi:

```bash
# Avviare frontend + backend insieme
npm run dev           # Vite (localhost:5173) + Hono server (localhost:3001) in parallelo

# Separati
npm run dev:web       # solo Vite
npm run dev:server    # solo Hono server

# Build + lint + test
npm run build         # build produzione frontend
npm run lint          # ESLint
npx vitest            # tutti i test unitari
npx vitest run src/lib/calculations.test.ts   # singolo file test
npx playwright test   # test E2E
```

---

## Architettura

**Regola fondamentale:** Notion è il database. Il server Hono è un proxy obbligatorio (l'API Notion non accetta chiamate browser per CORS). Vedere `docs/ARCHITECTURE.md` per il diagramma completo.

```
React SPA (Vite)  →  /api/*  →  Hono server  →  @notionhq/client  →  Notion API
```

**In produzione (Fase 2):** il server Hono diventa Vercel Edge Functions. Il codice Notion non cambia.

### Struttura chiave

```
src/
├── lib/
│   ├── api.ts            # client HTTP verso /api/* (fetch wrapper)
│   ├── calculations.ts   # UNIT-TESTED: positionSize, riskAmount, rrRatio
│   ├── schema.ts         # Zod schemas per ogni entità
│   └── utils.ts
├── hooks/                # TanStack Query hooks (useTrades, useAccount, ...)
└── pages/                # componenti di pagina (React Router)

server/
├── notion/               # operazioni Notion (funzioni pure, testabili con mock)
└── routes/               # handler Hono (dipendono da notion/)
```

### Separazione critica

`server/notion/*.ts` contiene **solo logica Notion** — funzioni pure che chiamano l'API e mappano le risposte. **Non devono dipendere da Hono.** Questo permette di testarle con mock e di portarle su altri runtime.

---

## Regole di Business Critiche

- **`src/lib/calculations.ts`** — contiene tutta la matematica di risk management (position size, R:R, risk %). Unit-tested. Non duplicare questi calcoli altrove.
- **Log Trade wizard (step 4-5)** — `PreTradeNote` (campo Rich Text) e checklist pre-trade sono **obbligatori**. La form non può essere sottomessa senza. Non rimuovere questa validazione.
- **Checklist pre-trade** — regole hardcoded in `src/lib/checklist.ts`: 12 regole generiche + 4 per setup type. Vedi `docs/CHECKLIST-RULES.md` per i testi esatti.
- **FTMO limits** — profit target 10%, max daily loss 5%, max overall loss 10%, min 10 giorni. Questi valori vengono letti dal record account in Notion (proprietà `ProfitTargetPct`, `MaxDailyLossPct`, `MaxOverallLossPct`).

---

## Notion Database Schema

Schema completo in `docs/NOTION-SCHEMA.md`. Variabili d'ambiente richieste:

```
NOTION_TOKEN=secret_xxxxx
NOTION_DB_TRADES=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_JOURNALS=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_INSTRUMENTS=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_RULES=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_DAILY_ROUTINES=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_WEEKLY_REVIEWS=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Proprietà Notion aggiuntive da creare manualmente** (non presenti nei CSV originali): `SL`, `TP`, `ATR14`, `RR_Ratio`, `RiskAmount`, `PreTradeNote`, `LessonLearned`, `Mistakes`, `ChecklistScore`, `Screenshots` su Trades. `StartBalance`, `ChallengeType`, `ProfitTargetPct`, `MaxDailyLossPct`, `MaxOverallLossPct` su Journals. `ATR14`, `ATRUpdatedAt` su Instruments.

---

## Flusso Risk Calculator → Registra Trade

Il Risk Calculator (pagina `/risk`) calcola i parametri del trade. Il bottone "Registra Trade" naviga al wizard `/log-trade` con i valori pre-calcolati passati via `state` di React Router. Step 1-3 del wizard vengono pre-compilati; l'utente deve completare solo step 4 (nota) e step 5 (checklist).

---

## Immagini / Screenshot

Supportate tramite Notion Files & Media API. Proprietà `Screenshots` sul database Trades. Limite: 5 MB per file su piano Free Notion. Il backend deve gestire il FileUpload in due step: create upload → send file → attach to page.

---

## Design

Design is a first-class concern — full guidelines in `docs/DESIGN.md`. Key rules to always respect:

- **Dark mode is the default.** Add `document.documentElement.classList.add('dark')` in `src/main.tsx` before render.
- **Semantic colors are non-negotiable.** Profit/positive → `text-emerald-400`, loss/negative → `text-red-400`, warning → `text-amber-400`. Use the utility classes `.text-profit` / `.text-loss` defined in `src/index.css`.
- **Numbers always use `font-mono tabular-nums`.** Prices, P&L, percentages — every numeric value in the UI.
- **Use shadcn components as the base.** Add components via `pnpm dlx shadcn@latest add <component>`. Never edit `src/components/ui/` directly.
- **Use `cn()` for conditional classes**, never string concatenation.
- Create a reusable `<PnL value={n} />` component rather than repeating the profit/loss color logic inline.

When implementing any page or component, consult `docs/DESIGN.md` for patterns (Metric Card, Progress Bar, Status Badge, chart setup).

---

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| UI | Tailwind CSS 3 + shadcn/ui (componenti in `src/components/ui/` — non modificare) |
| Charts | Recharts 2 |
| Async state | TanStack Query v5 |
| Backend proxy | Hono |
| Database | Notion API (`@notionhq/client`) |
| Testing | Vitest (unit) + Playwright (E2E) |

---

## Documentazione

| File | Contenuto |
|---|---|
| `PLAN.md` | Piano completo: fasi, funzionalità, stack, regole di trading |
| `docs/ARCHITECTURE.md` | Diagrammi architettura, pattern di codice, decisioni tecniche |
| `docs/NOTION-SCHEMA.md` | Schema completo di tutti i database Notion con tipi e valori |
| `docs/CHECKLIST-RULES.md` | Regole pre-trade (12 generiche + 4 per setup type, hardcoded) |
| `docs/STATUS.md` | Stato avanzamento con checklist per ogni fase |
| `notion_db/` | CSV export Notion — riferimento schema, dati di test/esempio |
