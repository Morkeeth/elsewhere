"use client";

import { useEffect, useRef, useState } from "react";
import { journeyMeta, makeJourney, makeTwoChoiceJourney, primaryJourneyDomains, type JourneyDomain } from "@/lib/journeys";
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

const steps = ["Your decision", "What matters", "Check the inputs"];
const stepActions = ["Choose what matters", "Check the rough inputs", "See my futures"];
const priorityChoices = [
  ["security", "Safety", "money, stability, predictability"],
  ["energy", "Aliveness", "energy, curiosity, daily texture"],
  ["belonging", "People", "love, community, being understood"],
  ["optionality", "Freedom", "growth, escape routes, future doors"],
] as const;

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
    onChange(makeTwoChoiceJourney(domain));
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

  function addOption() {
    if (decision.options.length >= 4) return;
    const next = structuredClone(decision);
    const template = structuredClone(makeJourney(decision.domain).options[next.options.length]);
    const usedIds = new Set(next.options.map((option) => option.id));
    const baseId = `option-${next.options.length + 1}`;
    let candidateId = baseId;
    let suffix = 2;
    while (usedIds.has(candidateId)) candidateId = `${baseId}-${suffix++}`;
    template.id = candidateId;
    template.title = `Path ${String.fromCharCode(65 + next.options.length)}`;
    template.subtitle = "Name what this future makes possible";
    next.options.push(template);
    onChange(next);
  }

  function removeOption(index: number) {
    if (decision.options.length <= 2) return;
    const next = structuredClone(decision);
    next.options.splice(index, 1);
    onChange(next);
  }

  function setPriority(key: keyof Decision["priorities"], value: number) {
    onChange({ ...decision, priorities: { ...decision.priorities, [key]: value } });
  }

  function choosePriority(key: keyof Decision["priorities"]) {
    onChange({
      ...decision,
      priorities: {
        security: key === "security" ? 46 : 18,
        energy: key === "energy" ? 46 : 18,
        belonging: key === "belonging" ? 46 : 18,
        optionality: key === "optionality" ? 46 : 18,
      },
    });
  }

  const dominantPriority = priorityChoices.reduce((winner, [key]) => decision.priorities[key] > decision.priorities[winner] ? key : winner, "security" as keyof Decision["priorities"]);

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

  function finish() {
    setStep(0);
    onRun();
  }

  const canContinue = step !== 0 || (
    decision.question.trim().length >= 8 &&
    decision.options.every((option) => option.title.trim().length > 0 && option.subtitle.trim().length > 0)
  );

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
            <p className="journey-kicker">START WITH THE KIND OF DECISION</p>
            <h2>What part of life is changing?</h2>
            <p>This gives you two editable starting points and the right rough assumptions. You can rename everything on the next screen.</p>
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
            <p className="journey-kicker">STEP 1 · THE CASE</p>
            <h2>What are you choosing between?</h2>
            <label className="hero-field"><span>THE QUESTION</span><textarea aria-label="The decision question" value={decision.question} onChange={(event) => onChange({ ...decision, question: event.target.value })} /></label>
            <label className="context-field"><span>WHAT SHOULD ELSEWHERE KNOW?</span><textarea aria-label="Decision context" placeholder="A few sentences about timing, constraints, or what makes this hard. Avoid names or sensitive details." value={decision.context} onChange={(event) => onChange({ ...decision, context: event.target.value })} /><small>Optional · sent with the question for qualitative GPT-5.6 perspectives; stored in this browser.</small></label>
            <div className="option-intro"><span>NAME THE LIVES</span><small>Two is enough. Add another only when it is a real option.</small></div>
            <div className="choice-inputs" aria-label={`${decision.options.length} choices`}>
              {decision.options.map((option, index) => <article key={option.id} style={{ "--accent": option.accent } as React.CSSProperties}>
                <header><span>CHOICE {String.fromCharCode(65 + index)}</span>{decision.options.length > 2 && <button onClick={() => removeOption(index)} aria-label={`Remove ${option.title}`}>Remove</button>}</header>
                <input aria-label={`Choice ${String.fromCharCode(65 + index)} name`} value={option.title} onChange={(event) => setOption(index, { title: event.target.value })} />
                <input aria-label={`Choice ${String.fromCharCode(65 + index)} pull`} value={option.subtitle} onChange={(event) => setOption(index, { subtitle: event.target.value })} />
              </article>)}
            </div>
            {decision.options.length < 4 && <button className="add-choice" onClick={addOption}>+ Add another real option</button>}
            <details className="fine-tune">
              <summary>Add a place or context <span>OPTIONAL</span><b>+</b></summary>
              <div className="journey-options">
              {decision.options.map((option, index) => (
                <article key={option.id} style={{ "--accent": option.accent } as React.CSSProperties}>
                  <span>0{index + 1}</span>
                  <strong>{option.title}</strong>
                  <input aria-label={`Future ${index + 1} place`} value={option.location} onChange={(event) => setOption(index, { location: event.target.value })} />
                </article>
              ))}
              </div>
            </details>
          </section>
        )}

        {step === 1 && (
          <section className="journey-screen priorities-step">
            <p className="journey-kicker">STEP 2 · YOUR PRIORITY</p>
            <h2>What needs protecting most?</h2>
            <p>Pick one instinctively. The result still shows the trade-offs through the other three.</p>
            <div className="priority-choices">
              {priorityChoices.map(([key, label, copy]) => <button key={key} className={dominantPriority === key ? "selected" : ""} onClick={() => choosePriority(key)} aria-pressed={dominantPriority === key}><span>{label}</span><small>{copy}</small><b>{dominantPriority === key ? "✓" : "+"}</b></button>)}
            </div>
            <details className="fine-tune">
              <summary>Fine-tune all four weights <span>OPTIONAL</span><b>+</b></summary>
              <div className="priority-stack">
                {priorityChoices.map(([key, label, copy]) => (
                  <label key={key}>
                    <div><b>{label}</b><small>{copy}</small><strong>{decision.priorities[key]}</strong></div>
                    <input aria-label={label} type="range" min="0" max="100" value={decision.priorities[key]} onChange={(event) => setPriority(key, Number(event.target.value))} />
                  </label>
                ))}
              </div>
            </details>
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
            <p className="journey-kicker">STEP 3 · A QUICK REALITY CHECK</p>
            <h2>{decision.domain === "relationships" ? "How might each path feel?" : "Check the numbers that differ."}</h2>
            <p>{decision.domain === "relationships" ? "These are your rough estimates about each path—not scores about another person. Change what feels wrong." : "We filled rough examples so you can keep moving. Change what you know; anything you leave alone remains an estimate."}</p>
            {decision.domain !== "relationships" && (
              <label className="savings-field"><span>YOUR CURRENT RUNWAY</span><div><i>€</i><input aria-label="Current savings" type="number" value={decision.startingSavingsEur} onChange={(event) => onChange({ ...decision, startingSavingsEur: Number(event.target.value) })} /></div></label>
            )}
            <div className="assumption-note"><span>ROUGH INPUTS</span><strong>Edit only what changes the comparison.</strong><small>These values are transparent scenario assumptions, not predictions.</small></div>
            <div className="reality-cards visible">
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
                      {option.country !== "OTHER" && <small className="rate-input-note sourced-rate">Tax calculation sourced for {option.country === "FR" ? "France" : "the UK"}. Other costs remain your estimates.</small>}
                    </div>
                  )}
                </article>
              ))}
            </div>
            {decision.contextLenses.length > 0 && <p className="transmission-note">Before live witnesses run, you’ll confirm that selected user-authored perspective text is sent to OpenAI for qualitative interpretation. It remains stored locally in this browser.</p>}
          </section>
        )}
      </div>

      {step >= 0 && (
        <footer className="journey-footer">
          <button className="back" onClick={() => moveTo(step - 1)}>← {step === 0 ? "Change decision" : "Back"}</button>
          {step < steps.length - 1
            ? <button className="next" onClick={() => moveTo(step + 1)} disabled={!canContinue}>{stepActions[step]}<b>↗</b></button>
            : <button className="next" onClick={finish} disabled={running || !canContinue}>{running ? "Opening…" : stepActions[step]}<b>↘</b></button>}
        </footer>
      )}
    </aside>
  );
}
