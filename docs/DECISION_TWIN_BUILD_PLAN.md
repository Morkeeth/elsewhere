# Decision Twin Build Plan

## Milestone 1: Context Layers (complete)

**Goal:** add one user-authored perspective without touching contact integrations.

### Build

- `ContextLens` schema and local persistence
- One “Add a perspective” sheet
- Inputs: protected values, known concerns, evidence snippets, unknowns
- One added row in the disagreement matrix
- Clear provenance label: “user-authored perspective”
- Tests for no-person-prediction copy and evidence attribution

### Deliberately exclude

- Contact imports
- Instagram/WhatsApp integrations
- Free-form simulated conversation
- Relationship prediction

## Milestone 2: Calibration Loop (complete)

Shipped locally in the decision record:

- return after a fourteen-day experiment;
- record up to three observed signals;
- revise one named priority assumption;
- preserve a local calibration record; and
- rerun deterministic futures without another model call.

## Milestone 3: Research Archive

**Goal:** make journals and decision logs useful as selected evidence.

- Paste-first artifact capture
- Tags, freshness, and per-decision selection
- Claim extraction into editable assumptions
- Artifact-to-assumption links in the evidence drawer
- Local-first storage before any cloud sync

## Milestone 4: Calibration expansion

**Goal:** let a decision become smarter after reality answers back.

- Experiment check-in
- Predicted vs observed signals
- Surprise capture
- Assumption revisions
- A timeline of what the user learned across decisions

## Milestone 5: Scenario Graph

**Goal:** replace one shock with competing, typed counterfactual branches.

- Multiple shock cards
- Branch comparison
- Sensitivity view: “which assumption changes the answer?”
- Contradiction detector across selected evidence

## Evaluation gates

Before expanding to contacts or external data:

1. Users understand that context lenses are their own models, not real people.
2. Users can identify a source for every consequential claim.
3. At least one experiment changes a later decision assumption.
4. The system never creates a recommendation, relationship prediction, or false certainty.
