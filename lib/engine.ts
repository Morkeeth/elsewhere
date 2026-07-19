import sampleDecisionJson from "@/data/sample-decision.json";
import sourcesJson from "@/data/sources.json";
import { groundOption } from "@/lib/grounding";
import {
  decisionSchema,
  futureSchema,
  simulationSchema,
  sourceSchema,
  type Decision,
  type DecisionOption,
  type Assumption,
  type AssumptionId,
  type BreakpointAnalysis,
  type Future,
  type Simulation,
  type Uncertainty,
  type Witness,
} from "@/lib/schema";

const monthLabels = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 0) => Math.round(value * 10 ** digits) / 10 ** digits;

export const sampleDecision = decisionSchema.parse(sampleDecisionJson);
export const groundingSources = sourceSchema.array().parse(sourcesJson);

function simulateFuture(option: DecisionOption, decision: Decision, shockEnabled: boolean): Future {
  const grounded = groundOption(option);
  const monthlyNet = grounded.payroll.annualNetEur / 12;
  const monthlyFixedCostEur = grounded.monthlyRentEur + grounded.monthlyLivingEur;
  let savings = decision.startingSavingsEur - grounded.relocationEur;

  const months = monthLabels.map((label, index) => {
    const month = index + 1;
    const shockActive = shockEnabled && month >= decision.shock.month;
    const shockCost = shockActive ? decision.shock.monthlyCostEur : 0;
    const travelCost = shockActive ? decision.shock.travelCostEur * option.shockTravelMultiplier : 0;
    const disposable = monthlyNet - monthlyFixedCostEur - shockCost - travelCost;
    savings += disposable;

    const settlingPenalty = Math.max(0, 4 - month) * option.risk * 0.07;
    const shockEnergyPenalty = shockActive
      ? decision.shock.energyPenalty * option.shockEnergySensitivity + (100 - option.flexibility) * 0.12
      : 0;
    const energy = clamp(78 + option.flexibility * 0.08 - option.risk * 0.12 - settlingPenalty - shockEnergyPenalty);
    const belonging = clamp(
      option.belonging + Math.min(month - 1, 7) * (100 - option.belonging) * 0.025 -
      (shockActive ? decision.shock.belongingPenalty * option.shockTravelMultiplier : 0),
    );
    const runwayBoost = clamp(savings / 600, -20, 20);
    const commitmentPressure = Math.max(0, 9 - option.commitmentMonth) * 0.9;
    const optionality = clamp(option.flexibility * 0.55 + option.growth * 0.3 - option.risk * 0.18 + runwayBoost - commitmentPressure);

    let event: string | null = null;
    if (month === 1 && grounded.relocationEur > 0) event = "The first cost arrives before the first reward.";
    if (month === option.commitmentMonth) event = "The path begins closing behind you.";
    if (shockEnabled && month === decision.shock.month) event = decision.shock.label;

    return {
      month,
      label,
      savingsEur: round(savings),
      disposableEur: round(disposable),
      energy: round(energy, 1),
      belonging: round(belonging, 1),
      optionality: round(optionality, 1),
      shockActive,
      event,
    };
  });

  const average = (key: "energy" | "belonging" | "optionality") => months.reduce((sum, month) => sum + month[key], 0) / months.length;
  const yearEndSavingsEur = months.at(-1)?.savingsEur ?? savings;
  const averageEnergy = average("energy");
  const averageBelonging = average("belonging");
  const optionality = average("optionality");
  const moneyScore = clamp(50 + yearEndSavingsEur / 1000);
  const weightTotal = Object.values(decision.priorities).reduce((sum, value) => sum + value, 0) || 1;
  const composite = (
    moneyScore * decision.priorities.security +
    averageEnergy * decision.priorities.energy +
    averageBelonging * decision.priorities.belonging +
    optionality * decision.priorities.optionality
  ) / weightTotal;
  const sourceIds = [...new Set([...option.sourceIds, ...grounded.payroll.sourceIds, ...grounded.fxSourceIds, "formula-budget"])];

  return futureSchema.parse({
    optionId: option.id,
    title: option.title,
    subtitle: option.subtitle,
    location: option.location,
    accent: option.accent,
    months,
    metrics: {
      annualNetIncomeEur: round(grounded.payroll.annualNetEur),
      taxAndContributionsEur: round(grounded.payroll.taxAndContributionsEur),
      monthlyFixedCostEur: round(monthlyFixedCostEur),
      yearEndSavingsEur: round(yearEndSavingsEur),
      averageEnergy: round(averageEnergy, 1),
      averageBelonging: round(averageBelonging, 1),
      optionality: round(optionality, 1),
      composite: round(composite, 1),
    },
    irreversibleAt: {
      month: option.commitmentMonth,
      label: monthLabels[option.commitmentMonth - 1],
      reason: option.commitmentMonth <= 3
        ? "Upfront commitments make reversal materially expensive."
        : "Accumulated commitments and switching costs overtake the easy exit.",
    },
    trace: [
      {
        id: `${option.id}.annual-net-income`,
        field: "annual net income",
        formula: `${option.taxProfile} progressive payroll calculation`,
        sourceIds,
        value: round(grounded.payroll.annualNetEur),
        unit: "EUR/year",
      },
      {
        id: `${option.id}.monthly-fixed-cost`,
        field: "monthly fixed costs",
        formula: "currency-normalized rent + living costs",
        sourceIds,
        value: round(monthlyFixedCostEur),
        unit: "EUR/month",
      },
      {
        id: `${option.id}.monthly-disposable-income`,
        field: "monthly disposable income",
        formula: "annual net ÷ 12 − fixed costs − shock care − shock travel",
        sourceIds,
      },
      {
        id: `${option.id}.year-end-savings`,
        field: "year-end savings",
        formula: "starting savings − relocation + Σ monthly disposable income",
        sourceIds,
        value: round(yearEndSavingsEur),
        unit: "EUR",
      },
      {
        id: `${option.id}.average-energy`,
        field: "average energy",
        formula: "mean of twelve deterministic monthly energy states",
        sourceIds: ["user-scenario", "formula-budget"],
        value: round(averageEnergy, 1),
        unit: "score/100",
      },
      {
        id: `${option.id}.average-belonging`,
        field: "average belonging",
        formula: "mean of twelve deterministic monthly belonging states",
        sourceIds: ["user-scenario", "formula-budget"],
        value: round(averageBelonging, 1),
        unit: "score/100",
      },
      {
        id: `${option.id}.optionality`,
        field: "optionality",
        formula: "mean of twelve deterministic optionality states including editable commitment timing",
        sourceIds: ["user-scenario", "formula-budget"],
        value: round(optionality, 1),
        unit: "score/100",
      },
      {
        id: `${option.id}.commitment-month`,
        field: "commitment assumption",
        formula: "editable user commitment-month assumption",
        sourceIds: ["user-scenario"],
        value: option.commitmentMonth,
        unit: "month",
      },
      {
        id: `${option.id}.composite`,
        field: "composite",
        formula: `user weights: ${decision.priorities.security} security + ${decision.priorities.energy} energy + ${decision.priorities.belonging} belonging + ${decision.priorities.optionality} optionality`,
        sourceIds: ["formula-budget"],
        value: round(composite, 1),
        unit: "score/100",
      },
    ],
  });
}

