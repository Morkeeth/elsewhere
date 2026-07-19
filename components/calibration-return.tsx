"use client";

import { useState } from "react";
import type { Assumption, AssumptionId, BreakpointAnalysis, Decision, Simulation } from "@/lib/schema";

export type CalibrationSubmission = { observedSignals: string[]; assumptionId: AssumptionId; observedValue: number; note: string };
type Props = { decision: Decision; simulation: Simulation; analysis: BreakpointAnalysis; onApply: (submission: CalibrationSubmission) => void };

function displayValue(value: number, assumption: Assumption) {
  return assumption.unit.startsWith("EUR") ? `€${Math.round(value).toLocaleString()}` : `${Math.round(value)} ${assumption.unit}`;
}

function realityCheckQuestion(assumption: Assumption) {
  const questions: Record<AssumptionId, string> = {
    "shock-cost": "If this got harder than expected, what cost or trade-off would you actually expect me to carry?",
    "travel-burden": "If I needed to show up regularly, what would that realistically look like?",
    "shock-energy": "What part of this day-to-day change do you think would drain me most?",
    "shock-belonging": "What would help me still feel connected if this changed?",
    "starting-runway": "What financial buffer would make this feel genuinely reversible?",
    "commitment-timing": "When would this start feeling hard to undo from the outside?",
  };
  return questions[assumption.id];
}

export function CalibrationReturn({ decision, simulation, analysis, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [signals, setSignals] = useState<string[]>([]);
  const [observedValue, setObservedValue] = useState(analysis.referenceValue);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const changed = observedValue !== analysis.referenceValue;
  const canApply = signals.length > 0 && changed;
  const lastCalibration = decision.calibrations.at(-1);

  function toggleSignal(signal: string) {
    setSignals((current) => current.includes(signal) ? current.filter((item) => item !== signal) : [...current, signal].slice(0, 3));
  }

  function apply() {
    if (!canApply) return;
    onApply({ observedSignals: signals, assumptionId: analysis.assumption.id, observedValue, note: note.trim() });
    setOpen(false);
    setSignals([]);
    setNote("");
  }

  function setObservedShortcut(direction: "lower" | "higher") {
    const distance = Math.max(1, (analysis.assumption.max - analysis.assumption.min) / 4);
    const next = direction === "lower" ? analysis.referenceValue - distance : analysis.referenceValue + distance;
    const clamped = Math.min(analysis.assumption.max, Math.max(analysis.assumption.min, next));
    setObservedValue(analysis.assumption.unit === "month" || analysis.assumption.unit === "points" ? Math.round(clamped) : Math.round(clamped / 50) * 50);
  }

  async function copyRealityCheck() {
    const message = `Hey — I’m thinking through: “${decision.question}”\n\nI’m not asking you to decide for me. I’m trying to understand one thing: ${realityCheckQuestion(analysis.assumption)}\n\nA blunt answer would genuinely help me test the assumption before I commit.`;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="calibration-return" aria-label="Return with evidence">
      <div>
        <span className="section-number">05 / RETURN WITH EVIDENCE</span>
        <h2>Reality supplied one observation.</h2>
        <p>After the experiment, update the exact scenario assumption it tested. Elsewhere recalculates the breakpoints; it does not pretend the experiment chose a life.</p>
        <div className="reality-check-card">
          <span>ASK YOUR PEOPLE · OPTIONAL</span>
          <strong>Get one real answer before you commit.</strong>
          <p>{realityCheckQuestion(analysis.assumption)}</p>
          <button onClick={copyRealityCheck}>{copied ? "Copied — send it ↗" : "Copy a reality-check DM ↗"}</button>
          <small>Elsewhere never simulates a person or sends a message for you.</small>
        </div>
      </div>
      <button className="calibration-open" onClick={() => setOpen(!open)}>{open ? "Not yet" : "Record what happened ↗"}</button>
      {open && (
        <div className="calibration-form">
          <div className="signal-picker"><span>SELECT AT LEAST ONE OBSERVABLE SIGNAL</span>{simulation.experiment.evidence.map((signal) => <button key={signal} className={signals.includes(signal) ? "selected" : ""} onClick={() => toggleSignal(signal)}>{signals.includes(signal) ? "✓ " : "+ "}{signal}</button>)}</div>
          <label><span>TESTED ASSUMPTION · USER-OBSERVED</span><strong>{analysis.assumption.label}</strong><small>{analysis.assumption.affects}</small></label>
          <label className="calibration-slider"><span>ASSUMPTION: {displayValue(analysis.referenceValue, analysis.assumption)} → {displayValue(observedValue, analysis.assumption)}</span><input aria-label="Observed assumption value" type="range" min={analysis.assumption.min} max={analysis.assumption.max} step={analysis.assumption.unit === "month" ? 1 : analysis.assumption.unit === "points" ? 1 : 50} value={observedValue} onChange={(event) => setObservedValue(Number(event.target.value))} /></label>
          <div className="observation-shortcuts"><span>QUICK READ · WHAT CAME BACK?</span><button onClick={() => setObservedShortcut("lower")}>Lower than I assumed</button><button onClick={() => setObservedShortcut("higher")}>Higher than I assumed</button></div>
          <label><span>WHAT SURPRISED YOU? <i>optional</i></span><textarea value={note} maxLength={320} onChange={(event) => setNote(event.target.value)} placeholder="A sentence future-you should remember." /></label>
          {!canApply && <small className="calibration-validation">Select an observable signal and move the observed assumption from its previous value to recalculate.</small>}
          <button className="calibration-apply" onClick={apply} disabled={!canApply}>Recalculate breakpoints ↘</button>
        </div>
      )}
      {lastCalibration && "kind" in lastCalibration && <div className="calibration-result">
        <span>REALITY SUPPLIED ONE OBSERVATION</span>
        <strong>{lastCalibration.previousValue} {lastCalibration.unit} → {lastCalibration.observedValue} {lastCalibration.unit}</strong>
        <div>{lastCalibration.breakpoints.map((breakpoint) => <small key={breakpoint.optionId}>{breakpoint.optionId}: {breakpoint.before ?? "holds"} → {breakpoint.after ?? "holds"}</small>)}</div>
        <p>Elsewhere recalculated the breakpoints. It did not prove a future correct.</p>
      </div>}
      {decision.calibrations.length > 0 && <small className="calibration-history">{decision.calibrations.length} evidence update{decision.calibrations.length === 1 ? "" : "s"} recorded locally.</small>}
    </section>
  );
}
