"use client";

import { useEffect, useRef, useState } from "react";
import { journeyMeta, makeJourney, makeTwoChoiceJourney, primaryJourneyDomains, shockPresets, type JourneyDomain } from "@/lib/journeys";
import type { Decision, DecisionOption } from "@/lib/schema";

type Props = {
  decision: Decision;
  open: boolean;
  running: boolean;
  onClose: () => void;
  onChange: (decision: Decision) => void;
  onRun: (startPressured?: boolean) => void;
  initialStep?: number;
};

const jurisdictions = [
  "France",
  "United Kingdom",
  "United States",
  "Canada",
  "Germany",
  "Spain",
  "Portugal",
  "Netherlands",
  "Switzerland",
  "United Arab Emirates",
  "Singapore",
  "Australia",
  "Japan",
  "Other",
] as const;

function comparisonQuestion(decision: Decision) {
  const names = decision.options.map((option) => option.title.trim()).filter(Boolean);
  const choices = names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names[0] ?? "these paths";
  return decision.domain === "career"
    ? `Which work life should I rehearse for the next year: ${choices}?`
    : `Which place should I rehearse for the next year: ${choices}?`;
}

function visibleJurisdiction(option: DecisionOption) {
  if (option.jurisdiction !== "Other" || option.country === "OTHER") return option.jurisdiction;
  return option.country === "FR" ? "France" : "United Kingdom";
}

