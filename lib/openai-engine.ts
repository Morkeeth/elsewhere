import { createHash } from "node:crypto";
import OpenAI from "openai";
import { buildExperiment, createFallbackWitnesses, runSimulation } from "@/lib/engine";
import { decisionSchema, simulationSchema, witnessSchema as witnessRuntimeSchema, type Decision, type Future, type Simulation, type Witness } from "@/lib/schema";

const lenses: Array<{ lens: Witness["lens"]; protectedValue: string }> = [
  { lens: "financial-resilience", protectedValue: "Financial resilience" },
  { lens: "belonging", protectedValue: "Belonging and relationships" },
  { lens: "reversibility", protectedValue: "Reversibility and optionality" },
  { lens: "adversarial-regret", protectedValue: "Adversarial failure and regret" },
];

const forbiddenNarrative = /\d|[$€£¥%]|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|choose|chosen|best option|you should|go with|pick|recommend|recommended|prefer|optimal|wiser|settle on|pursue|right choice)\b/i;

const witnessSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    observations: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          optionId: { type: "string" },
          assessment: { type: "string", enum: ["protects", "strains", "trades-off"] },
          focus: { type: "string", enum: ["financial-runway", "daily-belonging", "exit-flexibility", "downside-exposure"] },
        },
        required: ["optionId", "assessment", "focus"],
      },
    },
    uncertaintyToTest: { type: "string", enum: ["daily-rhythm", "support-network", "reversal-cost", "downside-tolerance"] },
    observableSignal: { type: "string", enum: ["energy-pattern", "support-seeking", "commitment-resistance", "recovery-time"] },
  },
  required: ["observations", "uncertaintyToTest", "observableSignal"],
} as const;

const synthesisSchema = {
  type: "object",
  additionalProperties: false,
  properties: { uncertainty: { type: "string", enum: ["daily-rhythm", "support-network", "reversal-cost", "downside-tolerance"] } },
  required: ["uncertainty"],
} as const;

export function assertQualitativeNarrative(value: string, field = "Model output") {
  if (!value.trim() || forbiddenNarrative.test(value)) throw new Error(`${field} violates the qualitative-output contract`);
  return value;
}

function compactLedger(baseline: Future[], shocked: Future[]) {
  return baseline.map((future, index) => ({
    optionId: future.optionId,
    title: future.title,
    baseline: future.metrics,
    shocked: shocked[index]?.metrics,
    commitmentAssumption: future.irreversibleAt,
  }));
}

export function ledgerHash(baseline: Future[], shocked: Future[]) {
  return createHash("sha256").update(JSON.stringify(compactLedger(baseline, shocked))).digest("hex").slice(0, 16);
}

type WitnessFinding = Pick<Witness, "observations" | "uncertaintyToTest" | "observableSignal">;

function validateWitness(candidate: WitnessFinding, lens: (typeof lenses)[number], optionIds: string[], expectedHash: string): Witness {
  const seen = candidate.observations.map((item) => item.optionId);
  if (new Set(seen).size !== 4 || optionIds.some((id) => !seen.includes(id))) throw new Error("Witness did not observe every option exactly once");
  return witnessRuntimeSchema.parse({ ...candidate, lens: lens.lens, protectedValue: lens.protectedValue, ledgerHash: expectedHash, fallback: false });
}

export function buildWitnessInput(decision: Decision, ledger: ReturnType<typeof compactLedger>, expectedHash: string) {
  return JSON.stringify({ decision: decision.question, ledgerHash: expectedHash, futures: ledger });
}

export function buildWitnessJobs(decision: Decision, baseline: Future[], shocked: Future[]) {
  const hash = ledgerHash(baseline, shocked);
  const ledger = compactLedger(baseline, shocked);
  const input = buildWitnessInput(decision, ledger, hash);
  return lenses.map((lens) => ({ lens, ledger, hash, input }));
}

