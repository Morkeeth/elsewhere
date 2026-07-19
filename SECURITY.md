# Security and privacy

Elsewhere is a decision instrument, not financial, legal, medical, or immigration advice.

## Data flow

- The deterministic ledger runs on the server and browser from the submitted decision.
- When GPT witnesses are configured, the decision and computed ledger are sent to OpenAI through the Responses API.
- The browser stores the latest editable decision in local storage. It does not store API keys.
- OpenClaw delivery is opt-in and sends the generated brief only after the user presses the delivery button.

## Deployment

- Keep `OPENAI_API_KEY` and `OPENCLAW_WEBHOOK_TOKEN` server-side.
- Restrict the OpenClaw webhook to the expected origin and rotate its token if exposed.
- Add authentication and deletion controls before accepting sensitive public submissions.
- Do not log raw decisions in production unless the user has consented.

Report security issues privately to the repository maintainer rather than opening a public issue.