function divergenceScore(futures: Future[]) {
  const vectors = futures.map((future) => [
    clamp(50 + future.metrics.yearEndSavingsEur / 1000),
    future.metrics.averageEnergy,
    future.metrics.averageBelonging,
    future.metrics.optionality,
  ]);
  let total = 0;
  let pairs = 0;
  for (let left = 0; left < vectors.length; left += 1) {
    for (let right = left + 1; right < vectors.length; right += 1) {
      total += Math.sqrt(vectors[left].reduce((sum, value, index) => sum + (value - vectors[right][index]) ** 2, 0)) / 2;
      pairs += 1;
    }
  }
  return round(total / Math.max(1, pairs), 1);
}

type TraceRecord = { id: string; value: number; formula: string; sourceIds: string[]; unit: string };

export function validateDisplayManifest(displayManifest: Array<TraceRecord & { traceId: string; traceStatus: "traced" }>, traceRecords: TraceRecord[]) {
  const knownSourceIds = new Set(groundingSources.map((source) => source.id));
  const traced = displayManifest.filter((field) => {
    const trace = traceRecords.find((entry) => entry.id === field.traceId);
    return trace && trace.value === field.value && trace.formula === field.formula && trace.unit === field.unit && trace.sourceIds.join("|") === field.sourceIds.join("|") && trace.sourceIds.every((id) => knownSourceIds.has(id));
  }).length;
  return { tracedNumericFields: traced, untracedNumericFields: displayManifest.length - traced, sourceCoverage: displayManifest.length ? round(traced / displayManifest.length, 3) : 0 };
}

