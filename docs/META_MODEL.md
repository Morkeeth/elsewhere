# Elsewhere Meta-Model

## Core entities

```text
ResearchArchive
 ├─ EvidenceArtifact
 ├─ Decision
 │   ├─ Future
 │   ├─ Assumption
 │   ├─ ContextLens
 │   ├─ Shock
 │   ├─ RehearsalRun
 │   └─ Experiment
 └─ CalibrationRecord
```

### ResearchArchive

A private, user-controlled collection of selected material: journal excerpts, decision-log entries, complaint-book entries, notes, offers, calendar constraints, and saved messages.

It is not a general surveillance store. Each item has an explicit purpose and can be excluded from a decision.

```ts
type EvidenceArtifact = {
  id: string;
  kind: "journal" | "decision-log" | "friction-log" | "note" | "document" | "calendar" | "message-excerpt";
  text: string;
  capturedAt: string;
  selectedByUser: true;
  consentScope: "private-decision-only";
  freshness: "current" | "possibly-stale" | "historical";
  tags: string[];
};
```

### Decision

The durable unit of work: a question that keeps reopening.

```ts
type Decision = {
  id: string;
  question: string;
  domain: "career" | "moving" | "relationship-boundary" | "education" | "life";
  status: "open" | "rehearsing" | "testing" | "committed" | "archived";
  futures: Future[]; // exactly four in the current product
  assumptions: Assumption[];
  contextLenses: ContextLens[];
  linkedEvidenceIds: string[];
};
```

### Future

A grounded possible life, not a recommendation.

```ts
type Future = {
  id: string;
  title: string;
  deterministicRecord: WorldState;
  commitmentAssumptions: Assumption[];
};
```

### Assumption

The most important extension to the current ledger. Every consequential input must say whether it is a fact, an estimate, or a wish.

```ts
type Assumption = {
  id: string;
  statement: string;
  kind: "fact" | "user-estimate" | "unknown" | "preference";
  affects: string[];
  evidenceIds: string[];
  challengeQuestion: string;
  editable: true;
};
```

### ContextLens

A user-authored model of a perspective. It is never a simulated person.

```ts
type ContextLens = {
  id: string;
  label: string; // “My model of Mum’s protective concern”
  protectedValues: string[];
  knownConcerns: string[];
  evidenceIds: string[];
  unknowns: string[];
  provenanceLabel: "user-authored perspective";
  allowPredictionOfPerson: false;
};
```

### Shock

A typed counterfactual that changes the world state causally.

```ts
type Shock = {
  id: string;
  label: string;
  activation: { month: number };
  effects: { cost: number; travel: number; energy: number; belonging: number };
  assumptionIds: string[];
};
```

### RehearsalRun

A reproducible snapshot: same decision record, same evidence selection, same assumptions, same model version.

```ts
type RehearsalRun = {
  id: string;
  decisionId: string;
  recordHash: string;
  baseline: WorldState[];
  shocked: WorldState[];
  witnessMatrix: WitnessAssessment[];
  createdAt: string;
};
```

### Experiment and CalibrationRecord

The product’s learning loop.

```ts
type Experiment = {
  id: string;
  uncertaintyId: string;
  durationDays: 14;
  maximumCost: number;
  firstAction: string;
  signals: string[];
};

type CalibrationRecord = {
  experimentId: string;
  predicted: string[];
  observed: string[];
  surprise: string;
  revisedAssumptionIds: string[];
  confidenceBefore: "low" | "medium" | "high";
  confidenceAfter: "low" | "medium" | "high";
};
```

## Model boundary

| Layer | Owner | Can change numbers? | Can recommend? |
|---|---|---:|---:|
| World state | Deterministic code | Yes | No |
| Evidence attribution | User + deterministic code | No | No |
| Context lenses | User-authored inputs | No | No |
| Witness matrix | GPT structured categories | No | No |
| Experiment constraints | Deterministic code | Yes | No |
| Reflection prompts | GPT or templates | No | No |

The model may classify tension, surface contradictions, and select an uncertainty category. It must not manufacture evidence, infer a person’s intent, or become the source of a consequential number.
