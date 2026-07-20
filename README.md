# Elsewhere

**Don’t ask AI what to choose. Visit the futures first.**

Elsewhere is an open-source Personal Decision Lab for consequential career and location choices. It unfolds four grounded twelve-month paths, introduces a real-world shock with explicit causal effects, finds the assumption each future depends on, and ends with one low-cost fourteen-day experiment.

## Why it is different

Most decision tools collapse uncertainty into advice. Elsewhere preserves disagreement:

1. A deterministic TypeScript ledger computes salary, taxes, rent, living costs, savings, energy, belonging, and optionality.
2. Four GPT-5.6 witnesses receive the same immutable four-future ledger, then interpret it through distinct lenses: financial resilience, human belonging, reversibility, and adversarial failure.
3. A fifth GPT-5.6 response synthesizes the disagreement but cannot change a ledger value or experiment constraint.
4. A configurable shock reruns every life from the selected month.
5. A deterministic Assumption Breakpoint sweep shows where each future becomes fragile under the user's own weights.
6. The product returns a reversible experiment, then recalculates breakpoints from one user-observed assumption—not a verdict.

Optional context layers can add up to two further **user-authored perspectives**—for example, “my model of Mum’s protective concern.” They record what the user believes that perspective protects, what is known, and what remains unknown. They are stored locally in the browser; when live witnesses run, selected text is sent to OpenAI for qualitative interpretation with `store: false`. They are not contact imports, person simulations, or claims about what somebody else thinks.

The disagreement matrix is model-generated; deterministic code deliberately owns the experiment constraints and every outcome number. Remove the witnesses and the value-based disagreement disappears. Remove the deterministic record and the evidence contract disappears.

## Full product surface

- Five guided starting shapes—Career, Moving, Relationships, Education, and Something else—with preloaded paths and optional fine-tuning
- Swipeable future cards, instinctive priority sliders, and selectable plot twists
- Editable decisions, countries, salaries, costs, value scores, and shock conditions
- France 2026 and UK 2026 progressive payroll calculators
- Visible tax provenance on every future; rates outside France and the UK are user-provided and explicitly marked not sourced
- ECB-normalized EUR/GBP comparisons
- Twelve-month baseline and shocked world states
- Four concurrent core GPT witnesses over the same ledger plus a constrained uncertainty synthesis; optional context perspectives add one isolated lens each
- SVG optionality timelines, shock propagation, commitment markers, and divergence score
- Assumption register, deterministic sensitivity sweeps, and a Reversal Map showing robust, sensitive, and fragile regions
- Evidence drawer with formula and source provenance
- Local decision persistence
- Local experiment-return calibration: record observed signals, update the tested causal assumption, and rerun breakpoints without another AI call
- Markdown and JSON exports
- Health endpoint, deterministic regression suite, scenario eval harness, security guidance, and Vercel configuration

## Run locally

Requires Node.js 20.9 or newer.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>. The ledger works without credentials; add `OPENAI_API_KEY` to enable the four-core-witness-plus-synthesis pass. Optional context perspectives add one witness call each.

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
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or Vercel `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Required for production live witnesses | Durable visitor rate limit |
| `ELSEWHERE_DEMO_BUDGET` | Required for production live witnesses | Global daily live-witness ceiling |

Never expose these values through `NEXT_PUBLIC_*` variables.

## API

- `POST /api/simulate?agents=1` validates a decision, computes the immutable ledger, runs witnesses, and returns a structured simulation. In production it fails closed unless durable Upstash rate-limit configuration and a global demo budget are present.
- `GET /api/simulate` returns the deterministic sample scenario. `GET /api/simulate?agents=1` serves only a deployer-provided validated cache, never paid model work.
- `GET /api/health` reports configuration readiness without revealing secrets.

## Architecture and honesty

Elsewhere intentionally runs four independent GPT-5.6 Responses concurrently and performs a fifth synthesis call. Isolation is part of the core product contract: every core witness receives the same immutable four-future ledger and receipt hash, while its protected value is the only variable. Optional user-authored context is delivered as untrusted input data to every witness; only its dedicated context lens interprets it. The synthesis preserves disagreement rather than voting.

Accurate language: **“Four independent GPT-5.6 witnesses receive the same immutable four-future world state, then a fifth response synthesizes their disagreement.”**

## Data contract

Every decision-outcome number comes from inputs and formulas. France and UK payroll rules use dated public sources. Other jurisdictions use rates entered by the user, visibly labelled “user-provided, not sourced”; no FR/UK tax source is attached to those calculations. Energy, belonging, optionality, commitment timing, and all Reversal Map sweeps are transparent scenario assumptions, not validated predictions. “Personal fit” is a user-weighted calculation, not a recommendation or objective outcome. GPT returns only bounded qualitative categories; the application renders its own interpretation text and never displays model-authored numeric or prescriptive prose. The evidence audit compares a complete rendered-outcome manifest—including timeline data and breakpoint sweep values—against independent trace records. Trace coverage means the formula/input chain is complete; it does not mean every input is independently sourced. The "Commitment assumption" marker is editable user input, not a discovered fact.

## How we used GPT-5.6 and Codex

GPT-5.6 supplies the independent qualitative witness passes and constrained synthesis; it never computes ledger metrics. Codex accelerated the Next.js implementation, typed schemas, deterministic simulation, API integration, regression tests, mobile journey, and release review. The human product owner chose the user, trust boundary, value lenses, and safety constraints. See [DECISIONS.md](DECISIONS.md) for the accountable decision record.

## Deploy

1. Import the repository into Vercel.
2. Set the environment variables above for Production and Preview.
3. Deploy; `vercel.json` grants the witness route up to five minutes.
4. Confirm `/api/health`, then run `pnpm verify:openai` against the production configuration.

Read `SECURITY.md` before accepting real sensitive decisions. Licensed under MIT.
