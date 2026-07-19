"use client";

import { useState } from "react";
import type { CalibrationRecord, Decision, Simulation } from "@/lib/schema";

type Props = {
  decision: Decision;
  simulation: Simulation;
  onApply: (record: CalibrationRecord) => void;
};

const priorityLabels = {
  security: "Safety",
  energy: "Aliveness",
  belonging: "People",
  optionality: "Freedom",
} as const;

export function CalibrationReturn({ decision, simulation, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [signals, setSignals] = useState<string[]>([]);
  const [priority, setPriority] = useState<keyof Decision["priorities"]>("belonging");
  const [nextValue, setNextValue] = useState(decision.priorities.belonging);
  const [note, setNote] = useState("");
  const previousValue = decision.priorities[priority];

  function toggleSignal(signal: string) {
    setSignals((current) => current.includes(signal) ? current.filter((item) => item !== signal) : [...current, signal].slice(0, 3));
  }

  function apply() {
    onApply({
      id: `calibration-${Date.now()}`,
      createdAt: new Date().toISOString(),
      experimentTitle: simulation.experiment.title,
      observedSignals: signals,
      revisedPriority: priority,
      previousValue,
      nextValue,
      note: note.trim(),
    });
    setOpen(false);
    setSignals([]);
    setNote("");
  }

  return (
    <section className="calibration-return" aria-label="Return with evidence">
      <div>
        <span className="section-number">04 / RETURN WITH EVIDENCE</span>
        <h2>What changed when you tried it?</h2>
        <p>After the experiment, record what you observed and revise one assumption. Elsewhere reruns the deterministic futures from that evidence—without asking AI for another verdict.</p>
      </div>
      <button className="calibration-open" onClick={() => setOpen(!open)}>{open ? "Not yet" : "Record what happened ↗"}</button>
      {open && (
        <div className="calibration-form">
          <div className="signal-picker"><span>OBSERVABLE SIGNALS</span>{simulation.experiment.evidence.map((signal) => <button key={signal} className={signals.includes(signal) ? "selected" : ""} onClick={() => toggleSignal(signal)}>{signals.includes(signal) ? "✓ " : "+ "}{signal}</button>)}</div>
          <label><span>REVISE ONE ASSUMPTION</span><select value={priority} onChange={(event) => { const value = event.target.value as keyof Decision["priorities"]; setPriority(value); setNextValue(decision.priorities[value]); }}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="calibration-slider"><span>{priorityLabels[priority]}: {previousValue} → {nextValue}</span><input type="range" min="0" max="100" value={nextValue} onChange={(event) => setNextValue(Number(event.target.value))} /></label>
          <label><span>WHAT SURPRISED YOU? <i>optional</i></span><textarea value={note} maxLength={320} onChange={(event) => setNote(event.target.value)} placeholder="A sentence you want future-you to remember." /></label>
          <button className="calibration-apply" onClick={apply}>Rerun with this evidence ↘</button>
        </div>
      )}
      {decision.calibrations.length > 0 && <small className="calibration-history">{decision.calibrations.length} evidence update{decision.calibrations.length === 1 ? "" : "s"} recorded locally.</small>}
    </section>
  );
}
