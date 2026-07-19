"use client";

import { useEffect, useMemo, useState } from "react";
import { DecisionStudio } from "@/components/decision-studio";
import { Timeline } from "@/components/timeline";
import { runSimulation, sampleDecision } from "@/lib/engine";
import { decisionSchema, simulationSchema, type Decision, type Simulation } from "@/lib/schema";

type AgentState = "idle" | "running" | "complete" | "unavailable";

export default function Home() {
  const initialSimulation = useMemo(() => runSimulation(sampleDecision), []);
  const [decision, setDecision] = useState<Decision>(sampleDecision);
  const [simulation, setSimulation] = useState<Simulation>(initialSimulation);
  const [shock, setShock] = useState(false);
  const [opened, setOpened] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [deliveryState, setDeliveryState] = useState<"idle" | "sending" | "sent" | "unavailable">("idle");
  const futures = shock ? simulation.shocked : simulation.baseline;

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
    window.localStorage.setItem("elsewhere:decision", JSON.stringify(decision));
  }, [decision]);

  async function runDecision() {
    const validated = decisionSchema.parse(decision);
    setOpened(true);
    setStudioOpen(false);
    setShock(false);
    setAgentState("running");
    setSimulation(runSimulation(validated));
    window.setTimeout(() => document.querySelector(".observatory")?.scrollIntoView({ behavior: "smooth" }), 100);

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

  async function deliverBrief() {
    setDeliveryState("sending");
    try {
      const response = await fetch("/api/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simulation),
      });
      if (!response.ok) throw new Error("Delivery unavailable");
      setDeliveryState("sent");
    } catch {
      setDeliveryState("unavailable");
    }
  }

  return (
    <main>
      <nav>
        <a className="wordmark" href="#top" aria-label="Elsewhere home"><span>else</span>where<span className="mark">↗</span></a>
        <div className="nav-center">DECISION INSTRUMENT / 01</div>
        <div className="nav-actions">
          <button className="text-button" onClick={() => setStudioOpen(true)}>Decision +</button>
          <button className="text-button" onClick={() => setEvidenceOpen(!evidenceOpen)}>Evidence {evidenceOpen ? "×" : "+"}</button>
        </div>
      </nav>

      <section id="top" className={`hero ${opened ? "is-open" : ""}`}>
        <div className="eyebrow"><span className="pulse" /> FOUR LIVES ARE WAITING</div>
        <h1>Visit the futures<br />before you choose one.</h1>
        <p className="hero-copy">Elsewhere does not tell you what to do. It lets grounded versions of your life unfold, then finds the smallest experiment that makes the decision less imaginary.</p>
        <div className="decision-line">
          <span>THE DECISION</span>
          <p>{decision.question}</p>
          <button onClick={runDecision}>{agentState === "running" ? "Opening worlds…" : opened ? "Run it again" : "Open the futures"}<span>↘</span></button>
        </div>
      </section>

      <section className={`observatory ${opened ? "revealed" : ""}`} aria-hidden={!opened}>
        <div className={`engine-status ${agentState}`}>
          <span />
          {agentState === "running" && "Four GPT-5.6 witnesses are living the paths in parallel"}
          {agentState === "complete" && `${simulation.generatedBy.responseIds.length - 1} witnesses + 1 synthesis returned in ${((simulation.generatedBy.durationMs ?? 0) / 1000).toFixed(1)}s`}
          {agentState === "unavailable" && "Verified ledger active · connect the API key for future witnesses"}
          {agentState === "idle" && "Ledger ready"}
        </div>
        <header className="section-head">
          <div><span className="section-number">01</span><h2>The lives begin together.</h2></div>
          <div className="shock-control">
            <div><span>INTRODUCE A SHOCK</span><strong>{simulation.decision.shock.label}</strong></div>
            <button className={shock ? "on" : ""} onClick={() => setShock(!shock)} aria-label={`Toggle shock: ${simulation.decision.shock.label}`} aria-pressed={shock}><span /></button>
          </div>
        </header>

        <div className="shock-ruler">
          <span>NOW</span><i /><span className={shock ? "lit" : ""}>MONTH {simulation.decision.shock.month} / SHOCK</span><i /><span>ONE YEAR</span>
        </div>

        <div className={`future-grid ${shock ? "has-shock" : ""}`}>
          {futures.map((future) => <Timeline key={`${future.optionId}-${shock}-${future.witness?.lens ?? "ledger"}`} future={future} active={shock} shockMonth={simulation.decision.shock.month} />)}
        </div>

        <div className={`divergence ${shock ? "is-visible" : ""}`}>
          <span className="section-number">02</span>
          <div><p>THE DISTANCE BETWEEN THE LIVES</p><strong>{shock ? simulation.divergence.shocked : simulation.divergence.baseline}</strong></div>
          <div className="divergence-bar"><span style={{ width: `${Math.min(100, (shock ? simulation.divergence.shocked : simulation.divergence.baseline) * 2)}%` }} /></div>
          <p>{shock ? simulation.divergence.explanation : "The paths look comparable until reality changes the weights."}</p>
        </div>
      </section>

      <section className={`experiment ${opened && shock ? "revealed" : ""}`}>
        <span className="section-number">03 / THE EXIT FROM SIMULATION</span>
        <div className="experiment-grid">
          <div><p className="kicker">DON’T DECIDE YET.</p><h2>{simulation.experiment.title}.</h2></div>
          <div className="experiment-body">
            <p>{simulation.experiment.hypothesis}</p>
            <div className="first-step"><span>FIRST PHYSICAL STEP</span><strong>{simulation.experiment.firstStep}</strong></div>
            <div className="experiment-meta">
              <span><b>{simulation.experiment.durationDays}</b> days</span>
              <span><b>€{simulation.experiment.costEur}</b> at risk</span>
              <span><b>{simulation.experiment.evidence.length}</b> signals</span>
            </div>
            <div className="result-actions">
              <button onClick={() => exportFile("markdown")}>Export brief ↗</button>
              <button onClick={() => exportFile("json")}>World states {"{}"}</button>
              <button onClick={deliverBrief}>{deliveryState === "sending" ? "Sending…" : deliveryState === "sent" ? "Delivered ✓" : deliveryState === "unavailable" ? "Connect OpenClaw" : "Send to OpenClaw"}</button>
            </div>
          </div>
        </div>
      </section>

      <aside className={`evidence-drawer ${evidenceOpen ? "open" : ""}`}>
        <button onClick={() => setEvidenceOpen(false)} aria-label="Close evidence">×</button>
        <span className="section-number">EVIDENCE LEDGER</span>
        <h2>Nothing numeric is dreamed up.</h2>
        <div className="audit-score"><strong>{Math.round(simulation.audit.sourceCoverage * 100)}%</strong><span>trace coverage</span><i>{simulation.audit.untracedNumericFields} untraced fields</i></div>
        <p>Inputs are explicit assumptions or dated public figures. Outcomes are recomputed from visible formulas. GPT‑5.6 interprets the ledger; it cannot edit it.</p>
        {simulation.sources.map((source) => (
          <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
            <span>{source.kind}</span><strong>{source.label}</strong><small>{source.note}</small>
          </a>
        ))}
        <div className="formula"><span>CORE FORMULA</span>net income ÷ 12<br />− rent − living − care − travel</div>
      </aside>

      <DecisionStudio decision={decision} open={studioOpen} running={agentState === "running"} onClose={() => setStudioOpen(false)} onChange={setDecision} onRun={runDecision} />
    </main>
  );
}

function buildMarkdown(simulation: Simulation) {
  const rows = simulation.shocked.map((future) => `| ${future.title} | €${future.metrics.yearEndSavingsEur.toLocaleString()} | ${future.metrics.averageEnergy} | ${future.metrics.averageBelonging} | ${future.irreversibleAt.label} |`).join("\n");
  return `# Elsewhere decision brief\n\n## ${simulation.decision.question}\n\nGenerated with ${simulation.generatedBy.model ?? "the deterministic ledger"}.\n\n| Future | Year-end savings | Energy | Belonging | Door narrows |\n| --- | ---: | ---: | ---: | --- |\n${rows}\n\n## Shock\n\n${simulation.decision.shock.label}, month ${simulation.decision.shock.month}.\n\n## Fourteen-day experiment\n\n**${simulation.experiment.title}**\n\n${simulation.experiment.hypothesis}\n\nFirst step: ${simulation.experiment.firstStep}\n\n## Evidence\n\nTrace coverage: ${Math.round(simulation.audit.sourceCoverage * 100)}%.\n\n${simulation.sources.map((source) => `- [${source.label}](${source.url}) — ${source.note}`).join("\n")}\n`;
}
