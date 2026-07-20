# Elsewhere: full-scope build record

## Product contract

Elsewhere does not recommend a life. It lets the user inspect grounded futures, break them with a shock, and buy evidence through one reversible real-world experiment.

## Delivered slices

| Slice | Product outcome | Status |
| --- | --- | --- |
| Decision studio | Edit two to four real paths, the outcome to protect, grounded differences, and one uncertainty | Implemented for Career and Moving |
| Guided journey | One-click apartment story plus a four-step custom path | Implemented |
| Grounding engine | France and UK payroll, ECB currency normalization, cited rent benchmarks, deterministic monthly calculations, and explicit unsourced labels elsewhere | Complete |
| Futures | Moment-by-moment life stories backed by twelve-month baseline and pressured states | Implemented |
| Decision Hinge | Causal office-days sweep exposes the point where the apartment comparison reverses | Implemented and regression-tested |
| AI witnesses | Four concurrent GPT-5.6 lenses plus a structured synthesis that cannot mutate numeric outcomes | Implemented; cached replay and production live smoke verified 2026-07-20 |
| Evidence | Per-future source/formula traces and aggregate coverage audit | Complete |
| Exit from simulation | Fourteen-day experiment with cost, first action, and observable signals | Complete |
| Persistence and portability | Local decision state, Markdown brief, JSON world-state export | Complete |
| Edge delivery | No third-party delivery webhook in the submitted artifact | Deliberately removed from scope |
| Reliability | Unit tests, scenario evals, health route, validation, graceful no-key state | Complete |
| Shipping | Vercel project, public production alias, README, security, demo, and judging docs | Application commit `293ed40` is public and healthy; rendered walkthrough remains |

## Architecture decisions

1. World-state metrics are never authored by a language model. Inputs and formulas own every displayed metric; models return only bounded qualitative categories.
2. AI witnesses interpret an immutable copy of the baseline and pressured world states through structured output.
3. Independent lenses must be preserved through synthesis; consensus is not the goal.
4. Shock simulation is a first-class rerun, not prose pasted onto the baseline.
5. The final call to action is an evidence purchase with a time and cost bound, not a recommendation.

## Quality gates for the current candidate

- [x] Type-safe production build
- [x] 41 unit and integration tests
- [x] 30 scenario evaluation checks
- [x] Schema validation at each API boundary
- [x] Exactly twelve months per future
- [x] Reproducible deterministic runs
- [x] 100% trace coverage for rendered decision-outcome fields
- [x] Office-days assumption causally flips the apartment comparison between four and five days
- [x] Fourteen-day experiment costs at most €250
- [x] Qualitative witness output cannot write numeric outcome fields
- [ ] Mobile and desktop rendered walkthrough on the deployed candidate
- [x] Live Responses API smoke test on the deployed candidate

## Remaining release gates

- Run the zero-setup apartment flow on desktop and mobile: open, ordinary week, pressure, hinge, witnesses, experiment, evidence.
- Record the three-minute path in `docs/DEMO_SCRIPT.md`.
- Enter the Codex `/feedback` session identifier, public URL, repository, video, and final copy in Devpost.

Exact release receipts live in `docs/SUBMISSION_SNAPSHOT.md`.
