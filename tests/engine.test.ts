import assert from "node:assert/strict";
import test from "node:test";
import { buildExperiment, runSimulation, sampleDecision, validateDisplayManifest } from "../lib/engine";
import { calculateFrancePayroll, calculateUkPayroll, nativeToEur } from "../lib/grounding";
import { makeJourney, shockPresets } from "../lib/journeys";
import { assertQualitativeNarrative, buildWitnessJobs, ledgerHash } from "../lib/openai-engine";

test("returns four independent, schema-valid futures", () => {
  const result = runSimulation(sampleDecision);
  assert.equal(result.baseline.length, 4);
  assert.equal(result.shocked.length, 4);
  assert.equal(new Set(result.baseline.map((future) => future.optionId)).size, 4);
  assert.ok(result.baseline.every((future) => future.months.length === 12));
});

test("shock changes every path after month six", () => {
  const result = runSimulation(sampleDecision);
  result.baseline.forEach((future, index) => {
    assert.equal(future.months[4].savingsEur, result.shocked[index].months[4].savingsEur);
    assert.notEqual(future.months[6].savingsEur, result.shocked[index].months[6].savingsEur);
  });
});

test("every selectable shock preset carries explicit causal effects", () => {
  for (const presets of Object.values(shockPresets)) {
    for (const preset of presets) {
      assert.ok(preset.label.length > 3);
      assert.ok(preset.month >= 1 && preset.month <= 12);
      assert.ok(preset.monthlyCostEur >= 0);
      assert.ok(preset.travelCostEur >= 0);
      assert.ok(preset.energyPenalty >= 0);
      assert.ok(preset.belongingPenalty >= 0);
    }
  }
});

test("qualitative AI text rejects numeric and prescriptive claims", () => {
  assert.equal(assertQualitativeNarrative("This path protects room to adapt."), "This path protects room to adapt.");
  assert.throws(() => assertQualitativeNarrative("You should choose London."));
  assert.throws(() => assertQualitativeNarrative("It leaves €200 in reserve."));
  assert.throws(() => assertQualitativeNarrative("The wiser move is to settle on London."));
  assert.throws(() => assertQualitativeNarrative("It leaves one thousand euros in reserve."));
});

test("every displayed decision-outcome field has an independently matched trace", () => {
  const result = runSimulation(sampleDecision);
  assert.equal(result.audit.sourceCoverage, 1);
  assert.equal(result.audit.untracedNumericFields, 0);
  assert.equal(new Set(result.audit.displayManifest.map((field) => field.id)).size, result.audit.displayManifest.length);
  for (const field of result.audit.displayManifest) {
    const trace = result.audit.traceRecords.find((entry) => entry.id === field.traceId);
    assert.ok(trace);
    assert.equal(trace.value, field.value);
    assert.deepEqual(trace.sourceIds, field.sourceIds);
  }
});

test("removing an expected rendered trace makes the provenance audit fail", () => {
  const result = runSimulation(sampleDecision);
  const withoutTimelineTrace = result.audit.traceRecords.filter((trace) => trace.id !== "baseline.stay.month-1.optionality");
  const audit = validateDisplayManifest(result.audit.displayManifest, withoutTimelineTrace);
  assert.equal(audit.untracedNumericFields, 1);
  assert.ok(audit.sourceCoverage < 1);
});

test("every live witness job receives the identical immutable ledger payload", () => {
  const result = runSimulation(sampleDecision);
  const jobs = buildWitnessJobs(sampleDecision, result.baseline, result.shocked);
  assert.equal(jobs.length, 4);
  assert.equal(new Set(jobs.map((job) => job.input)).size, 1);
  assert.equal(new Set(jobs.map((job) => job.hash)).size, 1);
  assert.equal(new Set(jobs.map((job) => job.lens.lens)).size, 4);
});

test("shock preset changes the causal world state and every fallback witness receives one ledger receipt", () => {
  const decision = structuredClone(sampleDecision);
  decision.shock = shockPresets.career[2];
  const result = runSimulation(decision);
  const hash = ledgerHash(result.baseline, result.shocked);
  assert.ok(result.shocked.every((future, index) => future.months.at(-1)?.savingsEur !== result.baseline[index].months.at(-1)?.savingsEur));
  assert.ok(result.witnesses.every((witness) => witness.ledgerHash === "deterministic-only"));
  assert.match(hash, /^[a-f0-9]{16}$/);
});

test("all numeric outcomes carry a trace", () => {
  const result = runSimulation(sampleDecision);
  for (const future of [...result.baseline, ...result.shocked]) {
    assert.ok(future.trace.length >= 3);
    assert.ok(future.trace.every((entry) => entry.formula.length > 0 && entry.sourceIds.length > 0));
  }
  assert.equal(result.audit.untracedNumericFields, 0);
  assert.equal(result.audit.sourceCoverage, 1);
});

test("produces one reversible fourteen-day experiment", () => {
  const result = runSimulation(sampleDecision);
  assert.equal(result.experiment.durationDays, 14);
  assert.ok(result.experiment.firstStep.length > 20);
  assert.ok(result.experiment.costEur >= 0);
  assert.ok(result.experiment.costEur <= 250);
  assert.doesNotMatch(result.experiment.hypothesis, /before choosing|best option|you should/i);
  const synthesized = buildExperiment(sampleDecision, result.baseline, "support-network");
  assert.equal(synthesized.uncertainty, "support-network");
  assert.equal(synthesized.durationDays, 14);
});

test("France calculator reproduces the official €32,000 taxable-income example", () => {
  const grossProducing32000Taxable = 32_000 / 0.9;
  const payroll = calculateFrancePayroll(grossProducing32000Taxable, 0);
  assert.ok(Math.abs(payroll.taxableIncome - 32_000) < 0.01);
  assert.ok(Math.abs(payroll.incomeTax - 2_703.58) < 0.1);
});

test("UK calculator applies allowance taper, progressive income tax, and NI", () => {
  const payroll = calculateUkPayroll(105_000);
  assert.equal(payroll.taxableIncome, 94_930);
  assert.ok(Math.abs(payroll.incomeTax - 30_432) < 0.1);
  assert.ok(Math.abs(payroll.employeeContributions - 4_110.6) < 0.1);
});

test("ECB conversion normalizes sterling inputs into euros", () => {
  assert.ok(Math.abs(nativeToEur(0.84873, "GBP") - 1) < 0.00001);
});

test("every guided journey produces four complete futures", () => {
  for (const domain of ["career", "moving", "relationships", "education", "life"] as const) {
    const result = runSimulation(makeJourney(domain));
    assert.equal(result.decision.domain, domain);
    assert.equal(result.baseline.length, 4);
    assert.equal(result.audit.sourceCoverage, 1);
  }
});

test("relationship journeys prioritize belonging without financial distortion", () => {
  const decision = makeJourney("relationships");
  assert.ok(decision.priorities.belonging > decision.priorities.security);
  assert.equal(new Set(decision.options.map((option) => option.annualGross)).size, 1);
  const result = runSimulation(decision);
  assert.ok(result.baseline.every((future) => Number.isFinite(future.metrics.composite)));
});
