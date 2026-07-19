# Elsewhere

**Don’t ask AI what to choose. Visit the futures first.**

Elsewhere is an open-source, mobile-first decision instrument for consequential career and location choices. It unfolds four grounded twelve-month paths, introduces a real-world shock with explicit causal effects, exposes the point at which each path becomes expensive to reverse, and ends with one low-cost fourteen-day experiment.

## Why it is different

Most decision tools collapse uncertainty into advice. Elsewhere preserves disagreement:

1. A deterministic TypeScript ledger computes salary, taxes, rent, living costs, savings, energy, belonging, and optionality.
2. Four GPT-5.6 witnesses receive the same immutable four-future ledger, then interpret it through distinct lenses: financial resilience, human belonging, reversibility, and adversarial failure.
3. A fifth GPT-5.6 response synthesizes the disagreement but cannot change a ledger value or experiment constraint.
4. A configurable shock reruns every life from the selected month.
5. The product returns a reversible experiment, not a verdict.

Remove concurrent witnesses and the central product experience—the visible disagreement between valid futures—disappears. Remove the deterministic ledger and the evidence contract disappears.

## Full product surface

- Two submission-ready guided journeys—Career and Moving—with one-question-at-a-time mobile input
- Swipeable future cards, instinctive priority sliders, and selectable plot twists
- Editable decisions, countries, salaries, costs, value scores, and shock conditions
- France 2026 and UK 2026 progressive payroll calculators
- ECB-normalized EUR/GBP comparisons
- Twelve-month baseline and shocked world states
- Four concurrent GPT witnesses over the same ledger plus a constrained uncertainty synthesis
- SVG optionality timelines, shock propagation, commitment markers, and divergence score
- Evidence drawer with formula and source provenance
- Local decision persistence
- Markdown and JSON exports
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
| `ELSEWHERE_JUDGE_SIMULATION_JSON` | No | Validated cached witness response for a free public judge replay |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Required for production live witnesses | Durable visitor rate limit |
| `ELSEWHERE_DEMO_BUDGET` | Required for production live witnesses | Global daily live-witness ceiling |

Never expose these values through `NEXT_PUBLIC_*` variables.

## API

- `POST /api/simulate?agents=1` validates a decision, computes the immutable ledger, runs witnesses, and returns a structured simulation. In production it fails closed unless durable Upstash rate-limit configuration and a global demo budget are present.
- `GET /api/simulate` returns the deterministic sample scenario. `GET /api/simulate?agents=1` serves only a deployer-provided validated cache, never paid model work.
- `GET /api/health` reports configuration readiness without revealing secrets.

## Architecture and honesty

Elsewhere intentionally runs four independent GPT-5.6 Responses concurrently and performs a fifth synthesis call. Isolation is part of the product contract: every witness receives the same immutable four-future ledger and receipt hash, while its protected value is the only variable. The synthesis preserves disagreement rather than voting.

Accurate language: **“Four independent GPT-5.6 witnesses receive the same immutable four-future world state, then a fifth response synthesizes their disagreement.”**

## Data contract

Every decision-outcome number comes from inputs and formulas. GPT returns only bounded qualitative categories; the application renders its own interpretation text and never displays model-authored numeric or prescriptive prose. The evidence audit compares a complete rendered-outcome manifest—including timeline data—against independent trace records. The "Commitment assumption" marker is editable user input, not a discovered fact.

## How we used GPT-5.6 and Codex

GPT-5.6 supplies the independent qualitative witness passes and constrained synthesis; it never computes ledger metrics. Codex accelerated the Next.js implementation, typed schemas, deterministic simulation, API integration, regression tests, mobile journey, and release review. The human product owner chose the user, trust boundary, value lenses, and safety constraints. See [DECISIONS.md](DECISIONS.md) for the accountable decision record.

## Deploy

1. Import the repository into Vercel.
2. Set the environment variables above for Production and Preview.
3. Deploy; `vercel.json` grants the witness route up to five minutes.
4. Confirm `/api/health`, then run `pnpm verify:openai` against the production configuration.

Read `SECURITY.md` before accepting real sensitive decisions. Licensed under MIT.
