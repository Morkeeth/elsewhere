# Elsewhere — full-scope build record

## Product contract

Elsewhere does not recommend a life. It lets the user inspect grounded futures, break them with a shock, and buy evidence through one reversible real-world experiment.

## Delivered slices

| Slice | Product outcome | Status |
| --- | --- | --- |
| Decision studio | Edit the question, starting savings, exactly four paths, tax jurisdiction, salary, costs, values, risk, and shock | Complete |
| Guided journey | Mobile-first domain selection, futures, priorities, adaptive reality check, and plot twist | Complete |
| Grounding engine | France and UK payroll, ECB currency normalization, cited rent benchmarks, deterministic monthly ledger | Complete |
| Futures | Twelve-month baseline and shocked states, optionality paths, commitment points, divergence | Complete |
| AI witnesses | Four concurrent GPT-5.6 lenses plus a structured synthesis that cannot mutate the ledger | Implemented; live credential check pending |
| Evidence | Per-future source/formula traces and aggregate coverage audit | Complete |
| Exit from simulation | Fourteen-day experiment with cost, first action, and observable signals | Complete |
| Persistence and portability | Local decision state, Markdown brief, JSON world-state export | Complete |
| Edge delivery | No third-party delivery webhook in the submitted artifact | Deliberately removed from scope |
| Reliability | Unit tests, scenario evals, health route, validation, graceful no-key state | Complete |
| Shipping | Vercel configuration, README, security, MIT license, demo and judging docs | Complete; deploy credentials pending |

## Architecture decisions

1. Ledger metrics are never authored by a language model. Inputs and formulas own every displayed metric; models return only bounded qualitative categories.
2. AI witnesses interpret an immutable copy of the baseline and shocked ledgers through structured output.
3. Independent lenses must be preserved through synthesis; consensus is not the goal.
4. Shock simulation is a first-class rerun, not prose pasted onto the baseline.
5. The final call to action is an evidence purchase with a time and cost bound, not a recommendation.

## Quality gates

- Type-safe production build
- Schema validation at each API boundary
- Exactly twelve months per future
- Reproducible deterministic runs
- 100% trace coverage for rendered decision-outcome fields
- Shock never affects a month before its configured start
- Fourteen-day experiment costs at most €250
- Qualitative witness output cannot write numeric ledger fields
- Mobile and desktop browser pass
- Live Responses API smoke test before public submission

## Remaining external gates

The repository itself is complete. Public release still requires secrets or accounts that should never be pasted into source control:

- `OPENAI_API_KEY` for live witness verification
- Vercel authorization for deployment
- Devpost account access for submission and video upload
