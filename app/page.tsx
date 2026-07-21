"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DecisionStudio } from "@/components/decision-studio";
import { CalibrationReturn, type CalibrationSubmission } from "@/components/calibration-return";
import { LensPlayer } from "@/components/lens-player";
import { Timeline } from "@/components/timeline";
import { StoryWalk } from "@/components/story-walk";
import { ReversalMap } from "@/components/reversal-map";
import { applyAssumption, auditTrace, buildBreakpointAnalysis, runSimulation, sampleDecision } from "@/lib/engine";
import { makeStory, makeTwoChoiceJourney, type JourneyDomain, type StoryId } from "@/lib/journeys";
import { decisionSchema, simulationSchema, type AssumptionCalibration, type Decision, type Simulation } from "@/lib/schema";
import { uncertaintyCopyForUi } from "@/lib/interpretation";

type AgentState = "idle" | "running" | "complete" | "unavailable";

export default function Home() {
  const initialSimulation = useMemo(() => runSimulation(sampleDecision), []);
  const [decision, setDecision] = useState<Decision>(sampleDecision);
  const [simulation, setSimulation] = useState<Simulation>(initialSimulation);
  const [shock, setShock] = useState(false);
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [experimentStarted, setExperimentStarted] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioStartStep, setStudioStartStep] = useState(-1);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [demoMode, setDemoMode] = useState(false);
  const requestIdRef = useRef(0);
  const futures = shock ? simulation.shocked : simulation.baseline;

  function openJourney(domain?: JourneyDomain) {
    requestIdRef.current += 1;
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
    setExperimentStarted(false);
    setCalibrationOpen(false);
    setAgentState("running");
    setSimulation(runSimulation(validated));
    window.setTimeout(() => document.querySelector(".observatory")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function runDemo() {
    await runStory("apartments");
  }

  async function runStory(story: StoryId) {
    const requestId = ++requestIdRef.current;
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
      const returned = simulationSchema.parse(await response.json());
      if (requestId !== requestIdRef.current) return;
      setSimulation(returned);
      setAgentState("complete");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setAgentState("unavailable");
    }
  }

  async function runDecision(startPressured = false) {
    const validated = decisionSchema.parse(decision);
    if (validated.contextLenses.length > 0 && !window.confirm("Selected user-authored perspective text will be sent to OpenAI to generate qualitative interpretations. It remains stored in this browser. Continue?")) return;
    const requestId = ++requestIdRef.current;
    reveal(validated, startPressured);

    try {
      const response = await fetch("/api/simulate?agents=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!response.ok) throw new Error("Agents unavailable");
      const returned = simulationSchema.parse(await response.json());
      if (requestId !== requestIdRef.current) return;
      setSimulation(returned);
      setAgentState("complete");
    } catch {
      if (requestId !== requestIdRef.current) return;
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
          {agentState === "running" && `${4 + decision.contextLenses.length} GPT-5.6 lenses are reading the paths in parallel`}
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
          <div><span>THESE ARE THE EXPECTED LIVES</span><strong>Now change one thing.</strong><small>Pick the assumption you are least willing to leave untested.</small></div>
          <button onClick={openScenarioEditor}>Choose one condition <b>→</b></button>
        </div>}

        {shock && <LensPlayer key={simulation.decision.question} simulation={simulation} state={agentState} onOpenTest={() => { setExperimentOpen(true); window.setTimeout(() => document.querySelector(".experiment")?.scrollIntoView({ behavior: "smooth" }), 80); }} />}
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
            {!experimentStarted && <button className="start-test" onClick={() => setExperimentStarted(true)}>Start this test <b>→</b></button>}
            {experimentStarted && <div className="test-route">
              <div className="active"><span>01 · DO THIS FIRST</span><strong>{simulation.experiment.firstStep}</strong></div>
              <div><span>02 · NOTICE ONE THING</span><strong>{simulation.experiment.evidence[0]}</strong></div>
              <div><span>03 · COME BACK</span><strong>Bring one real observation. Elsewhere will replay the same lives.</strong></div>
              {!demoMode && <button onClick={() => { setCalibrationOpen(true); window.setTimeout(() => document.querySelector(".calibration-return")?.scrollIntoView({ behavior: "smooth" }), 80); }}>I have one observation <b>→</b></button>}
              {demoMode && <button onClick={() => openJourney()}>Model my own decision <b>↗</b></button>}
            </div>}
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

      <DecisionStudio key={`${studioOpen}-${studioStartStep}`} initialStep={studioStartStep} decision={decision} open={studioOpen} running={false} onClose={() => setStudioOpen(false)} onChange={setDecision} onRun={runDecision} />
    </main>
  );
}
