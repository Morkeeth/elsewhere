"use client";

import { useMemo, useState } from "react";
import type { Decision, DecisionOption, Future } from "@/lib/schema";

const money = (value: number) => new Intl.NumberFormat("en", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
const hours = (option: DecisionOption, days: number) => Math.round(option.commuteMinutes * 2 * days * 4.33 / 60);
const recurringTravelHours = (option: DecisionOption, decision: Decision, officeDays = decision.baselineDaysPerWeek) => Math.round((
  option.commuteMinutes * officeDays +
  option.friendsMinutes * decision.socialTripsPerWeek +
  option.dailyLifeMinutes * decision.dailyLifeTripsPerWeek +
  option.natureMinutes * decision.natureTripsPerWeek
) * 2 * 4.33 / 60);

function modeLabel(decision: Decision, moment: number) {
  const moving = decision.domain === "moving";
  return [
    moving ? "Ordinary Tuesday" : "The working week",
    moving ? "Dinner-party test" : "The people test",
    "The pressure test",
    "One year later",
  ][moment];
}

function sceneStamp(decision: Decision, moment: number) {
  const moving = decision.domain === "moving";
  return [
    moving ? "TUESDAY · 18:40" : "FRIDAY · 18:20",
    moving ? "SATURDAY · 19:30" : "AFTER A DIFFICULT MEETING",
    `MONTH ${decision.shock.month} · ONE THING CHANGES`,
    "TWELVE MONTHS FROM NOW",
  ][moment];
}

function pathStory(decision: Decision, option: DecisionOption, future: Future, baseline: Future, moment: number) {
  if (moment === 0) {
    if (decision.domain === "moving") {
      const arrival = option.commuteMinutes <= 20 ? "The city is still close enough to improvise." : "The front door brings relief, but returning to the city now asks for a decision.";
      return `You arrive after ${option.commuteMinutes} minutes and step into ${option.spaceSqm}m² in ${option.location}. ${arrival}`;
    }
    const afterWork = option.weeklyHours <= 42 ? "There is still an evening left when the laptop closes." : "The role follows you into an evening that has already become smaller.";
    return `The week has taken roughly ${option.weeklyHours} hours, plus ${hours(option, decision.baselineDaysPerWeek)} commute hours this month. ${afterWork}`;
  }
  if (moment === 1) {
    if (decision.domain === "moving") {
      const table = option.spaceSqm >= 50 ? "A long table fits without moving the sofa." : "Dinner works, but the room has to transform first.";
      const pull = option.friendsMinutes <= 15 ? "A last-minute yes still feels easy." : "Your friends need the plan early enough to make the trip.";
      return `${table} Friends are about ${option.friendsMinutes} minutes away each way. ${pull} This is a guess to react to, not a prediction of who shows up.`;
    }
    const team = option.belonging >= 70 ? "This version assumes there is someone on the team who stays to debrief." : "This version assumes the tension comes home because trust on the team is still thin.";
    return `${team} The culture is a scenario input—one shadow day or honest conversation could overturn it.`;
  }
  if (moment === 2) {
    const baselineEnd = baseline.months.at(-1)!;
    const pressuredEnd = future.months.at(-1)!;
    const bufferChange = pressuredEnd.savingsEur - baselineEnd.savingsEur;
    if (decision.domain === "moving" && /remote work|office/i.test(decision.shock.label)) {
      return `${decision.shock.label}. Monthly travel grows from about ${recurringTravelHours(option, decision)} to ${recurringTravelHours(option, decision, decision.pressureDaysPerWeek)} hours. Imagine doing that on a wet Tuesday when nobody is impressed by the apartment anymore.`;
    }
    return `${decision.shock.label}. The change arrives in month ${decision.shock.month}; by year end it moves this path’s projected buffer by ${money(bufferChange)}. Everything else stays fixed.`;
  }
  const end = future.months.at(-1)!;
  if (decision.domain === "moving") {
    return `The ${option.spaceSqm}m² no longer feels new; it is simply home. The ${option.commuteMinutes}-minute journey is simply Tuesday. You close the year with ${money(end.savingsEur)} in the scenario buffer. Which part still improves an ordinary day?`;
  }
  return `The title no longer feels new; this is simply your working week. It still takes about ${option.weeklyHours} hours before the commute, and the scenario closes with ${money(end.savingsEur)} in the buffer. Which part would you willingly repeat?`;
}

export function buildStoryComparison(decision: Decision, options: DecisionOption[], futures: Future[], moment: number, pressured: boolean) {
  if (options.length < 2 || futures.length < 2) return decision.context || "Walk through the life behind each option.";
  const [a, b] = options;
  if (moment === 0 && decision.domain === "moving") {
    const spaceDelta = Math.abs(a.spaceSqm - b.spaceSqm);
    const travelDelta = Math.abs(recurringTravelHours(a, decision) - recurringTravelHours(b, decision));
    const larger = a.spaceSqm >= b.spaceSqm ? a : b;
    const lighterTravel = recurringTravelHours(a, decision) <= recurringTravelHours(b, decision) ? a : b;
    return `${larger.title} gives you ${spaceDelta}m² more. ${lighterTravel.title} gives back about ${travelDelta} travel hours every month. Which kind of relief do you actually feel?`;
  }
  if (moment === 0) {
    const payDelta = Math.abs(a.annualGross - b.annualGross);
    const weeklyDelta = Math.abs(a.weeklyHours - b.weeklyHours);
    return `The pay gap is ${money(payDelta)} a year. The time gap is ${weeklyDelta} hours every week—about ${weeklyDelta * 52} hours of your year before culture enters the picture.`;
  }
  if (moment === 1 && decision.domain === "moving") {
    const spaceDelta = Math.abs(a.spaceSqm - b.spaceSqm);
    const friendsDelta = Math.abs(a.friendsMinutes - b.friendsMinutes);
    const larger = a.spaceSqm >= b.spaceSqm ? a : b;
    return `${larger.title} has ${spaceDelta}m² more room; friends travel ${friendsDelta} minutes farther each way. Space for dinner and people showing up are two different assumptions.`;
  }
  if (moment === 1) {
    return `The salary is known. Team chemistry is still a guess. React to these scenes, then test the culture before letting either story harden into fact.`;
  }
  if (moment === 2) {
    if (!pressured) return `Choose one plausible change and Elsewhere will replay both lives while keeping everything else fixed.`;
    return `${decision.shock.label}. This is the one changed condition; the rest of the model stays fixed so you can see what actually depends on it.`;
  }
  const endA = futures[0].months.at(-1)!.savingsEur;
  const endB = futures[1].months.at(-1)!.savingsEur;
  const stronger = endA >= endB ? a : b;
  return `${stronger.title} leaves ${money(Math.abs(endA - endB))} more buffer in this version of the year. Would that money buy the life you want—or compensate for the life it takes?`;
}

export function StoryWalk({ decision, baseline, pressured, activePressure }: { decision: Decision; baseline: Future[]; pressured: Future[]; activePressure: boolean }) {
  const availableMoments = activePressure ? [0, 1, 2, 3] : [0, 1, 3];
  const [moment, setMoment] = useState(activePressure ? 2 : 0);
  const futures = activePressure ? pressured : baseline;
  const options = decision.options;
  const position = Math.max(0, availableMoments.indexOf(moment));
  const insight = useMemo(() => buildStoryComparison(decision, options, futures, moment, activePressure), [decision, options, futures, moment, activePressure]);

  function move(direction: -1 | 1) {
    const next = Math.min(availableMoments.length - 1, Math.max(0, position + direction));
    setMoment(availableMoments[next]);
  }

  return (
    <section className="story-walk" aria-label="Walk through the possible lives">
      <div className="story-player-head">
        <button onClick={() => move(-1)} disabled={position === 0} aria-label="Previous scene">←</button>
        <div><span>SCENE {position + 1} OF {availableMoments.length}</span><strong>{modeLabel(decision, moment)}</strong><i>{availableMoments.map((item) => <b key={item} className={item === moment ? "active" : ""} />)}</i></div>
        <button onClick={() => move(1)} disabled={position === availableMoments.length - 1} aria-label="Next scene">→</button>
      </div>
      <div className="story-insight"><span>WHAT THIS SCENE REVEALS</span><strong>{insight}</strong></div>
      <div className="story-paths" style={{ "--future-count": futures.length } as React.CSSProperties}>
        {futures.map((future, index) => {
          const option = options.find((item) => item.id === future.optionId) ?? options[index];
          const baselineFuture = baseline.find((item) => item.optionId === future.optionId) ?? baseline[index];
          return <article key={future.optionId} style={{ "--accent": future.accent } as React.CSSProperties}><header><span>LIFE {String.fromCharCode(65 + index)}</span><h3>{future.title}</h3><small>{future.subtitle}</small></header><div className="scene-copy"><span>{sceneStamp(decision, moment)}</span><p>{pathStory(decision, option, future, baselineFuture, moment)}</p></div></article>;
        })}
      </div>
    </section>
  );
}
