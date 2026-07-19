"use client";

import { useState } from "react";
import { journeyMeta, makeJourney, primaryJourneyDomains, shockPresets, type JourneyDomain } from "@/lib/journeys";
import type { ContextLens, Decision, DecisionOption } from "@/lib/schema";

type Props = {
  decision: Decision;
  open: boolean;
  running: boolean;
  onClose: () => void;
  onChange: (decision: Decision) => void;
  onRun: () => void;
  initialStep?: number;
};

const steps = ["Your world", "The futures", "What matters", "Perspectives", "Reality check", "Plot twist"];
export function DecisionStudio({ decision, open, running, onClose, onChange, onRun, initialStep = 0 }: Props) {
  const [step, setStep] = useState(initialStep);

  function chooseDomain(domain: JourneyDomain) {
    onChange(makeJourney(domain));
    setStep(1);
  }

  function setOption(index: number, patch: Partial<DecisionOption>) {
    const next = structuredClone(decision);
    next.options[index] = { ...next.options[index], ...patch };
    if (patch.country) {
      next.options[index].currency = patch.country === "UK" ? "GBP" : "EUR";
      next.options[index].taxProfile = patch.country === "UK" ? "uk-2026" : patch.country === "FR" ? "france-2026" : "effective";
    }
    onChange(next);
  }

  function setPriority(key: keyof Decision["priorities"], value: number) {
    onChange({ ...decision, priorities: { ...decision.priorities, [key]: value } });
  }

  function addContextLens() {
    if (decision.contextLenses.length >= 2) return;
    const next = structuredClone(decision);
    next.contextLenses.push({
      id: `perspective-${Date.now()}`,
      label: "My model of Mum’s protective concern",
      protectedValues: ["proximity", "support"],
      knownConcern: "She may worry about how easily I can show up when life becomes difficult.",
      unknown: "I have not asked her how she sees this exact decision.",
      provenanceLabel: "user-authored perspective",
    });
    onChange(next);
  }

  function setContextLens(index: number, patch: Partial<ContextLens>) {
    const next = structuredClone(decision);
    next.contextLenses[index] = { ...next.contextLenses[index], ...patch };
    onChange(next);
  }

  function removeContextLens(index: number) {
    const next = structuredClone(decision);
    next.contextLenses.splice(index, 1);
    onChange(next);
  }

  function chooseShock(preset: (typeof shockPresets)[JourneyDomain][number]) {
    onChange({ ...decision, shock: { ...decision.shock, ...preset } });
  }

  function setShockValue(key: "monthlyCostEur" | "travelCostEur" | "energyPenalty" | "belongingPenalty", value: number) {
    onChange({ ...decision, shock: { ...decision.shock, [key]: Math.max(0, value) } });
  }

  function finish() {
    setStep(0);
    onRun();
  }

  return (
    <aside className={`studio journey ${open ? "open" : ""}`} aria-hidden={!open}>
      <header>
        <div><span>ELSEWHERE / {step + 1} OF {steps.length}</span><strong>{steps[step]}</strong></div>
        <button onClick={onClose} aria-label="Close decision room">×</button>
      </header>

      <div className="journey-progress" aria-hidden="true">
        {steps.map((label, index) => <i key={label} className={index <= step ? "done" : ""} />)}
      </div>

      <div className="studio-scroll journey-scroll">
        {step === 0 && (
          <section className="journey-screen intro-step">
            <p className="journey-kicker">WHAT KIND OF ELSEWHERE?</p>
            <h2>What’s taking up space in your head?</h2>
            <p>Pick the closest shape. You can rewrite every word next.</p>
            <div className="domain-grid">
              {primaryJourneyDomains.map((domain) => {
                const meta = journeyMeta[domain];
                return (
                <button key={domain} onClick={() => chooseDomain(domain)}>
                  <b>{meta.icon}</b><span>{meta.label}</span><small>{meta.line}</small><i>↗</i>
                </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="journey-screen">
            <p className="journey-kicker">SAY IT LIKE YOU’D TEXT A FRIEND</p>
            <h2>What are you actually deciding?</h2>
            <label className="hero-field"><span>THE QUESTION</span><textarea aria-label="The decision question" value={decision.question} onChange={(event) => onChange({ ...decision, question: event.target.value })} /></label>
            <div className="option-intro"><span>THE FOUR LIVES TO OPEN</span><small>Four defensible futures reveal the hidden doors between them.</small></div>
            <div className="journey-options">
              {decision.options.map((option, index) => (
                <article key={option.id} style={{ "--accent": option.accent } as React.CSSProperties}>
                  <span>0{index + 1}</span>
                  <input aria-label={`Future ${index + 1} name`} value={option.title} onChange={(event) => setOption(index, { title: event.target.value })} />
                  <input aria-label={`Future ${index + 1} meaning`} value={option.subtitle} onChange={(event) => setOption(index, { subtitle: event.target.value })} />
                  <input aria-label={`Future ${index + 1} place`} value={option.location} onChange={(event) => setOption(index, { location: event.target.value })} />
                </article>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="journey-screen priorities-step">
            <p className="journey-kicker">NO “RIGHT” ANSWER—ONLY YOUR WEIGHTS</p>
            <h2>What deserves more volume right now?</h2>
            <p>Move the sliders fast. Your first instinct is useful data.</p>
            <div className="priority-stack">
              {([
                ["security", "Safety", "money, stability, predictability"],
                ["energy", "Aliveness", "energy, curiosity, daily texture"],
                ["belonging", "People", "love, community, being understood"],
                ["optionality", "Freedom", "growth, escape routes, future doors"],
              ] as const).map(([key, label, copy]) => (
                <label key={key}>
                  <div><b>{label}</b><small>{copy}</small><strong>{decision.priorities[key]}</strong></div>
                  <input aria-label={label} type="range" min="0" max="100" value={decision.priorities[key]} onChange={(event) => setPriority(key, Number(event.target.value))} />
                </label>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="journey-screen perspectives-step">
            <p className="journey-kicker">THE PEOPLE IN THE ROOM</p>
            <h2>Add the concern you are already carrying.</h2>
            <p>This is your model of a perspective—not a prediction of a real person. Name what it protects, what you know, and what you still need to ask.</p>
            <div className="perspective-stack">
              {decision.contextLenses.map((lens, index) => (
                <article className="perspective-card" key={lens.id}>
                  <div className="perspective-card-head"><span>USER-AUTHORED PERSPECTIVE</span><button onClick={() => removeContextLens(index)} aria-label={`Remove ${lens.label}`}>Remove</button></div>
                  <label><span>NAME THIS PERSPECTIVE</span><input aria-label="Perspective name" value={lens.label} onChange={(event) => setContextLens(index, { label: event.target.value })} /></label>
                  <label><span>WHAT IT PROTECTS</span><input aria-label="Values this perspective protects" value={lens.protectedValues.join(", ")} onChange={(event) => setContextLens(index, { protectedValues: event.target.value.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 4) })} /></label>
                  <label><span>WHAT I THINK I KNOW</span><textarea aria-label="Known concern" value={lens.knownConcern} onChange={(event) => setContextLens(index, { knownConcern: event.target.value })} /></label>
                  <label><span>WHAT I DO NOT KNOW YET</span><textarea aria-label="Unknown concern" value={lens.unknown} onChange={(event) => setContextLens(index, { unknown: event.target.value })} /></label>
                </article>
              ))}
            </div>
            {decision.contextLenses.length < 2 && <button className="add-perspective" onClick={addContextLens}>+ Add a perspective</button>}
            <small className="perspective-note">Try: “my model of Mum’s protective concern,” “a cofounder’s risk lens,” or “future me’s freedom.” Never pass it off as someone else’s actual view.</small>
          </section>
        )}

        {step === 4 && (
          <section className="journey-screen">
            <p className="journey-kicker">GROUND THE VIBE</p>
            <h2>{decision.domain === "relationships" ? "How would each future feel?" : "Give the futures real gravity."}</h2>
            <p>{decision.domain === "relationships" ? "These are personal estimates, not scores about another person." : "Rough numbers are fine. Every assumption stays visible later."}</p>
            {decision.domain !== "relationships" && (
              <label className="savings-field"><span>YOUR CURRENT RUNWAY</span><div><i>€</i><input aria-label="Current savings" type="number" value={decision.startingSavingsEur} onChange={(event) => onChange({ ...decision, startingSavingsEur: Number(event.target.value) })} /></div></label>
            )}
            <div className="reality-cards">
              {decision.options.map((option, index) => (
                <article key={option.id} style={{ "--accent": option.accent } as React.CSSProperties}>
                  <header><span>0{index + 1}</span><strong>{option.title}</strong></header>
                  {decision.domain === "relationships" ? (
                    <div className="mini-sliders">
                      <label><span>freedom <b>{option.flexibility}</b></span><input aria-label={`${option.title} freedom`} type="range" min="0" max="100" value={option.flexibility} onChange={(event) => setOption(index, { flexibility: Number(event.target.value) })} /></label>
                      <label><span>belonging <b>{option.belonging}</b></span><input aria-label={`${option.title} belonging`} type="range" min="0" max="100" value={option.belonging} onChange={(event) => setOption(index, { belonging: Number(event.target.value) })} /></label>
                      <label><span>growth <b>{option.growth}</b></span><input aria-label={`${option.title} growth`} type="range" min="0" max="100" value={option.growth} onChange={(event) => setOption(index, { growth: Number(event.target.value) })} /></label>
                    </div>
                  ) : (
                    <div className="fact-grid">
                      <label><span>COUNTRY</span><select aria-label={`${option.title} country`} value={option.country} onChange={(event) => setOption(index, { country: event.target.value as DecisionOption["country"] })}><option value="FR">France</option><option value="UK">UK</option><option value="OTHER">Other</option></select></label>
                      <label><span>GROSS / YEAR</span><input aria-label={`${option.title} annual income`} type="number" value={option.annualGross} onChange={(event) => setOption(index, { annualGross: Number(event.target.value) })} /></label>
                      <label><span>RENT / MONTH</span><input aria-label={`${option.title} monthly rent`} type="number" value={option.monthlyRent} onChange={(event) => setOption(index, { monthlyRent: Number(event.target.value) })} /></label>
                      <label><span>LIVING / MONTH</span><input aria-label={`${option.title} monthly living costs`} type="number" value={option.monthlyLiving} onChange={(event) => setOption(index, { monthlyLiving: Number(event.target.value) })} /></label>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="journey-screen shock-step">
            <p className="journey-kicker">NOW BREAK THE PERFECT PLAN</p>
            <h2>What could change the weights?</h2>
            <p>Pick a plot twist, then make its practical impact explicit. The ledger reruns exactly these effects.</p>
            <div className="shock-ideas">
              {shockPresets[decision.domain].map((preset) => <button key={preset.label} className={decision.shock.label === preset.label ? "selected" : ""} onClick={() => chooseShock(preset)}>{preset.label}<span>+</span></button>)}
            </div>
            <label className="hero-field"><span>MY OWN PLOT TWIST</span><textarea aria-label="Custom plot twist" value={decision.shock.label} onChange={(event) => onChange({ ...decision, shock: { ...decision.shock, label: event.target.value } })} /></label>
            <div className="fact-grid shock-impact">
              <label><span>MONTHLY COST</span><input aria-label="Shock monthly cost" type="number" min="0" value={decision.shock.monthlyCostEur} onChange={(event) => setShockValue("monthlyCostEur", Number(event.target.value))} /></label>
              <label><span>TRAVEL / MONTH</span><input aria-label="Shock monthly travel cost" type="number" min="0" value={decision.shock.travelCostEur} onChange={(event) => setShockValue("travelCostEur", Number(event.target.value))} /></label>
              <label><span>ENERGY HIT</span><input aria-label="Shock energy penalty" type="number" min="0" max="100" value={decision.shock.energyPenalty} onChange={(event) => setShockValue("energyPenalty", Number(event.target.value))} /></label>
              <label><span>BELONGING HIT</span><input aria-label="Shock belonging penalty" type="number" min="0" max="100" value={decision.shock.belongingPenalty} onChange={(event) => setShockValue("belongingPenalty", Number(event.target.value))} /></label>
            </div>
            <div className="shock-timing">
              <label><span>WHEN?</span><strong>Month {decision.shock.month}</strong><input aria-label="Shock month" type="range" min="1" max="12" value={decision.shock.month} onChange={(event) => onChange({ ...decision, shock: { ...decision.shock, month: Number(event.target.value) } })} /></label>
              <div><span>{decision.options.length}</span> futures <i /> <span>12</span> months <i /> <span>1</span> plot twist</div>
            </div>
          </section>
        )}
      </div>

      {step > 0 && (
        <footer className="journey-footer">
          <button className="back" onClick={() => setStep(step - 1)}>← Back</button>
          {step < steps.length - 1
            ? <button className="next" onClick={() => setStep(step + 1)}>Keep going <b>↗</b></button>
            : <button className="next" onClick={finish} disabled={running}>{running ? "Opening…" : "Visit my futures"}<b>↘</b></button>}
        </footer>
      )}
    </aside>
  );
}
