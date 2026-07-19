"use client";

import { useState } from "react";
import type { Decision, DecisionOption } from "@/lib/schema";

type Props = {
  decision: Decision;
  open: boolean;
  running: boolean;
  onClose: () => void;
  onChange: (decision: Decision) => void;
  onRun: () => void;
};

const numericKeys = new Set<keyof DecisionOption>([
  "annualGross", "employeeContributionRate", "effectiveTaxRate", "monthlyRent", "monthlyLiving",
  "relocation", "flexibility", "belonging", "growth", "risk", "shockTravelMultiplier",
  "shockEnergySensitivity", "commitmentMonth",
]);

export function DecisionStudio({ decision, open, running, onClose, onChange, onRun }: Props) {
  const [tab, setTab] = useState<"decision" | "paths" | "shock">("decision");

  function setOption(index: number, key: keyof DecisionOption, value: string) {
    const next = structuredClone(decision);
    const option = next.options[index] as Record<string, unknown>;
    option[key] = numericKeys.has(key) ? Number(value) : value;
    if (key === "country") {
      option.currency = value === "UK" ? "GBP" : "EUR";
      option.taxProfile = value === "UK" ? "uk-2026" : value === "FR" ? "france-2026" : "effective";
    }
    onChange(next);
  }

  function setShock(key: keyof Decision["shock"], value: string) {
    const next = structuredClone(decision);
    const target = next.shock as Record<string, unknown>;
    target[key] = key === "label" ? value : Number(value);
    onChange(next);
  }

  return (
    <aside className={`studio ${open ? "open" : ""}`} aria-hidden={!open}>
      <header>
        <div><span>DECISION ROOM</span><strong>Build the worlds</strong></div>
        <button onClick={onClose} aria-label="Close decision room">×</button>
      </header>
      <div className="studio-tabs">
        <button className={tab === "decision" ? "active" : ""} onClick={() => setTab("decision")}>01 Decision</button>
        <button className={tab === "paths" ? "active" : ""} onClick={() => setTab("paths")}>02 Paths</button>
        <button className={tab === "shock" ? "active" : ""} onClick={() => setTab("shock")}>03 Shock</button>
      </div>

      <div className="studio-scroll">
        {tab === "decision" && (
          <div className="studio-section">
            <label className="wide-field">
              <span>THE QUESTION</span>
              <textarea value={decision.question} onChange={(event) => onChange({ ...decision, question: event.target.value })} />
            </label>
            <label>
              <span>STARTING SAVINGS</span>
              <div className="money-input"><i>€</i><input type="number" value={decision.startingSavingsEur} onChange={(event) => onChange({ ...decision, startingSavingsEur: Number(event.target.value) })} /></div>
            </label>
            <p className="studio-note">Elsewhere treats every field here as an explicit assumption. GPT‑5.6 can interpret the ledger, but cannot change it.</p>
          </div>
        )}

        {tab === "paths" && (
          <div className="path-editors">
            {decision.options.map((option, index) => (
              <section className="path-editor" key={option.id} style={{ "--accent": option.accent } as React.CSSProperties}>
                <div className="path-editor-head"><span>0{index + 1}</span><input value={option.title} onChange={(event) => setOption(index, "title", event.target.value)} /></div>
                <div className="field-grid">
                  <label><span>PLACE</span><input value={option.location} onChange={(event) => setOption(index, "location", event.target.value)} /></label>
                  <label><span>COUNTRY</span><select value={option.country} onChange={(event) => setOption(index, "country", event.target.value)}><option value="FR">France</option><option value="UK">United Kingdom</option><option value="OTHER">Other</option></select></label>
                  <label><span>GROSS / YEAR ({option.currency})</span><input type="number" value={option.annualGross} onChange={(event) => setOption(index, "annualGross", event.target.value)} /></label>
                  <label><span>RENT / MONTH</span><input type="number" value={option.monthlyRent} onChange={(event) => setOption(index, "monthlyRent", event.target.value)} /></label>
                  <label><span>LIVING / MONTH</span><input type="number" value={option.monthlyLiving} onChange={(event) => setOption(index, "monthlyLiving", event.target.value)} /></label>
                  <label><span>RELOCATION</span><input type="number" value={option.relocation} onChange={(event) => setOption(index, "relocation", event.target.value)} /></label>
                </div>
                <div className="sliders">
                  {(["flexibility", "belonging", "growth", "risk"] as const).map((key) => (
                    <label key={key}><span>{key} <b>{option[key]}</b></span><input type="range" min="0" max="100" value={option[key]} onChange={(event) => setOption(index, key, event.target.value)} /></label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === "shock" && (
          <div className="studio-section">
            <label className="wide-field"><span>WHAT CHANGES?</span><textarea value={decision.shock.label} onChange={(event) => setShock("label", event.target.value)} /></label>
            <div className="field-grid">
              <label><span>ARRIVES IN MONTH</span><input type="number" min="1" max="12" value={decision.shock.month} onChange={(event) => setShock("month", event.target.value)} /></label>
              <label><span>CARE COST / MONTH (€)</span><input type="number" value={decision.shock.monthlyCostEur} onChange={(event) => setShock("monthlyCostEur", event.target.value)} /></label>
              <label><span>TRAVEL COST (€)</span><input type="number" value={decision.shock.travelCostEur} onChange={(event) => setShock("travelCostEur", event.target.value)} /></label>
              <label><span>ENERGY IMPACT</span><input type="number" value={decision.shock.energyPenalty} onChange={(event) => setShock("energyPenalty", event.target.value)} /></label>
            </div>
          </div>
        )}
      </div>

      <footer>
        <div><span>{decision.options.length}</span> worlds <i /> <span>12</span> months</div>
        <button onClick={onRun} disabled={running}>{running ? "Witnesses are living it…" : "Run the multiverse"}<b>↘</b></button>
      </footer>
    </aside>
  );
}
