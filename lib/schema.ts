import { z } from "zod";

export const sourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string().url(),
  accessed: z.string(),
  note: z.string(),
  kind: z.enum(["official", "research", "user-input", "formula"]).default("research"),
  value: z.number().optional(),
  unit: z.string().optional(),
});

export const decisionOptionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(96),
  subtitle: z.string().trim().min(1).max(160),
  location: z.string().trim().min(1).max(96),
  country: z.enum(["FR", "UK", "OTHER"]),
  currency: z.enum(["EUR", "GBP"]),
  taxProfile: z.enum(["france-2026", "uk-2026", "effective"]),
  annualGross: z.number().nonnegative(),
  employeeContributionRate: z.number().min(0).max(0.6),
  effectiveTaxRate: z.number().min(0).max(0.6),
  monthlyRent: z.number().nonnegative(),
  monthlyLiving: z.number().nonnegative(),
  relocation: z.number().nonnegative(),
  flexibility: z.number().min(0).max(100),
  belonging: z.number().min(0).max(100),
  growth: z.number().min(0).max(100),
  risk: z.number().min(0).max(100),
  shockTravelMultiplier: z.number().min(0).max(2),
  shockEnergySensitivity: z.number().min(0).max(2),
  commitmentMonth: z.number().int().min(1).max(12),
  accent: z.string().trim().min(1).max(32),
  sourceIds: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
});

export const decisionSchema = z.object({
  domain: z.enum(["career", "moving", "relationships", "education", "life"]).default("career"),
  question: z.string().trim().min(8).max(500),
  startingSavingsEur: z.number(),
  priorities: z.object({
    security: z.number().min(0).max(100),
    energy: z.number().min(0).max(100),
    belonging: z.number().min(0).max(100),
    optionality: z.number().min(0).max(100),
  }).default({ security: 28, energy: 24, belonging: 22, optionality: 26 }),
  shock: z.object({
    month: z.number().int().min(1).max(12),
    monthlyCostEur: z.number().nonnegative(),
    travelCostEur: z.number().nonnegative(),
    energyPenalty: z.number().min(0).max(100),
    belongingPenalty: z.number().min(0).max(100),
    label: z.string().trim().min(3).max(160),
  }),
  contextLenses: z.array(z.object({
    id: z.string().trim().regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores only.").min(1).max(64),
    label: z.string().trim().min(3).max(96),
    protectedValues: z.array(z.string().trim().min(1).max(48)).min(1).max(4),
    knownConcern: z.string().trim().min(3).max(320),
    unknown: z.string().trim().min(3).max(320),
    provenanceLabel: z.literal("user-authored perspective"),
  })).max(2).default([]),
  calibrations: z.array(z.object({
    id: z.string().trim().regex(/^[a-zA-Z0-9_-]+$/).min(1).max(80),
    createdAt: z.string().datetime(),
    experimentTitle: z.string().trim().min(1).max(160),
    observedSignals: z.array(z.string().trim().min(1).max(180)).max(3),
    revisedPriority: z.enum(["security", "energy", "belonging", "optionality"]),
    previousValue: z.number().min(0).max(100),
    nextValue: z.number().min(0).max(100),
    note: z.string().trim().max(320),
  })).max(12).default([]),
  // The submitted experience, witness architecture, and comparison UI are
  // deliberately designed around four futures: safe, ambitious, negotiated,
  // and nonlinear. Keep that contract explicit instead of implying a dynamic
  // witness count the UI does not offer controls for.
  options: z.array(decisionOptionSchema).length(4),
});

export const monthStateSchema = z.object({
  month: z.number().int().min(1).max(12),
  label: z.string(),
  savingsEur: z.number(),
  disposableEur: z.number(),
  energy: z.number().min(0).max(100),
  belonging: z.number().min(0).max(100),
  optionality: z.number().min(0).max(100),
  shockActive: z.boolean(),
  event: z.string().nullable(),
});

