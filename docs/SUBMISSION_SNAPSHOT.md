# Elsewhere submission snapshot

Generated: 2026-07-21T01:32:00+02:00

## Candidate

- Application commit: `293ed40`
- Public repository: `https://github.com/Morkeeth/elsewhere`
- Public app: `https://the-unfair-advantage-build-on-this.vercel.app`
- Vercel deployment: `dpl_5zz76hG3b9y5Q19U4c7VDeCQhh7J`

## Verified receipts

- `pnpm check`: 41 tests passed and 30 scenario evaluation checks passed.
- `pnpm lint`: passed.
- `pnpm build`: passed locally and in the Vercel production build.
- Production `/api/health`: HTTP 200, witnesses configured, model `gpt-5.6-sol`.
- Free judge replay: HTTP 200 with `X-Elsewhere-Replay: verified-cached`, four witnesses, and full trace coverage.
- Same-origin production apartment run: HTTP 200 in 15,408 ms with four GPT-5.6 witnesses, one synthesis, five response IDs, full trace coverage, and the `office-days` assumption selected.
- Production hinge: all eight office-day values produce distinct Montreuil fits. Montreuil leads at zero through four days; Central Paris leads at five through seven.

## Still unverified

- A full rendered click-through on desktop and mobile. The agent's in-app browser was unavailable during this closeout, so HTTP, schema, API, and build checks cannot substitute for the visual pass.
- Final video and Devpost preview.

This snapshot reports the tested release subset. `docs/VISION.md` remains the larger product direction.
