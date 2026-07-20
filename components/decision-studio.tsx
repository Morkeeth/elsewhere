"use client";

import { useEffect, useRef, useState } from "react";
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

const steps = ["The futures", "What matters", "Reality check", "Plot twist"];
const stepActions = ["Set what matters", "Ground these futures", "Stress-test the plan", "Visit my futures"];
export function DecisionStudio({ decision, open, running, onClose, onChange, onRun, initialStep = 0 }: Props) {
  const [step, setStep] = useState(initialStep);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
  }, [open]);

  function moveTo(nextStep: number) {
    setStep(nextStep);
    window.requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function chooseDomain(domain: JourneyDomain) {
    onChange(makeJourney(domain));
    moveTo(0);
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
        <div><span>ELSEWHERE / {step < 0 ? "START" : `${step + 1} OF ${steps.length}`}</span><strong>{step < 0 ? "Your world" : steps[step]}</strong></div>
        <button onClick={onClose} aria-label="Close decision room">×</button>
      </header>

      <div className={`journey-progress ${step < 0 ? "start" : ""}`} aria-hidden="true">
        {steps.map((label, index) => <i key={label} className={index <= step ? "done" : ""} />)}
      </div>

      <div className="studio-scroll journey-scroll" ref={scrollRef}>
        {step < 0 && (
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

        {step === 0 && (
          <section className="journey-screen">
            <p className="journey-kicker">SAY IT LIKE YOU’D TEXT A FRIEND</p>
            <h2>What are you actually deciding?</h2>
            <label className="hero-field"><span>THE QUESTION</span><textarea aria-label="The decision question" value={decision.question} onChange={(event) => onChange({ ...decision, question: event.target.value })} /></label>
            <div className="option-intro"><span>THE FOUR LIVES TO OPEN</span><small>These are editable starting points—not four answers you need to invent.</small></div>
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

        {step === 1 && (
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
            <details className="optional-perspectives">
              <summary><span>OPTIONAL</span> Add a perspective you are already carrying <b>+</b></summary>
              <div className="optional-perspectives-copy">
                <p>This is your model of a perspective—not a prediction of a real person. It stays optional because the core decision should work without it.</p>
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
                <small className="perspective-note">Stored in this browser. If you run live witnesses, selected text is sent to OpenAI for qualitative interpretation with response storage disabled. Never pass it off as someone else’s actual view.</small>
              </div>
            </details>
          </section>
        )}

        {step === 2 && (
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
                      {option.country === "OTHER" && <>
                        <label><span>EST. TAX RATE (%)</span><input aria-label={`${option.title} estimated tax rate`} type="number" min="0" max="60" step="0.1" value={option.effectiveTaxRate * 100} onChange={(event) => setOption(index, { effectiveTaxRate: Number(event.target.value) / 100 })} /></label>
                        <label><span>EST. CONTRIBUTIONS (%)</span><input aria-label={`${option.title} estimated contribution rate`} type="number" min="0" max="60" step="0.1" value={option.employeeContributionRate * 100} onChange={(event) => setOption(index, { employeeContributionRate: Number(event.target.value) / 100 })} /></label>
                        <small className="rate-input-note">User-provided estimates. Elsewhere does not source tax rules outside France and the UK.</small>
                      </>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
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
            {decision.contextLenses.length > 0 && <p className="transmission-note">Before live witnesses run, you’ll confirm that selected user-authored perspective text is sent to OpenAI for qualitative interpretation. It remains stored locally in this browser.</p>}
          </section>
        )}
      </div>

      {step >= 0 && (
        <footer className="journey-footer">
          <button className="back" onClick={() => moveTo(step - 1)}>← {step === 0 ? "Change decision" : "Back"}</button>
          {step < steps.length - 1
            ? <button className="next" onClick={() => moveTo(step + 1)}>{stepActions[step]}<b>↗</b></button>
            : <button className="next" onClick={finish} disabled={running}>{running ? "Opening…" : stepActions[step]}<b>↘</b></button>}
        </footer>
      )}
    </aside>
  );
}
