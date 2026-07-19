import OpenAI from "openai";
import { runSimulation } from "@/lib/engine";
import { decisionSchema, simulationSchema, type Decision, type Future, type Simulation } from "@/lib/schema";

const witnessSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    lens: { type: "string" },
    tension: { type: "string" },
    turningPoint: { type: "string" },
    signalToWatch: { type: "string" },
  },
  required: ["lens", "tension", "turningPoint", "signalToWatch"],
} as const;

const synthesisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    divergenceExplanation: { type: "string" },
    experimentTitle: { type: "string" },
    hypothesis: { type: "string" },
    firstStep: { type: "string" },
    evidence: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
  },
  required: ["divergenceExplanation", "experimentTitle", "hypothesis", "firstStep", "evidence"],
} as const;

const lenses = ["money-max", "regret-min", "relationship-first", "optionality-first"];

async function askWitness(
  client: OpenAI,
  future: Future,
  shockedFuture: Future,
  decision: Decision,
  lens: string,
) {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
    reasoning: { effort: "medium" },
    instructions: [
      "You are one independent future witness in Elsewhere.",
      `Your value function is ${lens}. Preserve it even if another lens would choose differently.`,
      "Interpret only the supplied deterministic world state. Never invent or alter a number.",
      "Be concrete, restrained, and useful. No motivational language and no recommendation.",
    ].join("\n"),
    input: JSON.stringify({ decision: decision.question, baseline: future, afterShock: shockedFuture }),
    text: {
      format: {
        type: "json_schema",
        name: "future_witness",
        strict: true,
        schema: witnessSchema,
      },
    },
  });

  return {
    responseId: response.id,
    witness: JSON.parse(response.output_text) as {
      lens: string;
      tension: string;
      turningPoint: string;
      signalToWatch: string;
    },
  };
}

export async function runGptSimulation(input: Decision): Promise<Simulation> {
  const startedAt = Date.now();
  const decision = decisionSchema.parse(input);
  const deterministic = runSimulation(decision);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const witnesses = await Promise.all(
    deterministic.baseline.map((future, index) =>
      askWitness(client, future, deterministic.shocked[index], decision, lenses[index] ?? "optionality-first"),
    ),
  );

  const baseline = deterministic.baseline.map((future, index) => ({
    ...future,
    witness: witnesses[index].witness,
  }));
  const shocked = deterministic.shocked.map((future, index) => ({
    ...future,
    witness: witnesses[index].witness,
  }));

  const synthesisResponse = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
    reasoning: { effort: "medium" },
    instructions: [
      "You are the synthesis agent for Elsewhere.",
      "Reconcile four independent future witnesses without voting or choosing a life for the user.",
      "Design one cheap, reversible fourteen-day experiment aimed at the largest unresolved uncertainty.",
      "Use the deterministic ledger as immutable evidence. Do not introduce a new number, price, date, or probability.",
      "The first step must be physical, specific, and possible within 24 hours.",
    ].join("\n"),
    input: JSON.stringify({
      decision: decision.question,
      divergence: deterministic.divergence,
      deterministicExperiment: deterministic.experiment,
      witnesses: witnesses.map((item) => item.witness),
    }),
    text: {
      format: {
        type: "json_schema",
        name: "elsewhere_synthesis",
        strict: true,
        schema: synthesisSchema,
      },
    },
  });
  const synthesis = JSON.parse(synthesisResponse.output_text) as {
    divergenceExplanation: string;
    experimentTitle: string;
    hypothesis: string;
    firstStep: string;
    evidence: string[];
  };

  return simulationSchema.parse({
    ...deterministic,
    baseline,
    shocked,
    divergence: {
      ...deterministic.divergence,
      explanation: synthesis.divergenceExplanation,
    },
    experiment: {
      ...deterministic.experiment,
      title: synthesis.experimentTitle,
      hypothesis: synthesis.hypothesis,
      firstStep: synthesis.firstStep,
      evidence: synthesis.evidence,
    },
    generatedBy: {
      engine: "gpt-5.6",
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
      responseIds: [...witnesses.map((result) => result.responseId), synthesisResponse.id],
      durationMs: Date.now() - startedAt,
    },
  });
}