export function DecisionStudio({ decision, open, running, onClose, onChange, onRun, initialStep = 0 }: Props) {
  const [step, setStep] = useState(initialStep);
  const [groundingIndex, setGroundingIndex] = useState(0);
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

  function commit(next: Decision) {
    next.question = comparisonQuestion(next);
    onChange(next);
  }

  function setOption(index: number, patch: Partial<DecisionOption>) {
    const next = structuredClone(decision);
    if (next.options[index].jurisdiction === "Other" && next.options[index].country !== "OTHER") {
      next.options[index].jurisdiction = next.options[index].country === "FR" ? "France" : "United Kingdom";
    }
    next.options[index] = { ...next.options[index], ...patch };
    if (patch.country) {
      next.options[index].currency = patch.country === "UK" ? "GBP" : "EUR";
      next.options[index].taxProfile = patch.country === "UK" ? "uk-2026" : patch.country === "FR" ? "france-2026" : "effective";
    }
    commit(next);
  }

  function setJurisdiction(index: number, jurisdiction: string) {
    const country = jurisdiction === "France" ? "FR" : jurisdiction === "United Kingdom" ? "UK" : "OTHER";
    setOption(index, { jurisdiction, country });
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
    template.subtitle = decision.domain === "career" ? "Another work life" : "Another place to live";
    template.location = decision.domain === "career" ? "Work setting" : "Place";
    next.options.push(template);
    commit(next);
  }

  function removeOption(index: number) {
    if (decision.options.length <= 2) return;
    const next = structuredClone(decision);
    next.options.splice(index, 1);
    commit(next);
  }

  function chooseShock(shock: Decision["shock"]) {
    onChange({ ...decision, shock: { ...shock } });
  }

  function setScenarioEffect(key: "monthlyCostEur" | "travelCostEur" | "energyPenalty" | "belongingPenalty", value: number) {
    onChange({ ...decision, shock: { ...decision.shock, [key]: Math.max(0, value) } });
  }

  function finish() {
    const startPressured = step === 3;
    setStep(0);
    setGroundingIndex(0);
    onRun(startPressured);
  }

  const canContinue = decision.options.every((option) => option.title.trim().length > 0);
  const supportedDomain = decision.domain === "moving" ? "moving" : "career";
  const scenarioEditor = step === 3;
  const setupSteps = ["Name the lives", ...decision.options.map((_, index) => `Ground life ${String.fromCharCode(65 + index)}`)];
  const setupIndex = step === 2 ? groundingIndex + 1 : 0;
  const groundingOption = decision.options[groundingIndex] ?? decision.options[0];
  const lastGroundingStep = groundingIndex === decision.options.length - 1;

  return (
    <aside className={`studio journey ${open ? "open" : ""}`} aria-hidden={!open}>
      <header>
        <div><span>ELSEWHERE / {step < 0 ? "START" : scenarioEditor ? "TRY ANOTHER CONDITION" : `${setupIndex + 1} OF ${setupSteps.length}`}</span><strong>{step < 0 ? "Open a decision" : scenarioEditor ? "Change one thing" : setupSteps[setupIndex]}</strong></div>
        <button onClick={onClose} aria-label="Close decision room">×</button>
      </header>

      <div className={`journey-progress ${step < 0 ? "start" : ""}`} aria-hidden="true">
        {(scenarioEditor ? ["Change one thing"] : setupSteps).map((label, index) => <i key={label} className={scenarioEditor || index <= setupIndex ? "done" : ""} />)}
      </div>

      <div className="studio-scroll journey-scroll" ref={scrollRef}>
        {step < 0 && (
          <section className="journey-screen intro-step">
            <p className="journey-kicker">THE DECISIONS ELSEWHERE CAN GROUND WELL</p>
            <h2>Is this about work or place?</h2>
            <p>Start with the shape closest to your decision. Elsewhere will ask only for the facts that can change that comparison.</p>
            <div className="domain-grid focused">
              {primaryJourneyDomains.map((domain) => {
                const meta = journeyMeta[domain];
                return (
                  <button key={domain} onClick={() => chooseDomain(domain)}>
                    <b>{meta.icon}</b><span>{meta.label}</span><small>{meta.line}</small><i>↗</i>
                  </button>
                );
              })}
            </div>
            <p className="scope-note">Career and moving are the current grounded product. Other kinds of life decisions need different evidence models and are not being disguised as the same calculator.</p>
          </section>
        )}

        {step === 0 && (
          <section className="journey-screen">
            <p className="journey-kicker">STEP 1 · TWO REAL LIVES</p>
            <h2>Name what you are choosing between.</h2>
            <p>No scenario writing. Use the names you already use in your head.</p>
            <div className="choice-inputs calm" aria-label={`${decision.options.length} choices`}>
              {decision.options.map((option, index) => (
                <article key={option.id} style={{ "--accent": option.accent } as React.CSSProperties}>
                  <header><span>LIFE {String.fromCharCode(65 + index)}</span>{decision.options.length > 2 && <button onClick={() => removeOption(index)} aria-label={`Remove ${option.title}`}>Remove</button>}</header>
                  <input aria-label={`Life ${String.fromCharCode(65 + index)} name`} value={option.title} placeholder={decision.domain === "career" ? (index === 0 ? "Stay in my role" : "Take the new role") : (index === 0 ? "Stay here" : "Move there")} onChange={(event) => setOption(index, { title: event.target.value })} />
                </article>
              ))}
            </div>
            {decision.options.length < 4 && <button className="add-choice quiet" onClick={addOption}>+ There is another real path</button>}
            <div className="question-preview"><span>ELSEWHERE WILL REHEARSE</span><strong>{comparisonQuestion(decision)}</strong></div>
            <details className="runway-details context-details">
              <summary>Add one sentence of context <span>OPTIONAL</span><b>+</b></summary>
              <label className="context-field single-prompt">
                <span>WHAT SHOULD THE WITNESSES UNDERSTAND?</span>
                <textarea aria-label="Decision context" placeholder={decision.domain === "career" ? "I want work that stretches me without consuming every evening." : "I want more space without quietly losing the people and rhythm I already have."} value={decision.context} onChange={(event) => onChange({ ...decision, context: event.target.value })} />
                <small>One sentence is enough. You can leave this blank.</small>
              </label>
            </details>
          </section>
        )}

        {step === 2 && (
          <section className="journey-screen grounding-step">
            <p className="journey-kicker">LIFE {String.fromCharCode(65 + groundingIndex)} · {groundingOption.title.toUpperCase()}</p>
            <h2>Make this life real.</h2>
            <p>{decision.domain === "career" ? "Only the recurring facts: where, pay, hours, and travel. Elsewhere will make the scene vivid afterward." : "Only the recurring facts: place, rent, space, and travel. Elsewhere will make the scene vivid afterward."}</p>
            <div className="loaded-assumptions"><span>STARTING ESTIMATES</span><strong>VISIBLE + EDITABLE</strong><small>These are scenario inputs, not facts Elsewhere discovered about you.</small></div>
            <div className="reality-cards focused">
              {[groundingOption].map((option) => {
                const index = groundingIndex;
                return (
                <article key={option.id} style={{ "--accent": option.accent } as React.CSSProperties}>
                  <header><span>{String.fromCharCode(65 + index)}</span><strong>{option.title}</strong></header>
                  <div className="fact-grid essential-facts">
                    <label><span>{decision.domain === "career" ? "WHERE" : "PLACE"}</span><input aria-label={`${option.title} place`} value={option.location} onChange={(event) => setOption(index, { location: event.target.value })} /></label>
                    <label><span>COUNTRY</span><select aria-label={`${option.title} country`} value={visibleJurisdiction(option)} onChange={(event) => setJurisdiction(index, event.target.value)}>{jurisdictions.map((label) => <option key={label} value={label}>{label}</option>)}</select></label>
                    <label><span>{decision.domain === "career" ? "PAY / YEAR" : "INCOME / YEAR"}{option.country === "OTHER" ? " · € EQUIV." : ""}</span><input aria-label={`${option.title} annual income`} type="number" value={option.annualGross} onChange={(event) => setOption(index, { annualGross: Number(event.target.value) })} /></label>
                    {decision.domain === "moving" && <label><span>RENT / MONTH</span><input aria-label={`${option.title} monthly rent`} type="number" value={option.monthlyRent} onChange={(event) => setOption(index, { monthlyRent: Number(event.target.value) })} /></label>}
                    {decision.domain === "moving" && <label><span>SPACE · M²</span><input aria-label={`${option.title} space`} type="number" value={option.spaceSqm} onChange={(event) => setOption(index, { spaceSqm: Number(event.target.value) })} /></label>}
                    <label><span>OFFICE · MIN ONE WAY</span><input aria-label={`${option.title} commute minutes`} type="number" value={option.commuteMinutes} onChange={(event) => setOption(index, { commuteMinutes: Number(event.target.value) })} /></label>
                    {decision.domain === "moving" && <label><span>FRIENDS · MIN ONE WAY</span><input aria-label={`${option.title} minutes to friends`} type="number" value={option.friendsMinutes} onChange={(event) => setOption(index, { friendsMinutes: Number(event.target.value) })} /></label>}
                    {decision.domain === "moving" && <label><span>USUAL PLACES · MIN</span><input aria-label={`${option.title} minutes to usual places`} type="number" value={option.dailyLifeMinutes} onChange={(event) => setOption(index, { dailyLifeMinutes: Number(event.target.value) })} /></label>}
                    {decision.domain === "moving" && <label><span>NATURE · MIN ONE WAY</span><input aria-label={`${option.title} minutes to nature`} type="number" value={option.natureMinutes} onChange={(event) => setOption(index, { natureMinutes: Number(event.target.value) })} /></label>}
                    {decision.domain === "career" && <label><span>WORK HOURS / WEEK</span><input aria-label={`${option.title} weekly hours`} type="number" value={option.weeklyHours} onChange={(event) => setOption(index, { weeklyHours: Number(event.target.value) })} /></label>}
                    {option.country === "OTHER" && <>
                      <label><span>YOUR EST. TAX %</span><input aria-label={`${option.title} estimated tax rate`} type="number" min="0" max="60" step="0.1" value={option.effectiveTaxRate * 100} onChange={(event) => setOption(index, { effectiveTaxRate: Number(event.target.value) / 100 })} /></label>
                      <label><span>YOUR EST. CONTRIBUTIONS %</span><input aria-label={`${option.title} estimated contribution rate`} type="number" min="0" max="60" step="0.1" value={option.employeeContributionRate * 100} onChange={(event) => setOption(index, { employeeContributionRate: Number(event.target.value) / 100 })} /></label>
                      <small className="rate-input-note">{visibleJurisdiction(option).toUpperCase()} · USER-PROVIDED, NOT SOURCED · Enter money as a EUR equivalent. Elsewhere does not claim tax or FX coverage here.</small>
                    </>}
                    {option.country !== "OTHER" && <small className="rate-input-note sourced-rate">SOURCED · {option.country === "FR" ? "France 2026 tax rules" : "UK 2026 tax + NI rules"}</small>}
                  </div>
                  <details className="path-details">
                    <summary>Adjust softer assumptions <b>+</b></summary>
                    <div className="mini-sliders">
                      <label><span>growth and learning <b>{option.growth}</b></span><input aria-label={`${option.title} growth and learning`} type="range" min="0" max="100" value={option.growth} onChange={(event) => setOption(index, { growth: Number(event.target.value) })} /></label>
                      <label><span>belonging <b>{option.belonging}</b></span><input aria-label={`${option.title} belonging`} type="range" min="0" max="100" value={option.belonging} onChange={(event) => setOption(index, { belonging: Number(event.target.value) })} /></label>
                      <label><span>freedom to change course <b>{option.flexibility}</b></span><input aria-label={`${option.title} freedom`} type="range" min="0" max="100" value={option.flexibility} onChange={(event) => setOption(index, { flexibility: Number(event.target.value) })} /></label>
                      <label><span>daily strain <b>{option.risk}</b></span><input aria-label={`${option.title} daily strain`} type="range" min="0" max="100" value={option.risk} onChange={(event) => setOption(index, { risk: Number(event.target.value) })} /></label>
                    </div>
                    <div className="fact-grid secondary-facts">
                      {decision.domain === "career" && <label><span>RENT / MONTH</span><input aria-label={`${option.title} monthly rent`} type="number" value={option.monthlyRent} onChange={(event) => setOption(index, { monthlyRent: Number(event.target.value) })} /></label>}
                      <label><span>OTHER LIVING / MONTH</span><input aria-label={`${option.title} monthly living costs`} type="number" value={option.monthlyLiving} onChange={(event) => setOption(index, { monthlyLiving: Number(event.target.value) })} /></label>
                    </div>
                  </details>
                </article>
                );
              })}
            </div>
            {decision.domain === "moving" && lastGroundingStep && <div className="life-frequency"><span>HOW OFTEN THESE PLACES ENTER YOUR WEEK</span><div><label><b>Office</b><input aria-label="Office days each week" type="number" min="0" max="7" value={decision.baselineDaysPerWeek} onChange={(event) => onChange({ ...decision, baselineDaysPerWeek: Number(event.target.value) })} /><small>days / week</small></label><label><b>Friends</b><input aria-label="Social trips each week" type="number" min="0" max="14" value={decision.socialTripsPerWeek} onChange={(event) => onChange({ ...decision, socialTripsPerWeek: Number(event.target.value) })} /><small>trips / week</small></label><label><b>Usual places</b><input aria-label="Usual place trips each week" type="number" min="0" max="21" value={decision.dailyLifeTripsPerWeek} onChange={(event) => onChange({ ...decision, dailyLifeTripsPerWeek: Number(event.target.value) })} /><small>trips / week</small></label><label><b>Nature</b><input aria-label="Nature trips each week" type="number" min="0" max="14" value={decision.natureTripsPerWeek} onChange={(event) => onChange({ ...decision, natureTripsPerWeek: Number(event.target.value) })} /><small>trips / week</small></label></div></div>}
            {lastGroundingStep && <details className="runway-details">
              <summary>Add my current safety buffer <span>OPTIONAL</span><b>+</b></summary>
              <label className="savings-field"><span>CURRENT SAVINGS</span><div><i>€</i><input aria-label="Current savings" type="number" value={decision.startingSavingsEur} onChange={(event) => onChange({ ...decision, startingSavingsEur: Number(event.target.value) })} /></div></label>
            </details>}
          </section>
        )}

        {step === 3 && (
          <section className="journey-screen uncertainty-step">
            <p className="journey-kicker">CHANGE ONE THING · KEEP THE REST FIXED</p>
            <h2>What would change your mind?</h2>
            <p>Name one plausible change. Elsewhere will replay the same lives and show exactly what depends on it.</p>
            <div className="shock-ideas uncertainty-choices">
              {shockPresets[supportedDomain].map((preset) => {
                const selected = decision.shock.label.startsWith(preset.label);
                return <button key={preset.label} className={selected ? "selected" : ""} onClick={() => chooseShock(preset)}><span>{preset.label}</span><b>{selected ? "✓" : "+"}</b></button>;
              })}
            </div>
            <label className="hero-field uncertainty-label"><span>OR NAME THE CONDITION IN YOUR OWN WORDS</span><textarea aria-label="The condition to vary" value={decision.shock.label} onChange={(event) => onChange({ ...decision, shock: { ...decision.shock, label: event.target.value } })} /></label>
            {decision.domain === "moving" && /remote work|office/i.test(decision.shock.label) && <div className="days-change"><label><span>NOW</span><input aria-label="Current days on site" type="number" min="0" max="7" value={decision.baselineDaysPerWeek} onChange={(event) => onChange({ ...decision, baselineDaysPerWeek: Number(event.target.value) })} /></label><i>→</i><label><span>COULD BECOME</span><input aria-label="Possible days on site" type="number" min="0" max="7" value={decision.pressureDaysPerWeek} onChange={(event) => onChange({ ...decision, pressureDaysPerWeek: Number(event.target.value) })} /></label><small>days on site each week</small></div>}
            <details className="scenario-effects">
              <summary>Ground how this condition affects the month <span>EDITABLE ASSUMPTIONS</span><b>+</b></summary>
              <div className="fact-grid">
                <label><span>EXTRA COST / MONTH</span><input aria-label="Extra monthly cost in this scenario" type="number" min="0" value={decision.shock.monthlyCostEur} onChange={(event) => setScenarioEffect("monthlyCostEur", Number(event.target.value))} /></label>
                <label><span>EXTRA TRAVEL SPEND / MONTH</span><input aria-label="Extra monthly travel spending in this scenario" type="number" min="0" value={decision.shock.travelCostEur} onChange={(event) => setScenarioEffect("travelCostEur", Number(event.target.value))} /></label>
                <label><span>DAILY RHYTHM IMPACT</span><select aria-label="Daily rhythm impact" value={decision.shock.energyPenalty} onChange={(event) => setScenarioEffect("energyPenalty", Number(event.target.value))}>{![8, 18, 30].includes(decision.shock.energyPenalty) && <option value={decision.shock.energyPenalty}>Current estimate</option>}<option value="8">Light</option><option value="18">Noticeable</option><option value="30">Heavy</option></select></label>
                <label><span>CONNECTION IMPACT</span><select aria-label="Connection impact" value={decision.shock.belongingPenalty} onChange={(event) => setScenarioEffect("belongingPenalty", Number(event.target.value))}>{![5, 15, 28].includes(decision.shock.belongingPenalty) && <option value={decision.shock.belongingPenalty}>Current estimate</option>}<option value="5">Light</option><option value="15">Noticeable</option><option value="28">Heavy</option></select></label>
              </div>
              <small>These are your scenario assumptions. GPT-5.6 can interpret their consequences but cannot invent or change them.</small>
            </details>
            <div className="question-preview"><span>THE SCENARIO LEVER</span><strong>{decision.shock.label}</strong></div>
          </section>
        )}
      </div>

      {step >= 0 && (
        <footer className="journey-footer">
          <button className="back" onClick={() => scenarioEditor ? onClose() : step === 2 && groundingIndex > 0 ? setGroundingIndex(groundingIndex - 1) : moveTo(step === 2 ? 0 : -1)}>← {scenarioEditor ? "Results" : step === 0 ? "Work or place" : groundingIndex > 0 ? `Life ${String.fromCharCode(64 + groundingIndex)}` : "Names"}</button>
          {step === 0 && <button className="next" onClick={() => moveTo(2)} disabled={!canContinue}>Ground everyday life<b>↗</b></button>}
          {step === 2 && !lastGroundingStep && <button className="next" onClick={() => { setGroundingIndex(groundingIndex + 1); window.requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })); }}>Next · life {String.fromCharCode(66 + groundingIndex)}<b>↗</b></button>}
          {step === 2 && lastGroundingStep && <button className="next" onClick={finish} disabled={running || !canContinue}>{running ? "Opening…" : `Walk into ${decision.options.length} lives`}<b>↘</b></button>}
          {step === 3 && <button className="next" onClick={finish} disabled={running || !canContinue}>{running ? "Replaying…" : "Replay with this change"}<b>↘</b></button>}
        </footer>
      )}
    </aside>
  );
}