export function auditTrace(baseline: Future[], shocked: Future[], divergence: { baseline: number; shocked: number; delta: number }, experiment: { durationDays: 14; costEur: number; evidence: string[] }, breakpoint: BreakpointAnalysis) {
  const entries = ([
    ["baseline", baseline],
    ["shocked", shocked],
  ] as const).flatMap(([state, futures]) => futures.flatMap((future) => future.trace)
    .filter((entry) => entry.value !== undefined)
    .map((entry) => ({
      id: `${state}.${entry.id}`,
      value: entry.value!,
      formula: entry.formula,
      sourceIds: entry.sourceIds,
      unit: entry.unit ?? "unitless",
    })));
  const traceRecords: TraceRecord[] = entries;
  for (const [state, futures] of [["baseline", baseline], ["shocked", shocked]] as const) {
    for (const future of futures) {
      for (const month of future.months) {
        traceRecords.push({
          id: `${state}.${future.optionId}.month-${month.month}.optionality`,
          value: month.optionality,
          formula: "deterministic monthly optionality state rendered in the future timeline",
          sourceIds: ["user-scenario", "formula-budget"],
          unit: "score/100",
        });
      }
    }
  }
  traceRecords.push(
    { id: "divergence.baseline", value: divergence.baseline, formula: "mean pairwise distance across deterministic future vectors", sourceIds: ["formula-budget"], unit: "score" },
    { id: "divergence.shocked", value: divergence.shocked, formula: "mean pairwise distance across deterministic shocked future vectors", sourceIds: ["formula-budget"], unit: "score" },
    { id: "experiment.duration", value: experiment.durationDays, formula: "fixed reversible-experiment duration", sourceIds: ["formula-budget"], unit: "days" },
    { id: "experiment.cost", value: experiment.costEur, formula: "deterministic travel and relocation-derived experiment budget", sourceIds: ["user-scenario", "formula-budget"], unit: "EUR" },
    { id: "experiment.signals", value: experiment.evidence.length, formula: "fixed deterministic evidence checklist length", sourceIds: ["formula-budget"], unit: "signals" },
    { id: `breakpoint.${breakpoint.assumption.id}.reference`, value: breakpoint.referenceValue, formula: "selected scenario assumption reference value", sourceIds: ["user-scenario", "formula-budget"], unit: breakpoint.assumption.unit },
  );
  for (const [pointIndex, point] of breakpoint.points.entries()) {
    for (const fit of point.fits) {
      traceRecords.push({
        id: `breakpoint.${breakpoint.assumption.id}.point-${pointIndex}.${fit.optionId}.fit`,
        value: fit.fit,
        formula: breakpoint.referenceFitFormula,
        sourceIds: ["user-scenario", "formula-budget"],
        unit: "fit/100",
      });
    }
  }
  // This list deliberately starts from the fields rendered by Timeline and the
  // main screen, not from existing trace rows. A trace can now be absent while
  // the expected display field remains, making the audit fail.
  const displayManifest = ([
    ...(["baseline", "shocked"] as const).flatMap((state) => {
      const futures = state === "baseline" ? baseline : shocked;
      return futures.flatMap((future) => [
        `${state}.${future.optionId}.annual-net-income`,
        `${state}.${future.optionId}.monthly-fixed-cost`,
        `${state}.${future.optionId}.year-end-savings`,
        `${state}.${future.optionId}.average-energy`,
        `${state}.${future.optionId}.average-belonging`,
        `${state}.${future.optionId}.optionality`,
        ...future.months.map((month) => `${state}.${future.optionId}.month-${month.month}.optionality`),
      ]);
    }),
    "divergence.baseline",
    "divergence.shocked",
    "experiment.duration",
    "experiment.cost",
    "experiment.signals",
    `breakpoint.${breakpoint.assumption.id}.reference`,
    ...breakpoint.points.flatMap((point, pointIndex) => point.fits.map((fit) => `breakpoint.${breakpoint.assumption.id}.point-${pointIndex}.${fit.optionId}.fit`)),
  ]).map((id) => {
    const trace = traceRecords.find((entry) => entry.id === id);
    // The expected field stays explicit even if its trace was removed.
    if (trace) return { ...trace, traceId: id, traceStatus: "traced" as const };
    return { id, value: Number.NaN, formula: "missing trace", sourceIds: ["formula-budget"], unit: "unknown", traceId: id, traceStatus: "traced" as const };
  });
  const summary = validateDisplayManifest(displayManifest, traceRecords);
  return {
    ...summary,
    traceRecords,
    displayManifest,
  };
}

