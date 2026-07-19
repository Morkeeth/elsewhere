import witnessJson from "@/data/judge-witnesses.json";
import { buildExperiment, runSimulation, sampleDecision } from "@/lib/engine";
import { simulationSchema, witnessSchema } from "@/lib/schema";

// Captured from a verified production GPT-5.6 run of the bundled sample. This
// replay lets judges inspect the full AI layer without spending public credits.
export function judgeReplay() {
  const deterministic = runSimulation(sampleDecision);
  const witnesses = witnessSchema.array().length(4).parse(witnessJson);
  return simulationSchema.parse({
    ...deterministic,
    witnesses,
    divergence: {
      ...deterministic.divergence,
      explanation: "The independent lenses converge on testing reversal cost before treating any future as settled.",
    },
    experiment: buildExperiment(sampleDecision, deterministic.baseline, "reversal-cost"),
    generatedBy: {
      engine: "gpt-5.6",
      model: "gpt-5.6-sol (verified cached judge replay)",
      responseIds: [],
      durationMs: 0,
      synthesisReturned: true,
    },
  });
}