async function askWitness(client: OpenAI, input: string, ledger: ReturnType<typeof compactLedger>, expectedHash: string, lens: (typeof lenses)[number], retry = false) {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
    reasoning: { effort: "medium" },
    instructions: [
      "You are an independent Elsewhere witness.",
      `Your protected value is exactly: ${lens.protectedValue}. Do not adopt another witness's value function.`,
      "All four options come from the same immutable deterministic ledger. Compare every option exactly once.",
      "Return qualitative interpretation only. Never use digits, currency symbols, percentages, dates, probabilities, quantities, or a recommendation.",
      "Never tell the user to choose, pick, prefer, or go with a future. Name an uncertainty to test instead.",
      retry ? "Your previous output violated the qualitative contract. Be shorter and remove every numeric or prescriptive phrase." : "",
    ].filter(Boolean).join("\n"),
    input,
    text: { format: { type: "json_schema", name: "elsewhere_witness", strict: true, schema: witnessSchema } },
  });
  const candidate = JSON.parse(response.output_text) as WitnessFinding;
  return { responseId: response.id, witness: validateWitness(candidate, lens, ledger.map((item) => item.optionId), expectedHash) };
}

async function safeWitness(client: OpenAI, input: string, ledger: ReturnType<typeof compactLedger>, expectedHash: string, lens: (typeof lenses)[number]) {
  try {
    return await askWitness(client, input, ledger, expectedHash, lens);
  } catch (error) {
    console.error(`[Elsewhere] ${lens.lens} witness rejected:`, error instanceof Error ? error.message : "unknown error");
    try {
      return await askWitness(client, input, ledger, expectedHash, lens, true);
    } catch (retryError) {
      console.error(`[Elsewhere] ${lens.lens} witness retry rejected:`, retryError instanceof Error ? retryError.message : "unknown error");
      return null;
    }
  }
}

async function synthesize(client: OpenAI, witnesses: Witness[]) {
  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
      reasoning: { effort: "medium" },
      instructions: "Select only the most useful qualitative uncertainty category across independent value lenses. Do not choose or recommend a future.",
      input: JSON.stringify({ witnesses }),
      text: { format: { type: "json_schema", name: "elsewhere_synthesis", strict: true, schema: synthesisSchema } },
    });
    const result = JSON.parse(response.output_text) as { uncertainty: Witness["uncertaintyToTest"] };
    const uncertainty = witnessRuntimeSchema.shape.uncertaintyToTest.parse(result.uncertainty);
    return { responseId: response.id, uncertainty };
  } catch (error) {
    console.error("[Elsewhere] synthesis rejected:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

export async function runGptSimulation(input: Decision): Promise<Simulation> {
  const startedAt = Date.now();
  const decision = decisionSchema.parse(input);
  const deterministic = runSimulation(decision);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const jobs = buildWitnessJobs(decision, deterministic.baseline, deterministic.shocked);
  const results = await Promise.all(jobs.map((job) => safeWitness(client, job.input, job.ledger, job.hash, job.lens)));
  const valid = results.filter((result): result is NonNullable<typeof result> => result !== null);
  const witnesses = valid.length === 4 ? valid.map((result) => result.witness) : createFallbackWitnesses(deterministic.baseline, jobs[0].hash);
  const synthesis = valid.length === 4 ? await synthesize(client, witnesses) : null;

  const experiment = synthesis ? buildExperiment(decision, deterministic.baseline, synthesis.uncertainty) : deterministic.experiment;
  const explanation = synthesis
    ? `The independent lenses converge on testing ${synthesis.uncertainty.replaceAll("-", " ")} before treating any future as settled.`
    : deterministic.divergence.explanation;
  return simulationSchema.parse({
    ...deterministic,
    witnesses,
    divergence: { ...deterministic.divergence, explanation },
    experiment,
    generatedBy: {
      engine: "gpt-5.6",
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
      responseIds: [...valid.map((result) => result.responseId), ...(synthesis ? [synthesis.responseId] : [])],
      durationMs: Date.now() - startedAt,
      synthesisReturned: Boolean(synthesis),
    },
  });
}
