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
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  location: z.string(),
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
  accent: z.string(),
  sourceIds: z.array(z.string()).min(1),
});

export const decisionSchema = z.object({
  domain: z.enum(["career", "moving", "relationships", "education", "life"]).default("career"),
  question: z.string(),
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
    label: z.string(),
  }),
  options: z.array(decisionOptionSchema).min(2).max(4),
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
  witness: z.object({
    lens: z.string(),
    tension: z.string(),
    turningPoint: z.string(),
    signalToWatch: z.string(),
  }).optional(),
  trace: z.array(z.object({
    field: z.string(),
    formula: z.string(),
    sourceIds: z.array(z.string()),
    value: z.number().optional(),
    unit: z.string().optional(),
  })),
});

export const simulationSchema = z.object({
  decision: decisionSchema,
  baseline: z.array(futureSchema),
  shocked: z.array(futureSchema),
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
  }),
  sources: z.array(sourceSchema),
  generatedBy: z.object({
    engine: z.enum(["deterministic", "gpt-5.6"]),
    model: z.string().nullable(),
    responseIds: z.array(z.string()),
    durationMs: z.number().nonnegative().optional(),
  }),
  audit: z.object({
    tracedNumericFields: z.number().int().nonnegative(),
    untracedNumericFields: z.number().int().nonnegative(),
    sourceCoverage: z.number().min(0).max(1),
  }),
});

export type Decision = z.infer<typeof decisionSchema>;
export type DecisionOption = z.infer<typeof decisionOptionSchema>;
export type Future = z.infer<typeof futureSchema>;
export type Simulation = z.infer<typeof simulationSchema>;
