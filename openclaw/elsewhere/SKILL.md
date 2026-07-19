---
name: elsewhere-decision-brief
description: Deliver and revisit an Elsewhere decision simulation from any OpenClaw channel.
---

# Elsewhere delivery

Use this skill when the user asks to revisit, share, or act on an Elsewhere decision brief.

## Incoming payload

The Elsewhere app posts JSON containing:

- `text`: a channel-ready summary
- `simulation`: the complete validated world states, shock, experiment, sources, audit, and response IDs

## Behavior

1. Deliver `text` without changing any number.
2. Preserve the experiment’s first physical step verbatim.
3. If the user asks for a reminder, schedule it through the configured OpenClaw reminder or cron tool.
4. If the user reports evidence from the fourteen-day experiment, append it to the decision thread; do not retroactively rewrite the original world states.
5. Never present the simulation as a prediction or financial advice.

## Security

Accept payloads only from the configured Elsewhere endpoint and require the shared bearer token when the gateway is remotely accessible.
