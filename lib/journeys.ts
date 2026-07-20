import { sampleDecision } from "@/lib/engine";
import type { Decision } from "@/lib/schema";

export type JourneyDomain = Decision["domain"];

export const journeyMeta: Record<JourneyDomain, { icon: string; label: string; line: string; prompt: string; experimental?: boolean }> = {
  career: { icon: "↗", label: "Career", line: "Choose the work, not just the title", prompt: "What should my next career chapter be?" },
  moving: { icon: "⌂", label: "Moving", line: "Try on the city before the postcode", prompt: "Where should I build my next life?" },
  relationships: { icon: "♡", label: "Relationships", line: "See the futures behind the feeling", prompt: "What shape should this relationship take?", experimental: true },
  education: { icon: "✦", label: "Education", line: "Compare the person each path creates", prompt: "How should I invest in my next skill chapter?", experimental: true },
  life: { icon: "○", label: "Something else", line: "For the decision living in your Notes app", prompt: "What decision keeps looping in my head?", experimental: true },
};

export const primaryJourneyDomains: JourneyDomain[] = ["career", "moving", "relationships", "education", "life"];

export type ShockPreset = Decision["shock"];

export const shockPresets: Record<JourneyDomain, ShockPreset[]> = {
  career: [
    { label: "The manager I joined for leaves", month: 4, monthlyCostEur: 0, travelCostEur: 0, energyPenalty: 17, belongingPenalty: 9 },
    { label: "The market cools and hiring freezes", month: 5, monthlyCostEur: 350, travelCostEur: 0, energyPenalty: 12, belongingPenalty: 4 },
    { label: "My family needs more of my time", month: 6, monthlyCostEur: 480, travelCostEur: 320, energyPenalty: 18, belongingPenalty: 10 },
  ],
  moving: [
    { label: "Remote work rules change", month: 7, monthlyCostEur: 250, travelCostEur: 420, energyPenalty: 11, belongingPenalty: 8 },
    { label: "Someone close to me needs weekly help", month: 5, monthlyCostEur: 460, travelCostEur: 340, energyPenalty: 18, belongingPenalty: 12 },
    { label: "Housing costs jump unexpectedly", month: 4, monthlyCostEur: 420, travelCostEur: 0, energyPenalty: 9, belongingPenalty: 3 },
  ],
  relationships: [
    { label: "One of us gets an opportunity elsewhere", month: 5, monthlyCostEur: 0, travelCostEur: 180, energyPenalty: 14, belongingPenalty: 18 },
    { label: "Trust is tested by a hard conversation", month: 4, monthlyCostEur: 0, travelCostEur: 0, energyPenalty: 16, belongingPenalty: 22 },
    { label: "Our timelines stop matching", month: 6, monthlyCostEur: 0, travelCostEur: 120, energyPenalty: 12, belongingPenalty: 20 },
  ],
  education: [
    { label: "The job market cools before graduation", month: 8, monthlyCostEur: 350, travelCostEur: 0, energyPenalty: 10, belongingPenalty: 4 },
    { label: "The course takes twice the energy", month: 4, monthlyCostEur: 0, travelCostEur: 0, energyPenalty: 24, belongingPenalty: 7 },
    { label: "A paid opportunity arrives early", month: 3, monthlyCostEur: 0, travelCostEur: 80, energyPenalty: 0, belongingPenalty: 5 },
  ],
  life: [
    { label: "The thing I am assuming does not happen", month: 6, monthlyCostEur: 320, travelCostEur: 160, energyPenalty: 14, belongingPenalty: 8 },
    { label: "My available time is cut in half", month: 4, monthlyCostEur: 0, travelCostEur: 0, energyPenalty: 26, belongingPenalty: 10 },
    { label: "Someone important needs my help", month: 5, monthlyCostEur: 420, travelCostEur: 280, energyPenalty: 18, belongingPenalty: 12 },
  ],
};

const option = (base: Decision["options"][number], patch: Partial<Decision["options"][number]>) => ({ ...base, ...patch });

