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

const moments = [
  ["01", "The life you enter"],
  ["02", "An ordinary week"],
  ["03", "Change one condition"],
  ["04", "One year later"],
] as const;

function pathStory(decision: Decision, option: DecisionOption, future: Future, baseline: Future, moment: number, pressured: boolean) {
  if (moment === 0) {
    return decision.domain === "moving"
      ? `${option.spaceSqm}m² in ${option.location}. The move begins with ${money(option.relocation)} at risk and a home that changes the shape of every ordinary day.`
      : `${option.weeklyHours} hours of work in a normal week, ${option.commuteMinutes} minutes each way, and ${money(option.annualGross)} gross pay. This is the actual life behind the title.`;
  }
  if (moment === 1) {
    return decision.domain === "moving"
      ? `The home costs ${money(option.monthlyRent)} a month. Across the office, friends, usual places, and nature, the travel you described adds up to about ${recurringTravelHours(option, decision)} hours each month. The map underneath that total is ${option.commuteMinutes} minutes to work, ${option.friendsMinutes} to friends, ${option.dailyLifeMinutes} to usual places, and ${option.natureMinutes} to nature.`
      : `Work occupies about ${option.weeklyHours} hours before a monthly commute of roughly ${hours(option, decision.baselineDaysPerWeek)} hours. The scenario leaves ${money(future.months[0].disposableEur)} after housing and living costs in an ordinary month.`;
  }
  if (moment === 2) {
    const baselineEnd = baseline.months.at(-1)!;
    const pressuredEnd = future.months.at(-1)!;
    const bufferChange = pressuredEnd.savingsEur - baselineEnd.savingsEur;
    const rhythm = decision.domain === "moving" && /office/i.test(decision.shock.label)
      ? `Recurring travel grows from about ${recurringTravelHours(option, decision)} to ${recurringTravelHours(option, decision, decision.pressureDaysPerWeek)} hours each month.`
      : `The selected condition begins in month ${decision.shock.month} and changes the money, energy, and belonging assumptions attached to this path.`;
    const bufferStory = decision.domain === "moving" && /office/i.test(decision.shock.label)
      ? "The time change is calculated from the places and weekly frequencies you mapped."
      : `By year end, this condition changes the projected buffer by ${money(bufferChange)} compared with the expected story.`;
    return `${decision.shock.label}. ${rhythm} ${bufferStory}`;
  }
  const end = future.months.at(-1)!;
  return `The year closes with ${money(end.savingsEur)} in the scenario buffer. The path's commitment assumption arrives in month ${future.irreversibleAt.month}: ${future.irreversibleAt.reason.toLowerCase()} ${pressured ? "This ending includes the condition you chose to vary." : "This is the expected story before that condition is changed."}`;
}

export function buildStoryComparison(decision: Decision, options: DecisionOption[], futures: Future[], moment: number, pressured: boolean) {
  if (options.length < 2 || futures.length < 2) return decision.context || "Walk through the life behind each option.";
  const [a, b] = options;
  if (moment === 0) return decision.context || `This is a rehearsal of ${a.title} and ${b.title}, built from your explicit assumptions rather than a prediction.`;
  if (moment === 1 && decision.domain === "moving") {
    const spaceDelta = Math.abs(a.spaceSqm - b.spaceSqm);
    const rentDelta = Math.abs(a.monthlyRent - b.monthlyRent);
    const travelDelta = Math.abs(recurringTravelHours(a, decision) - recurringTravelHours(b, decision));
    const natureDelta = Math.abs(a.natureMinutes - b.natureMinutes);
    const friendsDelta = Math.abs(a.friendsMinutes - b.friendsMinutes);
    const larger = a.spaceSqm >= b.spaceSqm ? a : b;
    const lighterTravel = recurringTravelHours(a, decision) <= recurringTravelHours(b, decision) ? a : b;
    const closerNature = a.natureMinutes <= b.natureMinutes ? a : b;
    const closerFriends = a.friendsMinutes <= b.friendsMinutes ? a : b;
    return `${larger.title} buys ${spaceDelta}m² more and the rent gap is ${money(rentDelta)} a month. ${lighterTravel.title} returns about ${travelDelta} recurring travel hours each month. ${closerFriends.title} is ${friendsDelta} minutes closer to friends; ${closerNature.title} is ${natureDelta} minutes closer to nature. That is the life pattern, not a score.`;
  }
  if (moment === 1) {
    const payDelta = Math.abs(a.annualGross - b.annualGross);
    const timeDelta = Math.abs(a.weeklyHours - b.weeklyHours);
    const lighter = a.weeklyHours <= b.weeklyHours ? a : b;
    return `The pay gap is ${money(payDelta)} a year and the time gap is about ${timeDelta} hours every week. ${lighter.title} protects more of the week; the other path must justify what it asks from it.`;
  }
  if (moment === 2) {
    if (!pressured) return `You chose one condition to vary: ${decision.shock.label}. Change it to see which parts of each life depend on that assumption.`;
    return `This is the exact condition selected for this scenario: ${decision.shock.label}. Every other mapped factor stays fixed so the consequence remains inspectable.`;
  }
  const endA = futures[0].months.at(-1)!.savingsEur;
  const endB = futures[1].months.at(-1)!.savingsEur;
  const stronger = endA >= endB ? a : b;
  return `${stronger.title} leaves ${money(Math.abs(endA - endB))} more financial buffer in this version of the year. The remaining question is whether that buffer buys the life outcome you named, or merely compensates for what the path takes.`;
}

export function StoryWalk({ decision, baseline, pressured, activePressure }: { decision: Decision; baseline: Future[]; pressured: Future[]; activePressure: boolean }) {
  const [moment, setMoment] = useState(activePressure ? 2 : 0);
  const futures = activePressure ? pressured : baseline;
  const options = decision.options;

  const insight = useMemo(() => buildStoryComparison(decision, options, futures, moment, activePressure), [decision, options, futures, moment, activePressure]);

  return (
    <section className="story-walk" aria-label="Walk through the possible lives">
      <div className="story-moments" aria-label="Story moments">
        {moments.map(([number, label], index) => <button key={label} className={moment === index ? "active" : ""} disabled={index === 2 && !activePressure} onClick={() => setMoment(index)}><span>{number}</span><strong>{label}</strong></button>)}
      </div>
      <div className="story-insight"><span>WHAT THIS MOMENT REVEALS</span><strong>{insight}</strong></div>
      <div className="story-paths" style={{ "--future-count": futures.length } as React.CSSProperties}>
        {futures.map((future, index) => {
          const option = options.find((item) => item.id === future.optionId) ?? options[index];
          const baselineFuture = baseline.find((item) => item.optionId === future.optionId) ?? baseline[index];
          return <article key={future.optionId} style={{ "--accent": future.accent } as React.CSSProperties}><header><span>LIFE {String.fromCharCode(65 + index)}</span><h3>{future.title}</h3><small>{future.subtitle}</small></header><p>{pathStory(decision, option, future, baselineFuture, moment, activePressure)}</p></article>;
        })}
      </div>
    </section>
  );
}
