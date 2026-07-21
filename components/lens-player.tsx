"use client";

import { useState } from "react";
import { witnessObservationCopy } from "@/lib/interpretation";
import type { Simulation, Witness } from "@/lib/schema";

type State = "idle" | "running" | "complete" | "unavailable";
type Props = { simulation: Simulation; state: State; onOpenTest: () => void };

const modeLabels: Record<string, { label: string; line: string }> = {
  "financial-resilience": { label: "Money", line: "What survives the expensive version?" },
  belonging: { label: "People", line: "Where does connection become easy or fragile?" },
  reversibility: { label: "Freedom", line: "Which doors quietly close?" },
  "adversarial-regret": { label: "Regret", line: "What fails on the difficult week?" },
};

const assessmentLabels = { protects: "PROTECTS", "trades-off": "TRADES OFF", strains: "STRAINS" } as const;

function modeFor(witness: Witness) {
  return modeLabels[witness.lens] ?? { label: witness.protectedValue, line: "A user-authored concern, treated as a hypothesis." };
}

export function LensPlayer({ simulation, state, onOpenTest }: Props) {
  const [index, setIndex] = useState(0);
  const witnesses = simulation.witnesses;
  const witness = witnesses[Math.min(index, witnesses.length - 1)];
  const mode = modeFor(witness);
  const live = state === "complete" && !witness.fallback;

  return (
    <section className="witness-panel lens-player" aria-label="Try the lives through different GPT-5.6 lenses">
      <div className="lens-intro"><span className="section-number">GPT-5.6 / FOUR INDEPENDENT READS</span><h2>Try the same lives in another mode.</h2><p>Money. People. Freedom. Regret. Each mode protects one value and reads the same calculated futures.</p></div>

      <div className="lens-switcher" role="tablist" aria-label="Perspective modes">
        {witnesses.map((item, itemIndex) => {
          const itemMode = modeFor(item);
          return <button role="tab" aria-selected={index === itemIndex} className={index === itemIndex ? "active" : ""} onClick={() => setIndex(itemIndex)} key={item.lens}><span>{String(itemIndex + 1).padStart(2, "0")}</span><strong>{itemMode.label}</strong></button>;
        })}
      </div>

      <article className="lens-stage">
        <header><div><span>{mode.label.toUpperCase()} MODE</span><h3>{mode.line}</h3></div><small>{state === "running" ? "READING…" : live ? "LIVE GPT-5.6" : state === "unavailable" ? "DETERMINISTIC FALLBACK" : "STARTING READ"}</small></header>
        <div className="lens-futures">
          {simulation.shocked.map((future, futureIndex) => {
            const observation = witness.observations.find((item) => item.optionId === future.optionId);
            const assessment = observation?.shockedAssessment ?? "trades-off";
            const copy = state === "running"
              ? `Reading ${future.title} through ${mode.label.toLowerCase()}…`
              : observation ? witnessObservationCopy(observation, true) : "This lens has not returned yet.";
            return <section style={{ "--accent": future.accent } as React.CSSProperties} key={future.optionId}><div><span>LIFE {String.fromCharCode(65 + futureIndex)}</span><b className={assessment}>{assessmentLabels[assessment]}</b></div><strong>{future.title}</strong><p>{copy}</p></section>;
          })}
        </div>
      </article>

      <details className="model-proof">
        <summary><span>HOW THIS WAS GENERATED</span><strong>{state === "running" ? "Four calls are reading in parallel" : `${witnesses.length} independent reads + one synthesis`}</strong><b>+</b></summary>
        <div className="model-chain"><span>Calculated futures</span><i>→</i><span>{state === "running" ? "GPT-5.6 reads running" : `${witnesses.length} GPT-5.6 lens receipts`}</span><i>→</i><span>{simulation.generatedBy.synthesisReturned ? "One GPT-5.6 synthesis" : "Testable fallback"}</span></div>
        <p>Every lens receives the same immutable future record. It can add qualitative interpretation; it cannot edit a number or recommend a winner.</p>
      </details>

      <div className={`synthesis-card lens-synthesis ${live && simulation.generatedBy.synthesisReturned ? "live" : "fallback"}`}>
        <span>{live && simulation.generatedBy.synthesisReturned ? "THE FIFTH READ / WHAT TO TEST" : state === "running" ? "THE FIFTH READ IS ARRIVING" : "WHAT TO TEST"}</span>
        <div><strong>{state === "running" ? "The calculated futures are ready. The synthesis is choosing the uncertainty worth testing." : simulation.divergence.explanation}</strong><p>The synthesis preserves the disagreement. It chooses a reality test, never a life.</p></div>
        <div className="synthesis-payoff"><span>NEXT MOVE</span><strong>{simulation.experiment.title}</strong><small>{simulation.experiment.firstStep}</small></div>
        <button onClick={onOpenTest}>Turn this into a real test <b>→</b></button>
      </div>
    </section>
  );
}