export function makeJourney(domain: JourneyDomain): Decision {
  const base = structuredClone(sampleDecision);
  base.domain = domain;

  if (domain === "career") return base;
  if (domain === "moving") return {
    ...base,
    question: "Should I stay in Paris, move to London, try Lisbon, or split my year?",
    priorities: { security: 22, energy: 24, belonging: 30, optionality: 24 },
    shock: { ...base.shock, label: "Remote work rules change halfway through the year", month: 7, monthlyCostEur: 250, travelCostEur: 420 },
    options: [
      option(base.options[0], { title: "Stay", subtitle: "Deepen the roots", location: "Paris", flexibility: 62, belonging: 90 }),
      option(base.options[1], { title: "Move", subtitle: "Build a bigger orbit", location: "London" }),
      option(base.options[2], { title: "Reset", subtitle: "Choose lightness", location: "Lisbon", country: "OTHER", taxProfile: "effective", annualGross: 88_000, monthlyRent: 1_450, monthlyLiving: 1_100, belonging: 55, flexibility: 84 }),
      option(base.options[3], { title: "Split", subtitle: "Keep two doors open", location: "Two cities", annualGross: 78_000, monthlyRent: 1_850, flexibility: 94, risk: 38 }),
    ],
  };
  if (domain === "relationships") {
    const neutral = { annualGross: 60_000, monthlyRent: 1_300, monthlyLiving: 1_250, relocation: 0, taxProfile: "effective" as const, effectiveTaxRate: 0.25, employeeContributionRate: 0, country: "OTHER" as const, currency: "EUR" as const };
    return {
      ...base,
      question: "Do we commit, reshape the relationship, pause, or choose separate lives?",
      priorities: { security: 8, energy: 25, belonging: 42, optionality: 25 },
      shock: { ...base.shock, label: "One of us gets an opportunity in another city", month: 5, monthlyCostEur: 0, travelCostEur: 180, energyPenalty: 14, belongingPenalty: 18 },
      options: [
        option(base.options[0], { ...neutral, title: "Choose us", subtitle: "Commit to the shared life", location: "Together", flexibility: 38, belonging: 91, growth: 66, risk: 25, commitmentMonth: 3 }),
        option(base.options[1], { ...neutral, title: "Reshape it", subtitle: "More space, same connection", location: "New terms", flexibility: 78, belonging: 73, growth: 75, risk: 45, commitmentMonth: 7 }),
        option(base.options[2], { ...neutral, title: "Pause", subtitle: "Let distance reveal the signal", location: "Apart for now", flexibility: 88, belonging: 48, growth: 70, risk: 57, commitmentMonth: 5 }),
        option(base.options[3], { ...neutral, title: "Choose me", subtitle: "Build a separate future", location: "A new chapter", flexibility: 82, belonging: 40, growth: 88, risk: 62, commitmentMonth: 2 }),
      ],
    };
  }
  if (domain === "education") return {
    ...base,
    question: "Should I learn on the job, take a degree, join a cohort, or apprentice?",
    priorities: { security: 20, energy: 20, belonging: 18, optionality: 42 },
    shock: { ...base.shock, label: "The job market cools before graduation", month: 8, monthlyCostEur: 350, travelCostEur: 0 },
    options: [
      option(base.options[0], { title: "Learn at work", subtitle: "Earn while compounding", location: "Current role" }),
      option(base.options[1], { title: "Take the degree", subtitle: "Buy depth and signal", location: "Campus", annualGross: 10_000, monthlyRent: 1_050, risk: 50 }),
      option(base.options[2], { title: "Join a cohort", subtitle: "Compress the learning curve", location: "Online + peers", annualGross: 45_000, flexibility: 82 }),
      option(base.options[3], { title: "Apprentice", subtitle: "Learn beside the craft", location: "Studio", annualGross: 32_000, belonging: 74 }),
    ],
  };
  return {
    ...base,
    question: journeyMeta.life.prompt,
    priorities: { security: 25, energy: 25, belonging: 25, optionality: 25 },
    shock: { ...base.shock, label: "The thing I am assuming does not happen", month: 6 },
  };
}
