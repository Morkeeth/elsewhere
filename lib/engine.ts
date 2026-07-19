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
  type Future,
  type Simulation,
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
    const optionality = clamp(option.flexibility * 0.55 + option.growth * 0.3 - option.risk * 0.18 + runwayBoost);

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
        field: "annual net income",
        formula: `${option.taxProfile} progressive payroll calculation`,
        sourceIds,
        value: round(grounded.payroll.annualNetEur),
        unit: "EUR/year",
      },
      {
        field: "monthly fixed costs",
        formula: "currency-normalized rent + living costs",
        sourceIds,
        value: round(monthlyFixedCostEur),
        unit: "EUR/month",
      },
      {
        field: "monthly disposable income",
        formula: "annual net ÷ 12 − fixed costs − shock care − shock travel",
        sourceIds,
      },
      {
        field: "year-end savings",
        formula: "starting savings − relocation + Σ monthly disposable income",
        sourceIds,
        value: round(yearEndSavingsEur),
        unit: "EUR",
      },
      {
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

function auditTrace(futures: Future[]) {
  const entries = futures.flatMap((future) => future.trace);
  const knownSourceIds = new Set(groundingSources.map((source) => source.id));
  const traced = entries.filter((entry) => entry.formula && entry.sourceIds.length > 0 && entry.sourceIds.every((id) => knownSourceIds.has(id))).length;
  return {
    tracedNumericFields: traced,
    untracedNumericFields: entries.length - traced,
    sourceCoverage: entries.length ? round(traced / entries.length, 3) : 0,
  };
}

export function runSimulation(input: Decision = sampleDecision): Simulation {
  const decision = decisionSchema.parse(input);
  const baseline = decision.options.map((option) => simulateFuture(option, decision, false));
  const shocked = decision.options.map((option) => simulateFuture(option, decision, true));
  const baselineDivergence = divergenceScore(baseline);
  const shockedDivergence = divergenceScore(shocked);
  const sorted = [...baseline].sort((a, b) => b.metrics.composite - a.metrics.composite);
  const leader = sorted[0];
  const uncertaintyOption = [...decision.options].sort((a, b) => b.risk * b.growth * (100 - b.belonging) - a.risk * a.growth * (100 - a.belonging))[0];
  const challenger = baseline.find((future) => future.optionId === uncertaintyOption.id) ?? sorted[1] ?? sorted[0];
  const challengerOption = decision.options.find((option) => option.id === challenger.optionId)!;
  const groundedChallenger = groundOption(challengerOption);
  const experimentCost = Math.min(250, Math.max(40, groundedChallenger.relocationEur * 0.04));
  const allFutures = [...baseline, ...shocked];

  return simulationSchema.parse({
    decision,
    baseline,
    shocked,
    divergence: {
      baseline: baselineDivergence,
      shocked: shockedDivergence,
      delta: round(shockedDivergence - baselineDivergence, 1),
      explanation: shockedDivergence > baselineDivergence
        ? "The shock widens the distance between the lives; flexibility and proximity become more valuable."
        : "The shock compresses the lives; their trade-offs become more alike.",
    },
    experiment: {
      title: `Borrow ${challenger.location} for two weeks`,
      hypothesis: `Test whether ${challenger.title.toLowerCase()} preserves the energy and belonging the ledger cannot observe, before choosing ${leader.title.toLowerCase()} on numbers alone.`,
      durationDays: 14,
      costEur: round(experimentCost),
      firstStep: challengerOption.shockTravelMultiplier >= 0.8
        ? `Ask the ${challenger.location} team for two shadow days and reserve a refundable return ticket.`
        : "Put two representative days from this future into next week’s calendar before noon tomorrow.",
      evidence: [
        "Record energy at 11:00 and 18:00 each day.",
        "Track who you naturally call when the day goes wrong.",
        "Write the one commitment you resisted making in each future.",
      ],
    },
    sources: groundingSources,
    generatedBy: { engine: "deterministic", model: null, responseIds: [], durationMs: 0 },
    audit: auditTrace(allFutures),
  });
}
