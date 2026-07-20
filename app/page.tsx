"use client";

import { useEffect, useMemo, useState } from "react";
import { DecisionStudio } from "@/components/decision-studio";
import { CalibrationReturn, type CalibrationSubmission } from "@/components/calibration-return";
import { Timeline } from "@/components/timeline";
import { StoryWalk } from "@/components/story-walk";
import { ReversalMap } from "@/components/reversal-map";
import { applyAssumption, auditTrace, buildBreakpointAnalysis, runSimulation, sampleDecision } from "@/lib/engine";
import { makeStory, makeTwoChoiceJourney, type JourneyDomain, type StoryId } from "@/lib/journeys";
import { decisionSchema, simulationSchema, type AssumptionCalibration, type Decision, type Simulation, type Witness } from "@/lib/schema";
import { uncertaintyCopyForUi, witnessObservationCopy } from "@/lib/interpretation";

type AgentState = "idle" | "running" | "complete" | "unavailable";

const corePendingWitnesses = [
  { lens: "financial-resilience", protectedValue: "Financial resilience" },
  { lens: "belonging", protectedValue: "Belonging and relationships" },
  { lens: "reversibility", protectedValue: "Reversibility and optionality" },
  { lens: "adversarial-regret", protectedValue: "Adversarial failure and regret" },
] as const;

function isResolvedWitness(witness: Witness | { lens: string; protectedValue: string }): witness is Witness {
  return "observations" in witness;
}

