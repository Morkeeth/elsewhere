import { z } from "zod";

const assumptionIds = ["shock-cost", "travel-burden", "shock-energy", "shock-belonging", "starting-runway", "commitment-timing", "office-days"] as const;

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
  jurisdiction: z.string().trim().min(1).max(96).default("Other"),
  country: z.enum(["FR", "UK", "OTHER"]),
  currency: z.enum(["EUR", "GBP"]),
  taxProfile: z.enum(["france-2026", "uk-2026", "effective"]),
  annualGross: z.number().nonnegative(),
  employeeContributionRate: z.number().min(0).max(0.6),
  effectiveTaxRate: z.number().min(0).max(0.6),
  monthlyRent: z.number().nonnegative(),
  monthlyLiving: z.number().nonnegative(),
  relocation: z.number().nonnegative(),
  weeklyHours: z.number().min(0).max(100).default(40),
  commuteMinutes: z.number().min(0).max(240).default(30),
  friendsMinutes: z.number().min(0).max(240).default(20),
  dailyLifeMinutes: z.number().min(0).max(240).default(15),
  natureMinutes: z.number().min(0).max(240).default(30),
  spaceSqm: z.number().min(0).max(2_000).default(45),
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
  context: z.string().trim().max(800).default(""),
  baselineDaysPerWeek: z.number().min(0).max(7).default(3),
  pressureDaysPerWeek: z.number().min(0).max(7).default(5),
  socialTripsPerWeek: z.number().min(0).max(14).default(2),
  dailyLifeTripsPerWeek: z.number().min(0).max(21).default(5),
  natureTripsPerWeek: z.number().min(0).max(14).default(1),
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
  calibrations: z.array(z.union([z.object({
    id: z.string().trim().regex(/^[a-zA-Z0-9_-]+$/).min(1).max(80),
    createdAt: z.string().datetime(),
    experimentTitle: z.string().trim().min(1).max(160),
    observedSignals: z.array(z.string().trim().min(1).max(180)).min(1).max(3),
    kind: z.literal("assumption-observation"),
    assumptionId: z.enum(assumptionIds),
    previousValue: z.number(),
    observedValue: z.number(),
    unit: z.string().min(1),
    provenance: z.literal("user-observed"),
    breakpoints: z.array(z.object({ optionId: z.string(), before: z.number().nullable(), after: z.number().nullable() })).min(2).max(4),
    note: z.string().trim().max(320),
  }).refine((record) => record.previousValue !== record.observedValue, "Observed evidence must change the tested assumption."), z.object({
    id: z.string().trim().regex(/^[a-zA-Z0-9_-]+$/).min(1).max(80),
    createdAt: z.string().datetime(),
    experimentTitle: z.string().trim().min(1).max(160),
    observedSignals: z.array(z.string().trim().min(1).max(180)).max(3),
    revisedPriority: z.enum(["security", "energy", "belonging", "optionality"]),
    previousValue: z.number().min(0).max(100),
    nextValue: z.number().min(0).max(100),
    note: z.string().trim().max(320),
  })])).max(12).default([]),
  // The number of futures and the number of value witnesses are independent.
  // A decision may contain two to four real alternatives; every witness must
  // still assess each alternative exactly once.
  options: z.array(decisionOptionSchema).min(2).max(4),
}).superRefine((decision, context) => {
  if (new Set(decision.options.map((option) => option.id)).size !== decision.options.length) {
    context.addIssue({ code: "custom", path: ["options"], message: "Every future needs a unique id." });
  }
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
  taxGrounding: z.object({
    ratePercent: z.number().min(0).max(120),
    status: z.enum(["sourced", "user-provided-unverified"]),
    label: z.string(),
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
export const assumptionIdSchema = z.enum(assumptionIds);
export const assumptionProvenanceSchema = z.enum(["public-fact", "user-estimate", "scenario-assumption", "unknown", "user-observed"]);
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
    baselineInsight: z.string().trim().min(12).max(180).optional(),
    shockedInsight: z.string().trim().min(12).max(180).optional(),
  })).min(2).max(4),
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

const assumptionSchema = z.object({
  id: assumptionIdSchema,
  label: z.string(),
  provenance: assumptionProvenanceSchema,
  currentValue: z.number(),
  unit: z.string(),
  min: z.number(),
  max: z.number(),
  sweepPoints: z.array(z.number()).min(3),
  uncertainty: uncertaintySchema,
  affects: z.string(),
  adverseDirection: z.enum(["lower", "higher"]),
});

const breakpointSchema = z.object({
  assumption: assumptionSchema,
  referenceFitFormula: z.string(),
  referenceValue: z.number(),
  points: z.array(z.object({
    value: z.number(),
    fits: z.array(z.object({ optionId: z.string(), fit: z.number(), state: z.enum(["robust", "sensitive", "fragile"]) })).min(2).max(4),
  })).min(3),
  futures: z.array(z.object({
    optionId: z.string(),
    referenceFit: z.number(),
    breakpointValue: z.number().nullable(),
    breakpointFit: z.number().nullable(),
  })).min(2).max(4),
});

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
  breakpoint: breakpointSchema,
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
}).superRefine((simulation, context) => {
  const optionIds = simulation.decision.options.map((option) => option.id);
  const matchesOptions = (ids: string[]) => ids.length === optionIds.length && new Set(ids).size === optionIds.length && optionIds.every((id) => ids.includes(id));

  if (!matchesOptions(simulation.baseline.map((future) => future.optionId))) {
    context.addIssue({ code: "custom", path: ["baseline"], message: "Baseline futures must match the decision options." });
  }
  if (!matchesOptions(simulation.shocked.map((future) => future.optionId))) {
    context.addIssue({ code: "custom", path: ["shocked"], message: "Shocked futures must match the decision options." });
  }
  simulation.witnesses.forEach((witness, index) => {
    if (!matchesOptions(witness.observations.map((observation) => observation.optionId))) {
      context.addIssue({ code: "custom", path: ["witnesses", index, "observations"], message: "Every witness must assess every option exactly once." });
    }
  });
});

export type Decision = z.infer<typeof decisionSchema>;
export type DecisionOption = z.infer<typeof decisionOptionSchema>;
export type Future = z.infer<typeof futureSchema>;
export type Witness = z.infer<typeof witnessSchema>;
export type Simulation = z.infer<typeof simulationSchema>;
export type Uncertainty = z.infer<typeof uncertaintySchema>;
export type AssumptionId = z.infer<typeof assumptionIdSchema>;
export type Assumption = z.infer<typeof assumptionSchema>;
export type BreakpointAnalysis = z.infer<typeof breakpointSchema>;
export type ContextLens = z.infer<typeof decisionSchema>[
  "contextLenses"
][number];
export type CalibrationRecord = z.infer<typeof decisionSchema>["calibrations"][number];
export type AssumptionCalibration = Extract<CalibrationRecord, { kind: "assumption-observation" }>;
