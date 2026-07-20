# Elsewhere submission snapshot

Generated: 2026-07-21T01:24:56+02:00

## Candidate

- Git commit: `6b0b67d053173236dc19c957724266b936362647`
- Public repository: `https://github.com/Morkeeth/elsewhere`
- Public app: `https://the-unfair-advantage-build-on-this.vercel.app`
- Vercel deployment: `dpl_6Q7KdSCFwUFLyNFycujjNJWPeQGD`

## Verified receipts

- `pnpm check`: 41 tests passed and 30 scenario evaluation checks passed.
- `pnpm lint`: passed.
- `pnpm build`: passed locally and in the Vercel production build.
- Production `/api/health`: HTTP 200, witnesses configured, model `gpt-5.6-sol`.
- Free judge replay: HTTP 200 with `X-Elsewhere-Replay: verified-cached`, four witnesses, and full trace coverage.
- Same-origin production apartment run: HTTP 200 in 17,724 ms with four GPT-5.6 witnesses, one synthesis, five response IDs, full trace coverage, and the `office-days` assumption selected.
- Production hinge: Montreuil leads at zero through four office days; Central Paris leads at five through seven.

## Still unverified

- A full rendered click-through on desktop and mobile. The agent's in-app browser was unavailable during this closeout, so HTTP, schema, API, and build checks cannot substitute for the visual pass.
- Final video and Devpost preview.

This snapshot reports the tested release subset. `docs/VISION.md` remains the larger product direction.
