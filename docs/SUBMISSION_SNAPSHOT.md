# Elsewhere submission snapshot

Generated: 2026-07-21T17:17:50+02:00

## Candidate

- Application commit: `d594852`
- Public repository: `https://github.com/Morkeeth/elsewhere`
- Public app: `https://the-unfair-advantage-build-on-this.vercel.app`
- Vercel deployment: `dpl_BpdanT6zZPfuGTv4HXe1CUcBpEbR`

## Verified receipts

- `pnpm check`: 42 tests passed and 30 scenario evaluation checks passed.
- `pnpm lint`: passed.
- `pnpm build`: passed locally and in the Vercel production build.
- Production `/api/health`: HTTP 200, witnesses configured, model `gpt-5.6-sol`.
- Free judge replay: HTTP 200 with `X-Elsewhere-Replay: verified-cached`, four witnesses, and full trace coverage.
- Exact same-origin production recording route: four GPT-5.6 analyses and one synthesis returned in 47.4 seconds; the People lens produced concrete, decision-relevant scenes for both apartments.
- Production hinge: all eight office-day values produce distinct Montreuil fits. Montreuil leads at zero through four days; Central Paris leads at five through seven.
- Full rendered click-through: production desktop at 1440×900 and the same release at 390×844, with no horizontal overflow through setup, scenes, condition replay, lens reads, synthesis, and reality test.

## Still unverified

- Final video and Devpost preview.

This snapshot reports the tested release subset. `docs/VISION.md` remains the larger product direction.
