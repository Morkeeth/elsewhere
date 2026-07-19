# Elsewhere

**Don’t ask AI what to choose. Visit the futures first.**

Elsewhere is an open-source, mobile-first decision instrument for consequential life choices. Careers are the launch wedge, with adaptive journeys for moving, relationships, education, and decisions that do not fit a category. It unfolds two to four grounded twelve-month paths, introduces a real-world shock, exposes the point at which each path becomes expensive to reverse, and ends with one low-cost fourteen-day experiment.

## Why it is different

Most decision tools collapse uncertainty into advice. Elsewhere preserves disagreement:

1. A deterministic TypeScript ledger computes salary, taxes, rent, living costs, savings, energy, belonging, and optionality.
2. Four GPT-5.6 witnesses run concurrently with distinct lenses: financial resilience, human belonging, reversibility, and adversarial failure.
3. A fifth GPT-5.6 response synthesizes the disagreement but cannot change a number.
4. A configurable shock reruns every life from the selected month.
5. The product returns a reversible experiment, not a verdict.

Remove concurrent witnesses and the central product experience—the visible disagreement between valid futures—disappears. Remove the deterministic ledger and the evidence contract disappears.

## Full product surface

- Five guided journeys with one-question-at-a-time mobile input
- Domain-specific language and weighting: financial grounding for careers/moving; belonging, freedom, and growth for relationships
- Swipeable future cards, instinctive priority sliders, and selectable plot twists
- Editable decisions, countries, salaries, costs, value scores, and shock conditions
- France 2026 and UK 2026 progressive payroll calculators
- ECB-normalized EUR/GBP comparisons
- Twelve-month baseline and shocked world states
- Four concurrent GPT witnesses plus structured synthesis
- SVG optionality timelines, shock propagation, commitment markers, and divergence score
- Evidence drawer with formula and source provenance
- Local decision persistence
- Markdown and JSON exports
- OpenClaw webhook delivery and installable OpenClaw skill
- Health endpoint, deterministic regression suite, scenario eval harness, security guidance, and Vercel configuration

## Run locally

Requires Node.js 20.9 or newer.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>. The ledger works without credentials; add `OPENAI_API_KEY` to enable the five-response witness pass.

## Verify

```bash
pnpm check
pnpm lint
pnpm build
pnpm verify:openai  # requires OPENAI_API_KEY
```

`pnpm check` runs type checking, unit/integration tests, and a 15-check scenario evaluation covering schema validity, reproducibility, traceability, shock causality, and experiment reversibility.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | For AI witnesses | Server-side Responses API credential |
| `OPENAI_MODEL` | No | Defaults to `gpt-5.6-sol` |
| `OPENCLAW_WEBHOOK_URL` | For delivery | Receives the finished decision brief |
| `OPENCLAW_WEBHOOK_TOKEN` | Recommended | Bearer token for webhook authentication |

Never expose these values through `NEXT_PUBLIC_*` variables.

## API

- `POST /api/simulate?agents=1` validates a decision, computes the immutable ledger, runs witnesses, and returns a structured simulation.
- `GET /api/simulate` returns the deterministic sample scenario; add `?agents=1` for witnesses.
- `POST /api/deliver` sends a validated simulation to the configured OpenClaw webhook.
- `GET /api/health` reports configuration readiness without revealing secrets.

## Architecture and honesty

The current public Responses API reference documents structured outputs and tool use, but not a single-request parameter that natively spawns subagents. Elsewhere therefore runs four independent GPT-5.6 Responses concurrently and performs a fifth synthesis call. The adapter is isolated so an officially documented single-request primitive can replace it later without changing the product contract.

Accurate language: **“Four independent GPT-5.6 future witnesses run concurrently over immutable world states, then a fifth response synthesizes their disagreement.”**

## Data contract

All displayed numeric outcomes come from inputs and formulas. GPT output is qualitative and schema constrained. Every numeric summary carries source IDs, and the evidence audit fails if any source is missing. The included scenario combines explicitly labeled user assumptions with dated official sources.

## Deploy

1. Import the repository into Vercel.
2. Set the environment variables above for Production and Preview.
3. Deploy; `vercel.json` grants the witness route up to five minutes.
4. Confirm `/api/health`, then run `pnpm verify:openai` against the production configuration.

Read `SECURITY.md` before accepting real sensitive decisions. Licensed under MIT.