export default function Home() {
  const initialSimulation = useMemo(() => runSimulation(sampleDecision), []);
  const [decision, setDecision] = useState<Decision>(sampleDecision);
  const [simulation, setSimulation] = useState<Simulation>(initialSimulation);
  const [shock, setShock] = useState(false);
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioStartStep, setStudioStartStep] = useState(-1);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [demoMode, setDemoMode] = useState(false);
  const futures = shock ? simulation.shocked : simulation.baseline;
  const liveWitnesses = agentState === "complete" && !simulation.witnesses.some((witness) => witness.fallback);
  const pendingWitnesses = [
    ...corePendingWitnesses,
    ...decision.contextLenses.map((context) => ({ lens: `context:${context.id}`, protectedValue: context.label })),
  ];

  function openJourney(domain?: JourneyDomain) {
    setDemoMode(false);
    if (domain) setDecision(makeTwoChoiceJourney(domain));
    setStudioStartStep(domain ? 0 : -1);
    setStudioOpen(true);
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem("elsewhere:decision");
        if (!stored) return;
        const parsed = decisionSchema.safeParse(JSON.parse(stored));
        if (parsed.success) {
          setDecision(parsed.data);
          setSimulation(runSimulation(parsed.data));
        }
      } catch {
        window.localStorage.removeItem("elsewhere:decision");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (demoMode) return;
    window.localStorage.setItem("elsewhere:decision", JSON.stringify(decision));
  }, [decision, demoMode]);

  function reveal(validated: Decision) {
    setOpened(true);
    setStudioOpen(false);
    setShock(false);
    setExperimentOpen(false);
    setAgentState("running");
    setSimulation(runSimulation(validated));
    window.setTimeout(() => document.querySelector(".observatory")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function runDemo() {
    await runStory("apartments");
  }

  async function runStory(story: StoryId) {
    const example = decisionSchema.parse(makeStory(story));
    setDemoMode(true);
    setDecision(example);
    reveal(example);

    try {
      const response = await fetch("/api/simulate?agents=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(example),
      });
      if (!response.ok) throw new Error("Witnesses unavailable");
      setSimulation(simulationSchema.parse(await response.json()));
      setAgentState("complete");
    } catch {
      setAgentState("unavailable");
    }
  }

  async function runDecision() {
    const validated = decisionSchema.parse(decision);
    if (validated.contextLenses.length > 0 && !window.confirm("Selected user-authored perspective text will be sent to OpenAI to generate qualitative interpretations. It remains stored in this browser. Continue?")) return;
    setDemoMode(false);
    reveal(validated);

    try {
      const response = await fetch("/api/simulate?agents=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!response.ok) throw new Error("Agents unavailable");
      setSimulation(simulationSchema.parse(await response.json()));
      setAgentState("complete");
    } catch {
      setAgentState("unavailable");
    }
  }

  function applyCalibration(submission: CalibrationSubmission) {
    const before = simulation.breakpoint;
    const scenario = applyAssumption(decision, submission.assumptionId, submission.observedValue);
    const nextAnalysis = buildBreakpointAnalysis(scenario, before.assumption.uncertainty);
    const record: AssumptionCalibration = {
      id: `calibration-${Date.now()}`,
      createdAt: new Date().toISOString(),
      experimentTitle: simulation.experiment.title,
      observedSignals: submission.observedSignals,
      kind: "assumption-observation",
      assumptionId: submission.assumptionId,
      previousValue: before.referenceValue,
      observedValue: submission.observedValue,
      unit: before.assumption.unit,
      provenance: "user-observed",
      breakpoints: before.futures.map((future) => ({ optionId: future.optionId, before: future.breakpointValue, after: nextAnalysis.futures.find((item) => item.optionId === future.optionId)?.breakpointValue ?? null })),
      note: submission.note,
    };
    const next = structuredClone(scenario);
    next.calibrations = [...next.calibrations, record].slice(-12);
    setDecision(next);
    const recalculated = runSimulation(next);
    setSimulation({ ...recalculated, breakpoint: nextAnalysis, audit: auditTrace(recalculated.baseline, recalculated.shocked, recalculated.divergence, recalculated.experiment, nextAnalysis) });
    setOpened(true);
    setShock(true);
    setExperimentOpen(true);
    setAgentState("idle");
    window.setTimeout(() => document.querySelector(".observatory")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function exportFile(kind: "json" | "markdown") {
    const body = kind === "json" ? JSON.stringify(simulation, null, 2) : buildMarkdown(simulation);
    const blob = new Blob([body], { type: kind === "json" ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `elsewhere-${new Date().toISOString().slice(0, 10)}.${kind === "json" ? "json" : "md"}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <nav>
        <a className="wordmark" href="#top" aria-label="Elsewhere home"><span>else</span>where<span className="mark">↗</span></a>
        <div className="nav-center">DECISION INSTRUMENT / 01</div>
        <div className="nav-actions">
          <button className="text-button" onClick={() => openJourney()}>Decision +</button>
          <button className="text-button" onClick={() => setEvidenceOpen(!evidenceOpen)}>Evidence {evidenceOpen ? "×" : "+"}</button>
        </div>
      </nav>

      <section id="top" className={`hero ${opened ? "is-open" : ""}`}>
        <div className="eyebrow"><span className="pulse" /> YOUR NOTES APP, BUT WITH CONSEQUENCES</div>
        <h1>Try on the lives<br />before you pick one.</h1>
        <p className="hero-copy">For the decision you keep reopening at 1:14am. Elsewhere lets the possible lives unfold, stress-tests them, then gives you one tiny real-world move.</p>
        <div className="hero-actions">
          <button className="demo-cta" onClick={runDemo}>
            <span><b>Try the apartment decision</b><small>Central Paris or more space · zero setup</small></span><i>START ↘</i>
          </button>
          <button className="own-cta" onClick={() => openJourney()}><span>Model my move or career decision</span><i>+</i></button>
        </div>
      </section>

      <section id="story-start" className={`observatory ${opened ? "revealed" : ""}`} aria-hidden={!opened}>
        <div className="demo-guide">
          <span>{demoMode ? "THE APARTMENT EXAMPLE" : "YOUR DECISION"}</span>
          <strong>{decision.question}</strong>
          <div><b className={!shock ? "active" : ""}>1</b> Enter the lives <i /> <b className={shock && !experimentOpen ? "active" : ""}>2</b> Change one condition <i /> <b className={experimentOpen ? "active" : ""}>3</b> Test in reality</div>
        </div>
        <div className={`engine-status ${agentState}`}>
          <span />
          {agentState === "running" && `${pendingWitnesses.length} GPT-5.6 witnesses are stress-testing the paths in parallel`}
          {agentState === "complete" && (simulation.witnesses.some((witness) => witness.fallback)
            ? "AI interpretation was unavailable · the verified deterministic record remains complete"
            : `${simulation.witnesses.length} independent GPT-5.6 analyses${simulation.generatedBy.synthesisReturned ? " + 1 synthesis" : ""} returned in ${((simulation.generatedBy.durationMs ?? 0) / 1000).toFixed(1)}s`)}
          {agentState === "unavailable" && "Verified record active · connect the API key for future witnesses"}
          {agentState === "idle" && "Record ready"}
        </div>
        <header className="section-head">
          <div><span className="section-number">{shock ? "02" : "01"}</span><h2>{shock ? "Change one condition. Keep the rest fixed." : (demoMode ? "Two apartments. One year." : "Walk into the lives you mapped.")}</h2></div>
          <p>{shock ? simulation.decision.shock.label : (demoMode ? "Same income. Different daily life." : "Your choices, unfolded across one year.")}</p>
        </header>

        <div className={`shock-ruler ${shock ? "" : "baseline"}`}>
          <span>NOW</span><i />{shock && <><span className="lit">MONTH {simulation.decision.shock.month} / CHANGE</span><i /></>}<span>ONE YEAR</span>
        </div>

        <StoryWalk key={shock ? "pressured-story" : "baseline-story"} decision={simulation.decision} baseline={simulation.baseline} pressured={simulation.shocked} activePressure={shock} />

        <details className="calculation-details">
          <summary>Open the calculations and source labels <b>+</b></summary>
          <div className={`future-grid ${shock ? "has-shock" : ""} is-compact`} style={{ "--future-count": futures.length } as React.CSSProperties}>
            {futures.map((future, index) => <Timeline key={`${future.optionId}-${shock}`} future={future} index={index} active={shock} shockMonth={simulation.decision.shock.month} domain={simulation.decision.domain} compact />)}
          </div>
          {shock && <ReversalMap analysis={simulation.breakpoint} futures={simulation.shocked} />}
        </details>

        {!shock && <div className="story-next">
          <div><span>THE UNCERTAINTY THIS STORY TURNS ON</span><strong>{simulation.decision.shock.label}</strong></div>
          <button onClick={() => { setShock(true); window.setTimeout(() => document.querySelector("#story-start")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Change this condition <b>→</b></button>
        </div>}

        {shock && <section className="witness-panel" aria-label="AI interpretation: same facts, different values">
          <div className="section-head"><div><span className="section-number">{agentState === "unavailable" ? "FALLBACK" : "THE INTERPRETATION LAYER / GPT-5.6"}</span><h2>{agentState === "unavailable" ? "The calculated futures still stand." : "Same futures. Four different values."}</h2></div><p>{agentState === "unavailable" ? "Live qualitative interpretation is unavailable. No model result is being implied." : "Each call protects a different value. None can edit the calculated futures or recommend a winner."}</p></div>
          <div className={`model-chain ${agentState === "unavailable" ? "fallback" : ""}`} aria-label="Elsewhere model architecture"><span>Deterministic futures</span><i>→</i><span>{agentState === "unavailable" ? "GPT-5.6 unavailable" : agentState === "running" ? "4 independent GPT-5.6 calls running" : "4 independent GPT-5.6 calls"}</span><i>→</i><span>{liveWitnesses && simulation.generatedBy.synthesisReturned ? "1 GPT-5.6 synthesis" : agentState === "running" ? "Synthesis waits" : "Deterministic test fallback"}</span></div>
          {agentState !== "unavailable" && <div className="witness-cards">
            {(agentState === "running" ? pendingWitnesses : simulation.witnesses).map((witness) => <article key={witness.lens}>
              <header><span>PROTECTING</span><strong>{witness.protectedValue}</strong>{witness.lens.startsWith("context:") && <small>USER-AUTHORED</small>}</header>
              <div>
                {simulation.baseline.map((future) => {
                  const observation = isResolvedWitness(witness) ? witness.observations.find((item) => item.optionId === future.optionId) : undefined;
                  return <section key={future.optionId}><span>{future.title}</span><p>{observation ? witnessObservationCopy(observation, true) : "Reading the same future…"}</p></section>;
                })}
              </div>
            </article>)}
          </div>}
          <p className="matrix-caption">{agentState === "running" ? "The deterministic futures are ready now. AI interpretation is arriving separately." : liveWitnesses ? "GPT-5.6 interprets the trade-offs. It cannot alter the calculated futures." : "The result remains usable without model interpretation."}</p>
        </section>}

        {shock && !experimentOpen && <div className="story-next">
          <div><span>THE MODEL SHOULD NOT CHOOSE FOR YOU</span><strong>Turn the biggest uncertainty into one small test.</strong></div>
          <button onClick={() => { setExperimentOpen(true); window.setTimeout(() => document.querySelector(".experiment")?.scrollIntoView({ behavior: "smooth" }), 80); }}>Show me what to try <b>→</b></button>
        </div>}
      </section>

      <section className={`experiment ${opened && experimentOpen ? "revealed" : ""}`}>
        <span className="section-number">03 / TRY ONE SMALL THING</span>
        <div className="experiment-grid">
          <div><p className="kicker">DON’T DECIDE YET.</p><h2>{simulation.experiment.title}.</h2></div>
          <div className="experiment-body">
            <p>{simulation.experiment.hypothesis}</p>
            <small className="interpretation-note">{simulation.generatedBy.synthesisReturned ? "A fifth GPT-5.6 synthesis" : "The deterministic fallback"} selected the uncertainty to test: {uncertaintyCopyForUi(simulation.experiment.uncertainty)}.</small>
            <div className="first-step"><span>FIRST PHYSICAL STEP</span><strong>{simulation.experiment.firstStep}</strong></div>
            <div className="experiment-meta">
              <span><b>{simulation.experiment.durationDays}</b> days</span>
              <span><b>€{simulation.experiment.costEur}</b> at risk</span>
              <span><b>{simulation.experiment.evidence.length}</b> signals</span>
            </div>
            {demoMode ? <button className="final-own-cta" onClick={() => openJourney()}>Model my move or career decision <b>↗</b></button> : <div className="result-actions"><button onClick={() => exportFile("markdown")}>Export brief ↗</button><button onClick={() => exportFile("json")}>World states {"{}"}</button></div>}
          </div>
        </div>
      </section>

      {opened && experimentOpen && !demoMode && <CalibrationReturn decision={decision} simulation={simulation} analysis={simulation.breakpoint} onApply={applyCalibration} />}

      <aside className={`evidence-drawer ${evidenceOpen ? "open" : ""}`}>
        <button onClick={() => setEvidenceOpen(false)} aria-label="Close evidence">×</button>
        <span className="section-number">WHERE THE NUMBERS CAME FROM</span>
        <h2>Every number has an owner.</h2>
        <div className="audit-score"><strong>{Math.round(simulation.audit.sourceCoverage * 100)}%</strong><span>trace coverage</span><i>{simulation.audit.untracedNumericFields} untraced fields · trace coverage is not source verification</i></div>
        <p>Financial inputs are dated public figures or explicit assumptions. Energy, belonging, optionality, and commitment timing are transparent scenario assumptions. They are not predictions. Outcomes are recomputed from visible formulas. GPT‑5.6 adds qualitative interpretation; it cannot edit numeric results.</p>
        <div className="tax-grounding-list" aria-label="Tax grounding by future">
          {simulation.baseline.map((future) => <div key={future.optionId} className={future.taxGrounding.status}>
            <span>{future.title}</span><strong>{future.taxGrounding.label}</strong>
          </div>)}
        </div>
        {simulation.sources.map((source) => (
          <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
            <span>{source.kind}</span><strong>{source.label}</strong><small>{source.note}</small>
          </a>
        ))}
        <div className="formula"><span>CORE FORMULA</span>net income ÷ 12<br />− rent − living − care − travel</div>
      </aside>

      <DecisionStudio key={`${studioOpen}-${studioStartStep}`} initialStep={studioStartStep} decision={decision} open={studioOpen} running={agentState === "running"} onClose={() => setStudioOpen(false)} onChange={setDecision} onRun={runDecision} />
    </main>
  );
}

function buildMarkdown(simulation: Simulation) {
  const rows = simulation.shocked.map((future) => `| ${future.title} | €${future.metrics.yearEndSavingsEur.toLocaleString()} | ${future.taxGrounding.label} | ${future.metrics.averageEnergy} | ${future.metrics.averageBelonging} | ${future.irreversibleAt.label} |`).join("\n");
  const perspectives = simulation.decision.contextLenses.length
    ? `\n## User-authored perspectives\n\n${simulation.decision.contextLenses.map((lens) => `### ${lens.label}\n\n- Protects: ${lens.protectedValues.join(", ")}\n- What I think I know: ${lens.knownConcern}\n- What I do not know yet: ${lens.unknown}\n- Provenance: ${lens.provenanceLabel}; this is not that person’s actual view.`).join("\n\n")}\n`
    : "";
  return `# Elsewhere decision brief\n\n## ${simulation.decision.question}\n\n${simulation.decision.context ? `Context: ${simulation.decision.context}\n\n` : ""}Generated with ${simulation.generatedBy.model ?? "the deterministic engine"}.\n\n| Future | Year-end savings | Tax basis | Energy | Belonging | Commitment assumption |\n| --- | ---: | --- | ---: | ---: | --- |\n${rows}${perspectives}\n## Pressure test\n\n${simulation.decision.shock.label}, month ${simulation.decision.shock.month}.\n\n## Fourteen-day experiment\n\n**${simulation.experiment.title}**\n\n${simulation.experiment.hypothesis}\n\nFirst step: ${simulation.experiment.firstStep}\n\n## Evidence\n\nTrace coverage: ${Math.round(simulation.audit.sourceCoverage * 100)}%.\n\n${simulation.sources.map((source) => `- [${source.label}](${source.url}): ${source.note}`).join("\n")}\n`;
}
