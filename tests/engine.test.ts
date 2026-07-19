import assert from "node:assert/strict";
import test from "node:test";
import { runSimulation, sampleDecision } from "../lib/engine";
import { calculateFrancePayroll, calculateUkPayroll, nativeToEur } from "../lib/grounding";

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
