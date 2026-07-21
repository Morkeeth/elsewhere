"use client";

import { useState } from "react";
import type { AssumptionId, BreakpointAnalysis, Decision, Simulation } from "@/lib/schema";

export type CalibrationSubmission = { observedSignals: string[]; assumptionId: AssumptionId; observedValue: number; note: string };
type Props = { decision: Decision; simulation: Simulation; analysis: BreakpointAnalysis; onApply: (submission: CalibrationSubmission) => void };

function displayValue(value: number, unit: string) {
  if (unit.startsWith("EUR")) return `€${Math.round(value).toLocaleString()}`;
  return `${Math.round(value)} ${unit}`;
}

export function CalibrationReturn({ decision, simulation, analysis, onApply }: Props) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [signal, setSignal] = useState("");
  const [observedValue, setObservedValue] = useState(analysis.referenceValue);
  const [note, setNote] = useState("");
  const lastCalibration = decision.calibrations.at(-1);

  function chooseSignal(nextSignal: string) {
    setSignal(nextSignal);
    setStage(1);
  }

  function apply() {
    if (!signal || observedValue === analysis.referenceValue) return;
    onApply({ observedSignals: [signal], assumptionId: analysis.assumption.id, observedValue, note: note.trim() });
    setStage(0);
    setSignal("");
    setNote("");
  }

  function projectedValue(read: "easier" | "harder") {
    const distance = Math.max(1, (analysis.assumption.max - analysis.assumption.min) / 4);
    const adverseHigher = analysis.assumption.adverseDirection === "higher";
    const raiseValue = read === "harder" ? adverseHigher : !adverseHigher;
    const next = raiseValue ? analysis.referenceValue + distance : analysis.referenceValue - distance;
    const clamped = Math.min(analysis.assumption.max, Math.max(analysis.assumption.min, next));
    const wholeNumberUnit = ["month", "points", "days/week"].includes(analysis.assumption.unit);
    return wholeNumberUnit ? Math.round(clamped) : Math.round(clamped / 50) * 50;
  }

  function recordRead(read: "easier" | "harder") {
    setObservedValue(projectedValue(read));
    setStage(2);
  }

  return (
    <section className="calibration-return" aria-label="Return with evidence">
      <div>
        <span className="section-number">04 / BRING BACK ONE REAL THING</span>
        <h2>What did reality say?</h2>
        <p>One observation is enough. Elsewhere updates the assumption this experiment tested and replays the same lives.</p>
      </div>
      <div className="calibration-wizard">
        <div className="wizard-progress" aria-label={`Step ${stage + 1} of 3`}><i className="done" /><i className={stage >= 1 ? "done" : ""} /><i className={stage >= 2 ? "done" : ""} /></div>
        {stage === 0 && <div className="wizard-step"><span>1 / WHAT DID YOU NOTICE?</span><strong>Pick the one signal that actually came back.</strong><div className="signal-picker">{simulation.experiment.evidence.map((item) => <button key={item} onClick={() => chooseSignal(item)}>{item}<b>→</b></button>)}</div></div>}
        {stage === 1 && <div className="wizard-step"><span>2 / COMPARED WITH YOUR MODEL</span><strong>Did this make the path feel easier or harder?</strong><p>{signal}</p><div className="wizard-choices"><button onClick={() => recordRead("harder")}><span>Harder than expected<small>Replay at {displayValue(projectedValue("harder"), analysis.assumption.unit)}</small></span><b>→</b></button><button onClick={() => recordRead("easier")}><span>Easier than expected<small>Replay at {displayValue(projectedValue("easier"), analysis.assumption.unit)}</small></span><b>→</b></button></div><button className="wizard-back" onClick={() => setStage(0)}>← Choose another signal</button></div>}
        {stage === 2 && <div className="wizard-step"><span>3 / KEEP ONE SENTENCE</span><strong>What should future-you remember?</strong><textarea value={note} maxLength={320} onChange={(event) => setNote(event.target.value)} placeholder="Optional — the observation is already enough." /><button className="calibration-apply" onClick={apply}>Replay the lives with this evidence ↘</button><button className="wizard-back" onClick={() => setStage(1)}>← Change my answer</button></div>}
      </div>
      {lastCalibration && "kind" in lastCalibration && <div className="calibration-result">
        <span>REALITY SUPPLIED ONE OBSERVATION</span>
        <strong>{lastCalibration.previousValue} {lastCalibration.unit} → {lastCalibration.observedValue} {lastCalibration.unit}</strong>
        <div>{lastCalibration.breakpoints.map((breakpoint) => <small key={breakpoint.optionId}>{breakpoint.optionId}: {breakpoint.before ?? "holds"} → {breakpoint.after ?? "holds"}</small>)}</div>
        <p>Elsewhere replayed the same lives. It did not prove a future correct.</p>
      </div>}
      {decision.calibrations.length > 0 && <small className="calibration-history">{decision.calibrations.length} evidence update{decision.calibrations.length === 1 ? "" : "s"} recorded locally.</small>}
    </section>
  );
}