export const coreWitnessLenses: Array<Pick<Witness, "lens" | "protectedValue">> = [
  { lens: "financial-resilience", protectedValue: "Financial resilience" },
  { lens: "belonging", protectedValue: "Belonging and relationships" },
  { lens: "reversibility", protectedValue: "Reversibility and optionality" },
  { lens: "adversarial-regret", protectedValue: "Adversarial failure and regret" },
];

export function createFallbackWitnesses(
  futures: Future[],
  ledgerHash = "deterministic-only",
  additionalLenses: Array<Pick<Witness, "lens" | "protectedValue">> = [],
): Witness[] {
  return [...coreWitnessLenses, ...additionalLenses].map((witness) => ({
    ...witness,
    ledgerHash,
    observations: futures.map((future) => ({ optionId: future.optionId, baselineAssessment: "trades-off", shockedAssessment: "trades-off", focus: "exit-flexibility" })),
    uncertaintyToTest: "daily-rhythm",
    observableSignal: "energy-pattern",
    fallback: true,
  }));
}

function defaultUncertainty(option: DecisionOption): Uncertainty {
  if (option.shockTravelMultiplier >= 0.8) return "support-network";
  if (option.commitmentMonth <= 3) return "reversal-cost";
  if (option.risk >= 60) return "downside-tolerance";
  return "daily-rhythm";
}

export function buildExperiment(decision: Decision, baseline: Future[], uncertainty = defaultUncertainty(decision.options.find((option) => option.id === baseline[0]?.optionId) ?? decision.options[0])) {
  const uncertaintyOption = [...decision.options].sort((a, b) => b.risk * b.growth * (100 - b.belonging) - a.risk * a.growth * (100 - a.belonging))[0];
  const challenger = baseline.find((future) => future.optionId === uncertaintyOption.id) ?? baseline[0];
  const challengerOption = decision.options.find((option) => option.id === challenger.optionId)!;
  const groundedChallenger = groundOption(challengerOption);
  const costEur = round(Math.min(250, Math.max(40, groundedChallenger.relocationEur * 0.04)));
  const hypothesis = {
    "daily-rhythm": `Test how ${challenger.title.toLowerCase()} changes an ordinary day before treating it as a future you understand.`,
    "support-network": `Test who is actually available when ${challenger.title.toLowerCase()} becomes difficult, rather than assuming support will travel with you.`,
    "reversal-cost": `Test what it feels like to keep an exit open in ${challenger.title.toLowerCase()} before a commitment makes that harder.`,
    "downside-tolerance": `Test how ${challenger.title.toLowerCase()} feels under a deliberately inconvenient week before treating the upside as durable.`,
  }[uncertainty];
  const evidence = {
    "daily-rhythm": ["Record energy at 11:00 and 18:00 each day.", "Notice which part of the day you want to repeat.", "Write the friction you would accept again."],
    "support-network": ["Record who responds when a plan changes.", "Notice where practical help actually appears.", "Write the support you would need to replace."],
    "reversal-cost": ["List each commitment before making it.", "Notice which exit you hesitate to preserve.", "Write the cost of changing your mind."],
    "downside-tolerance": ["Introduce one ordinary inconvenience.", "Record recovery after the disruption.", "Write what still feels worth protecting."],
  }[uncertainty];
  return {
    title: `Borrow ${challenger.location} for two weeks`,
    hypothesis,
    durationDays: 14 as const,
    costEur,
    firstStep: challengerOption.shockTravelMultiplier >= 0.8
      ? `Ask the ${challenger.location} team for two shadow days and reserve a refundable return ticket.`
      : "Put two representative days from this future into next week’s calendar before noon tomorrow.",
    evidence,
    uncertainty,
  };
}

