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

const assessmentLabel = {
  protects: "Protects",
  "trades-off": "Trades off",
  strains: "Strains",
} as const;

function realityCheckQuestion(assumptionId: string) {
  const questions: Record<string, string> = {
    "shock-cost": "If this got harder than expected, what cost or trade-off would you actually expect me to carry?",
    "travel-burden": "If I needed to show up regularly, what would that realistically look like?",
    "shock-energy": "What part of this day-to-day change do you think would drain me most?",
    "shock-belonging": "What would help me still feel connected if this changed?",
    "starting-runway": "What financial buffer would make this feel genuinely reversible?",
    "commitment-timing": "When would this start feeling hard to undo from the outside?",
    "office-days": "How many days on site should I realistically plan around, including the less flexible weeks?",
  };
  return questions[assumptionId] ?? "What am I least likely to see clearly from inside this decision?";
}

export default function Home() {
  const initialSimulation = useMemo(() => runSimulation(sampleDecision), []);
  const [decision, setDecision] = useState<Decision>(sampleDecision);
  const [simulation, setSimulation] = useState<Simulation>(initialSimulation);
  const [shock, setShock] = useState(false);
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioStartStep, setStudioStartStep] = useState(-1);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [demoMode, setDemoMode] = useState(false);
  const [realityCheckCopied, setRealityCheckCopied] = useState(false);
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

  function openScenarioEditor() {
    setStudioStartStep(3);
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

  function reveal(validated: Decision, startPressured = false) {
    setOpened(true);
    setStudioOpen(false);
    setShock(startPressured);
    setExperimentOpen(false);
    setCalibrationOpen(false);
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

  async function runDecision(startPressured = false) {
    const validated = decisionSchema.parse(decision);
    if (validated.contextLenses.length > 0 && !window.confirm("Selected user-authored perspective text will be sent to OpenAI to generate qualitative interpretations. It remains stored in this browser. Continue?")) return;
    setDemoMode(false);
    reveal(validated, startPressured);

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
    setCalibrationOpen(false);
    setAgentState("idle");
    window.setTimeout(() => document.querySelector(".observatory")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function copyRealityCheck() {
    const question = realityCheckQuestion(simulation.breakpoint.assumption.id);
    const message = `Hey, I’m thinking through: “${decision.question}”\n\nI’m not asking you to decide for me. I’m trying to understand one thing: ${question}\n\nA blunt answer would genuinely help me test the assumption before I commit.`;
    try {
      await navigator.clipboard.writeText(message);
      setRealityCheckCopied(true);
      window.setTimeout(() => setRealityCheckCopied(false), 1800);
    } catch {
      setRealityCheckCopied(false);
    }
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

        {shock && <ReversalMap analysis={simulation.breakpoint} futures={simulation.shocked} priorities={simulation.decision.priorities} />}

        <details className="calculation-details">
          <summary>Open the calculations and source labels <b>+</b></summary>
          <div className={`future-grid ${shock ? "has-shock" : ""} is-compact`} style={{ "--future-count": futures.length } as React.CSSProperties}>
            {futures.map((future, index) => <Timeline key={`${future.optionId}-${shock}`} future={future} index={index} active={shock} shockMonth={simulation.decision.shock.month} domain={simulation.decision.domain} compact />)}
          </div>
        </details>

        {!shock && <div className="story-next">
          <div><span>NOW CHANGE ONE THING</span><strong>{simulation.decision.shock.label}</strong><small>Elsewhere started here. You can choose a different condition.</small></div>
          <div className="story-next-actions"><button className="secondary" onClick={openScenarioEditor}>Name another condition</button><button onClick={() => { setShock(true); window.setTimeout(() => document.querySelector(".reversal-map")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); }}>Show what changes <b>→</b></button></div>
        </div>}

        {shock && <section className="witness-panel" aria-label="AI interpretation: same facts, different values">
          <div className="section-head"><div><span className="section-number">{agentState === "unavailable" ? "FALLBACK" : "THE INTERPRETATION LAYER / GPT-5.6"}</span><h2>{agentState === "unavailable" ? "The calculated futures still stand." : "Same futures. Four different values."}</h2></div><p>{agentState === "unavailable" ? "Live qualitative interpretation is unavailable. No model result is being implied." : "Each call protects a different value. None can edit the calculated futures or recommend a winner."}</p></div>
          <div className={`model-chain ${agentState === "unavailable" ? "fallback" : ""}`} aria-label="Elsewhere model architecture"><span>Deterministic futures</span><i>→</i><span>{agentState === "unavailable" ? "GPT-5.6 unavailable" : agentState === "running" ? "4 independent GPT-5.6 calls running" : "4 independent GPT-5.6 calls"}</span><i>→</i><span>{liveWitnesses && simulation.generatedBy.synthesisReturned ? "1 GPT-5.6 synthesis" : agentState === "running" ? "Synthesis waits" : "Deterministic test fallback"}</span></div>
          {agentState !== "unavailable" && <>
            <div className={`witness-receipt ${agentState === "running" ? "running" : ""}`}><span>SAME IMMUTABLE RECORD</span><strong>{agentState === "running" ? "READING IN PARALLEL" : `${simulation.witnesses.length} RECEIPTS MATCH`}</strong><small>Only the protected value changes.</small></div>
            <div className="matrix-scroll">
              <div className="disagreement-matrix" style={{ "--future-count": simulation.baseline.length } as React.CSSProperties}>
                <div className="matrix-head matrix-lens">Witness protects</div>
                {simulation.baseline.map((future) => <div className="matrix-head" key={future.optionId}>{future.title}</div>)}
                {(agentState === "running" ? pendingWitnesses : simulation.witnesses).map((witness) => <div className="matrix-row" key={witness.lens}>
                  <div className="matrix-lens">{witness.protectedValue}{witness.lens.startsWith("context:") && <small>USER-AUTHORED</small>}</div>
                  {simulation.baseline.map((future, index) => {
                    const observation = isResolvedWitness(witness) ? witness.observations.find((item) => item.optionId === future.optionId) : undefined;
                    const assessment = observation?.shockedAssessment;
                    return <div className={`matrix-cell ${assessment ?? "pending"}`} style={{ "--delay": `${index * 0.12}s` } as React.CSSProperties} key={future.optionId} title={observation ? witnessObservationCopy(observation, true) : "Reading the same future"}><span>{assessment ? assessmentLabel[assessment] : "Reading…"}</span></div>;
                  })}
                </div>)}
              </div>
            </div>
          </>}
          <div className={`synthesis-card ${liveWitnesses && simulation.generatedBy.synthesisReturned ? "live" : "fallback"}`}>
            <span>{liveWitnesses && simulation.generatedBy.synthesisReturned ? "THE FIFTH RESPONSE / SYNTHESIS" : agentState === "running" ? "SYNTHESIS IS ARRIVING" : "THE TESTABLE CONCLUSION"}</span>
            <div>
              <strong>{liveWitnesses && simulation.generatedBy.synthesisReturned ? simulation.divergence.explanation : agentState === "running" ? "The calculated turning point is ready. The fifth response will select which uncertainty is most useful to test." : simulation.divergence.explanation}</strong>
              <p>{liveWitnesses && simulation.generatedBy.synthesisReturned ? "It preserves the disagreement and chooses an uncertainty to test. It does not choose a home." : "The deterministic record remains complete and usable without model interpretation."}</p>
            </div>
            <div className="synthesis-payoff"><span>THE REAL-WORLD PAYOFF</span><strong>{simulation.experiment.title}</strong><small>{simulation.experiment.firstStep}</small></div>
            <button onClick={() => { setExperimentOpen(true); window.setTimeout(() => document.querySelector(".experiment")?.scrollIntoView({ behavior: "smooth" }), 80); }}>Open the 14-day test <b>→</b></button>
          </div>
        </section>}
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
            <div className="reality-prompt"><span>ASK SOMEONE WHO KNOWS YOU</span><strong>{realityCheckQuestion(simulation.breakpoint.assumption.id)}</strong></div>
            <div className="result-actions">
              <button className="primary" onClick={copyRealityCheck}>{realityCheckCopied ? "Copied — ask someone who knows you" : "Copy a reality-check message"} <b>↗</b></button>
              {!demoMode && <button onClick={openScenarioEditor}>Try another condition</button>}
              {!demoMode && <button onClick={() => { setCalibrationOpen(true); window.setTimeout(() => document.querySelector(".calibration-return")?.scrollIntoView({ behavior: "smooth" }), 80); }}>I tried it — update the model</button>}
            </div>
            <small className="people-boundary">Elsewhere prepares the question. A real person answers it.</small>
            {demoMode && <button className="final-own-cta" onClick={() => openJourney()}>Model my move or career decision <b>↗</b></button>}
          </div>
        </div>
      </section>

      {opened && experimentOpen && calibrationOpen && !demoMode && <CalibrationReturn decision={decision} simulation={simulation} analysis={simulation.breakpoint} onApply={applyCalibration} />}

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
