import type { Witness } from "@/lib/schema";

export type AblationMetrics = {
  witnessCount: number;
  optionCoverage: number;
  uniqueAssessmentPatterns: number;
  disagreementCells: number;
  disagreementRate: number;
  nonFallbackWitnessRate: number;
};

/**
 * Scores only observable disagreement in a common structured-output format.
 * It deliberately does not claim that disagreement is useful; human review of
 * the resulting experiment and surfaced assumptions remains part of the eval.
 */
export function measureWitnessDisagreement(witnesses: Witness[], optionIds: string[]): AblationMetrics {
  const patterns = witnesses.map((witness) => witness.observations
    .map((observation) => `${observation.optionId}:${observation.baselineAssessment}/${observation.shockedAssessment}`)
    .sort()
    .join("|"));
  const complete = witnesses.filter((witness) => witness.observations.length === optionIds.length && optionIds.every((id) => witness.observations.some((item) => item.optionId === id)));
  const disagreementCells = optionIds.reduce((total, optionId) => total + (["baselineAssessment", "shockedAssessment"] as const).filter((state) => {
    const values = new Set(witnesses.map((witness) => witness.observations.find((item) => item.optionId === optionId)?.[state]));
    return values.size > 1;
  }).length, 0);
  const possibleCells = optionIds.length * 2;
  return {
    witnessCount: witnesses.length,
    optionCoverage: witnesses.length ? complete.length / witnesses.length : 0,
    uniqueAssessmentPatterns: new Set(patterns).size,
    disagreementCells,
    disagreementRate: possibleCells ? disagreementCells / possibleCells : 0,
    nonFallbackWitnessRate: witnesses.length ? witnesses.filter((witness) => !witness.fallback).length / witnesses.length : 0,
  };
}