const uncertaintyAssumption: Record<Uncertainty, AssumptionId> = {
  "daily-rhythm": "shock-energy",
  "support-network": "travel-burden",
  "reversal-cost": "commitment-timing",
  "downside-tolerance": "shock-cost",
};

export function assumptionForUncertainty(uncertainty: Uncertainty) {
  return uncertaintyAssumption[uncertainty];
}

export function assumptionRegister(decision: Decision): Assumption[] {
  const commitmentAverage = round(decision.options.reduce((total, option) => total + option.commitmentMonth, 0) / decision.options.length);
  const register: Assumption[] = [
    { id: "shock-cost", label: "Recurring shock cost", provenance: "scenario-assumption", currentValue: decision.shock.monthlyCostEur, unit: "EUR/month", min: 0, max: Math.max(3_000, decision.shock.monthlyCostEur * 3), sweepPoints: [0, 500, 1_000, 1_500, 2_000, 2_500, 3_000], uncertainty: "downside-tolerance", affects: "monthly savings and optionality after the shock", adverseDirection: "higher" },
    { id: "travel-burden", label: "Recurring travel burden", provenance: "scenario-assumption", currentValue: decision.shock.travelCostEur, unit: "EUR/month", min: 0, max: Math.max(2_000, decision.shock.travelCostEur * 3), sweepPoints: [0, 300, 600, 900, 1_200, 1_500, 1_800], uncertainty: "support-network", affects: "monthly savings, belonging, and paths with high travel sensitivity", adverseDirection: "higher" },
    { id: "shock-energy", label: "Shock energy impact", provenance: "scenario-assumption", currentValue: decision.shock.energyPenalty, unit: "points", min: 0, max: 100, sweepPoints: [0, 15, 30, 45, 60, 75, 90], uncertainty: "daily-rhythm", affects: "monthly energy and the personal fit calculation after the shock", adverseDirection: "higher" },
    { id: "shock-belonging", label: "Shock belonging impact", provenance: "scenario-assumption", currentValue: decision.shock.belongingPenalty, unit: "points", min: 0, max: 100, sweepPoints: [0, 15, 30, 45, 60, 75, 90], uncertainty: "support-network", affects: "monthly belonging after the shock", adverseDirection: "higher" },
    { id: "starting-runway", label: "Starting runway", provenance: "user-estimate", currentValue: decision.startingSavingsEur, unit: "EUR", min: 0, max: Math.max(20_000, decision.startingSavingsEur * 2), sweepPoints: [0, 3_000, 6_000, 9_000, 12_000, 15_000, 18_000], uncertainty: "downside-tolerance", affects: "initial savings, year-end savings, and optionality", adverseDirection: "lower" },
    { id: "commitment-timing", label: "Commitment timing", provenance: "user-estimate", currentValue: commitmentAverage, unit: "month", min: 1, max: 12, sweepPoints: [1, 3, 5, 7, 9, 11, 12], uncertainty: "reversal-cost", affects: "the editable commitment assumption shown for every future", adverseDirection: "lower" },
  ];
  return register.map((assumption) => ({ ...assumption, sweepPoints: [...new Set([...assumption.sweepPoints, assumption.currentValue])].filter((value) => value >= assumption.min && value <= assumption.max).sort((a, b) => a - b) }));
}

