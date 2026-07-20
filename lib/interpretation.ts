import type { Witness } from "@/lib/schema";

const focusCopy = {
  "financial-runway": "financial room to absorb change",
  "daily-belonging": "daily belonging and support",
  "exit-flexibility": "room to change course",
  "downside-exposure": "exposure when conditions worsen",
} as const;

const assessmentCopy = {
  protects: "protects",
  strains: "strains",
  "trades-off": "trades off",
} as const;

const uncertaintyCopy = {
  "daily-rhythm": "how the day-to-day rhythm actually feels",
  "support-network": "who is available when life gets difficult",
  "reversal-cost": "how costly it feels to change course",
  "downside-tolerance": "how each path feels when conditions deteriorate",
} as const;

const signalCopy = {
  "energy-pattern": "Track your energy pattern across ordinary days.",
  "support-seeking": "Notice who you naturally turn to under pressure.",
  "commitment-resistance": "Notice which commitment you keep resisting.",
  "recovery-time": "Track how quickly you recover after a difficult day.",
} as const;

export function witnessObservationCopy(observation: Witness["observations"][number], shocked = false) {
  const insight = shocked ? observation.shockedInsight : observation.baselineInsight;
  if (insight) return insight;
  return `${assessmentCopy[shocked ? observation.shockedAssessment : observation.baselineAssessment]} ${focusCopy[observation.focus]}.`;
}

export function witnessTensionCopy(witness: Witness) {
  return `Protecting ${witness.protectedValue.toLowerCase()} makes ${uncertaintyCopy[witness.uncertaintyToTest]} the unresolved tension.`;
}

export function witnessSignalCopy(witness: Witness) {
  return signalCopy[witness.observableSignal];
}

export function uncertaintyCopyForUi(uncertainty: Witness["uncertaintyToTest"]) {
  return uncertaintyCopy[uncertainty];
}