export const futureSchema = z.object({
  optionId: z.string(),
  title: z.string(),
  subtitle: z.string(),
  location: z.string(),
  accent: z.string(),
  months: z.array(monthStateSchema).length(12),
  metrics: z.object({
    annualNetIncomeEur: z.number(),
    taxAndContributionsEur: z.number(),
    monthlyFixedCostEur: z.number(),
    yearEndSavingsEur: z.number(),
    averageEnergy: z.number(),
    averageBelonging: z.number(),
    optionality: z.number(),
    composite: z.number(),
  }),
  irreversibleAt: z.object({
    month: z.number(),
    label: z.string(),
    reason: z.string(),
  }),
  trace: z.array(z.object({
    id: z.string(),
    field: z.string(),
    formula: z.string(),
    sourceIds: z.array(z.string()),
    value: z.number().optional(),
    unit: z.string().optional(),
  })),
});

export const witnessLensSchema = z.string().regex(/^(financial-resilience|belonging|reversibility|adversarial-regret|context:[a-zA-Z0-9_-]+)$/);
export const qualitativeAssessmentSchema = z.enum(["protects", "strains", "trades-off"]);
export const qualitativeFocusSchema = z.enum(["financial-runway", "daily-belonging", "exit-flexibility", "downside-exposure"]);
export const uncertaintySchema = z.enum(["daily-rhythm", "support-network", "reversal-cost", "downside-tolerance"]);
export const signalSchema = z.enum(["energy-pattern", "support-seeking", "commitment-resistance", "recovery-time"]);
export const witnessSchema = z.object({
  lens: witnessLensSchema,
  protectedValue: z.string().trim().min(3).max(96),
  ledgerHash: z.string(),
  observations: z.array(z.object({
    optionId: z.string(),
    baselineAssessment: qualitativeAssessmentSchema,
    shockedAssessment: qualitativeAssessmentSchema,
    focus: qualitativeFocusSchema,
  })).length(4),
  uncertaintyToTest: uncertaintySchema,
  observableSignal: signalSchema,
  fallback: z.boolean().default(false),
});

const traceRecordSchema = z.object({
  id: z.string(),
  value: z.number(),
  formula: z.string(),
  sourceIds: z.array(z.string()).min(1),
  unit: z.string(),
});

const displayFieldSchema = traceRecordSchema.extend({ traceId: z.string(), traceStatus: z.literal("traced") });

export const simulationSchema = z.object({
  decision: decisionSchema,
  baseline: z.array(futureSchema),
  shocked: z.array(futureSchema),
  witnesses: z.array(witnessSchema).min(4).max(6),
  divergence: z.object({
    baseline: z.number(),
    shocked: z.number(),
    delta: z.number(),
    explanation: z.string(),
  }),
  experiment: z.object({
    title: z.string(),
    hypothesis: z.string(),
    durationDays: z.literal(14),
    costEur: z.number().nonnegative(),
    firstStep: z.string(),
    evidence: z.array(z.string()),
    uncertainty: uncertaintySchema,
  }),
  sources: z.array(sourceSchema),
  generatedBy: z.object({
    engine: z.enum(["deterministic", "gpt-5.6"]),
    model: z.string().nullable(),
    responseIds: z.array(z.string()),
    durationMs: z.number().nonnegative().optional(),
    synthesisReturned: z.boolean().default(false),
  }),
  audit: z.object({
    tracedNumericFields: z.number().int().nonnegative(),
    untracedNumericFields: z.number().int().nonnegative(),
    sourceCoverage: z.number().min(0).max(1),
    traceRecords: z.array(traceRecordSchema),
    displayManifest: z.array(displayFieldSchema),
  }),
});

export type Decision = z.infer<typeof decisionSchema>;
export type DecisionOption = z.infer<typeof decisionOptionSchema>;
export type Future = z.infer<typeof futureSchema>;
export type Witness = z.infer<typeof witnessSchema>;
export type Simulation = z.infer<typeof simulationSchema>;
export type Uncertainty = z.infer<typeof uncertaintySchema>;
export type ContextLens = z.infer<typeof decisionSchema>[
  "contextLenses"
][number];
export type CalibrationRecord = z.infer<typeof decisionSchema>["calibrations"][number];