export function applyAssumption(decision: Decision, id: AssumptionId, value: number): Decision {
  const next = structuredClone(decision);
  if (id === "shock-cost") next.shock.monthlyCostEur = value;
  if (id === "travel-burden") next.shock.travelCostEur = value;
  if (id === "shock-energy") next.shock.energyPenalty = value;
  if (id === "shock-belonging") next.shock.belongingPenalty = value;
  if (id === "starting-runway") next.startingSavingsEur = value;
  if (id === "commitment-timing") next.options = next.options.map((option) => ({ ...option, commitmentMonth: Math.max(1, Math.min(12, Math.round(value))) }));
  return decisionSchema.parse(next);
}

function fitFor(future: Future) {
  return future.metrics.composite;
}

export function buildBreakpointAnalysis(decision: Decision, uncertainty = defaultUncertainty(decision.options[0])): BreakpointAnalysis {
  const assumption = assumptionRegister(decision).find((item) => item.id === assumptionForUncertainty(uncertainty))!;
  const reference = runSimulationWorld(decision);
  const referenceFits = new Map(reference.shocked.map((future) => [future.optionId, fitFor(future)]));
  const points = assumption.sweepPoints.map((value) => {
    const world = runSimulationWorld(applyAssumption(decision, assumption.id, value));
    return {
      value,
      fits: world.shocked.map((future) => {
        const referenceFit = referenceFits.get(future.optionId) ?? fitFor(future);
        const decline = referenceFit - fitFor(future);
        return { optionId: future.optionId, fit: fitFor(future), state: decline >= 3 ? "fragile" as const : decline >= 1 ? "sensitive" as const : "robust" as const };
      }),
    };
  });
  const adversePoints = [...points].sort((left, right) => assumption.adverseDirection === "higher" ? left.value - right.value : right.value - left.value);
  return {
    assumption,
    referenceFitFormula: "personal fit = weighted mean of deterministic security, energy, belonging, and optionality metrics; sensitive when fit declines by 1 point and fragile when it declines by 3 points from the reference state",
    referenceValue: assumption.currentValue,
    points,
    futures: reference.shocked.map((future) => {
      const referenceFit = referenceFits.get(future.optionId) ?? fitFor(future);
      const hit = adversePoints.find((point) => point.fits.find((fit) => fit.optionId === future.optionId)?.state === "fragile");
      const breakpointFit = hit?.fits.find((fit) => fit.optionId === future.optionId)?.fit ?? null;
      return { optionId: future.optionId, referenceFit, breakpointValue: hit?.value ?? null, breakpointFit };
    }),
  };
}

function runSimulationWorld(decision: Decision) {
  const baseline = decision.options.map((option) => simulateFuture(option, decision, false));
  const shocked = decision.options.map((option) => simulateFuture(option, decision, true));
  return { baseline, shocked };
}

export function runSimulation(input: Decision = sampleDecision): Simulation {
  const decision = decisionSchema.parse(input);
  const { baseline, shocked } = runSimulationWorld(decision);
  const baselineDivergence = divergenceScore(baseline);
  const shockedDivergence = divergenceScore(shocked);
  const experiment = buildExperiment(decision, baseline);
  const breakpoint = buildBreakpointAnalysis(decision, experiment.uncertainty);
  const divergence = {
    baseline: baselineDivergence,
    shocked: shockedDivergence,
    delta: round(shockedDivergence - baselineDivergence, 1),
  };
  return simulationSchema.parse({
    decision,
    baseline,
    shocked,
    witnesses: createFallbackWitnesses(
      baseline,
      "deterministic-only",
      decision.contextLenses.map((context) => ({ lens: `context:${context.id}`, protectedValue: context.label })),
    ),
    divergence: {
      ...divergence,
      explanation: shockedDivergence > baselineDivergence
        ? "The shock widens the distance between the lives; flexibility and proximity become more valuable."
        : "The shock compresses the lives; their trade-offs become more alike.",
    },
    experiment,
    breakpoint,
    sources: groundingSources,
    generatedBy: { engine: "deterministic", model: null, responseIds: [], durationMs: 0, synthesisReturned: false },
    audit: auditTrace(baseline, shocked, divergence, experiment, breakpoint),
  });
}
