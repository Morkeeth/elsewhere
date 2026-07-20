import { runSimulation, sampleDecision } from "../lib/engine";
import { makeStory } from "../lib/journeys";
import type { Decision } from "../lib/schema";

type EvalResult = { case: string; passed: boolean; evidence: string };

const decisions: Array<{ name: string; decision: Decision }> = [
  { name: "cross-border-care", decision: sampleDecision },
  {
    name: "early-financial-shock",
    decision: { ...sampleDecision, shock: { ...sampleDecision.shock, month: 2, monthlyCostEur: 1_250, travelCostEur: 480 } },
  },
  {
    name: "low-savings-transition",
    decision: { ...sampleDecision, startingSavingsEur: 3_000, shock: { ...sampleDecision.shock, month: 9 } },
  },
  { name: "two-apartments", decision: makeStory("apartments") },
  { name: "two-internal-roles", decision: makeStory("internal-roles") },
  { name: "relationship-next-move", decision: makeStory("relationship-next-move") },
];

const results: EvalResult[] = [];
for (const { name, decision } of decisions) {
  const first = runSimulation(decision);
  const second = runSimulation(decision);
  const serialized = JSON.stringify(first);
  results.push(
    { case: `${name}/schema`, passed: first.baseline.length === decision.options.length && first.shocked.every((future) => future.months.length === 12), evidence: `${first.baseline.length} futures × 12 months × 2 states` },
    { case: `${name}/reproducibility`, passed: serialized === JSON.stringify(second), evidence: "identical world-state record across repeated runs" },
    { case: `${name}/traceability`, passed: first.audit.sourceCoverage === 1 && first.audit.untracedNumericFields === 0, evidence: `${Math.round(first.audit.sourceCoverage * 100)}% trace coverage` },
    { case: `${name}/shock-causality`, passed: first.shocked.every((future, index) => future.metrics.yearEndSavingsEur <= first.baseline[index].metrics.yearEndSavingsEur), evidence: `divergence delta ${first.divergence.delta}` },
    { case: `${name}/reversible-experiment`, passed: first.experiment.durationDays === 14 && first.experiment.costEur <= 250 && first.experiment.evidence.length >= 3, evidence: `€${first.experiment.costEur}, ${first.experiment.evidence.length} observable signals` },
  );
}

for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.case.padEnd(44)} ${result.evidence}`);
}

const passed = results.filter((result) => result.passed).length;
console.log(`\n${passed}/${results.length} evaluation checks passed.`);
if (passed !== results.length) process.exitCode = 1;
