import OpenAI from "openai";

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is missing. Configure it in your shell or deployment environment; do not commit it.");
    process.exit(1);
  }

  const requestedModel = process.env.OPENAI_MODEL ?? "gpt-5.6-sol";
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: requestedModel,
    input: "Reply with exactly: ELSEWHERE_READY",
  });

  console.log({
    requestedModel,
    returnedModel: response.model,
    responseId: response.id,
    output: response.output_text,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "OpenAI verification failed");
  process.exit(1);
});
