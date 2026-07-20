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

export type StoryId = "apartments" | "internal-roles" | "relationship-next-move";

export const storyMeta: Record<StoryId, { icon: string; label: string; hook: string }> = {
  apartments: { icon: "⌂", label: "Two apartments", hook: "More space or more city?" },
  "internal-roles": { icon: "↗", label: "Two roles", hook: "Same company. Different life." },
  "relationship-next-move": { icon: "♡", label: "Relationship next move", hook: "Choose an action, not a verdict." },
};

export const storyIds = Object.keys(storyMeta) as StoryId[];

export function makeStory(story: StoryId): Decision {
  const base = structuredClone(sampleDecision);

  if (story === "apartments") return {
    ...base,
    domain: "moving",
    question: "Which apartment gives me the better life for the next year: Canal or Montreuil?",
    context: "I expect to stay for one year. Canal keeps me close to the city; Montreuil gives me more space, but the commute may matter if office days increase.",
    priorities: { security: 28, energy: 25, belonging: 24, optionality: 23 },
    shock: { label: "Three office days become five", month: 4, monthlyCostEur: 0, travelCostEur: 280, energyPenalty: 20, belongingPenalty: 5 },
    options: [
      option(base.options[0], { id: "canal-apartment", title: "Canal", subtitle: "Smaller home, immediate city", location: "Canal Saint-Martin", annualGross: 78_000, monthlyRent: 2_100, monthlyLiving: 1_250, relocation: 4_200, flexibility: 48, belonging: 84, growth: 70, risk: 54, shockTravelMultiplier: 0.15, shockEnergySensitivity: 0.45, commitmentMonth: 2, accent: "#C9FF64", sourceIds: ["user-scenario", "fr-tax-2026"] }),
      option(base.options[2], { id: "montreuil-apartment", title: "Montreuil", subtitle: "More light, longer edges", location: "Montreuil", annualGross: 78_000, monthlyRent: 1_450, monthlyLiving: 1_180, relocation: 2_800, flexibility: 68, belonging: 65, growth: 72, risk: 34, shockTravelMultiplier: 1.4, shockEnergySensitivity: 1.55, commitmentMonth: 3, accent: "#7C8CFF", sourceIds: ["user-scenario", "fr-tax-2026"] }),
    ],
  };

  if (story === "internal-roles") return {
    ...base,
    domain: "career",
    question: "Should I stay a senior specialist or become a team lead inside the same company?",
    context: "Both roles are available inside the same company. I care about the daily work, future options, and how much energy each role leaves outside work.",
    priorities: { security: 20, energy: 28, belonging: 18, optionality: 34 },
    shock: { label: "The manager who designed both roles leaves", month: 4, monthlyCostEur: 0, travelCostEur: 0, energyPenalty: 17, belongingPenalty: 9 },
    options: [
      option(base.options[0], { id: "specialist-role", title: "Specialist", subtitle: "Depth, craft, protected focus", location: "Same company", annualGross: 85_000, flexibility: 80, belonging: 68, growth: 82, risk: 32, shockTravelMultiplier: 0.1, shockEnergySensitivity: 0.65, commitmentMonth: 7, accent: "#C9FF64" }),
      option(base.options[3], { id: "team-lead-role", title: "Team lead", subtitle: "People, scope, visible stakes", location: "Same company", annualGross: 92_000, monthlyRent: 1_307, monthlyLiving: 1_250, relocation: 0, flexibility: 44, belonging: 82, growth: 91, risk: 61, shockTravelMultiplier: 0.1, shockEnergySensitivity: 1.35, commitmentMonth: 2, accent: "#FFD166" }),
    ],
  };

  const neutral = { annualGross: 60_000, monthlyRent: 1_300, monthlyLiving: 1_250, relocation: 0, taxProfile: "effective" as const, effectiveTaxRate: 0.25, employeeContributionRate: 0, country: "OTHER" as const, currency: "EUR" as const };
  return {
    ...base,
    domain: "relationships",
    question: "Should I define this relationship now or keep dating without promises for three more months?",
    context: "The connection matters, but our direction is still unclear. I want to choose an honest next action without pretending I can predict another person.",
    priorities: { security: 8, energy: 25, belonging: 42, optionality: 25 },
    shock: { label: "Our timelines stop matching", month: 6, monthlyCostEur: 0, travelCostEur: 120, energyPenalty: 12, belongingPenalty: 20 },
    options: [
      option(base.options[0], { ...neutral, id: "define-relationship", title: "Define it", subtitle: "Ask for a shared direction", location: "A clear conversation", flexibility: 42, belonging: 88, growth: 70, risk: 38, commitmentMonth: 3, accent: "#C9FF64" }),
      option(base.options[2], { ...neutral, id: "keep-dating", title: "Keep it open", subtitle: "Let more reality arrive", location: "Three more months", flexibility: 88, belonging: 58, growth: 76, risk: 54, commitmentMonth: 7, accent: "#7C8CFF" }),
    ],
  };
}

export function makeTwoChoiceJourney(domain: JourneyDomain): Decision {
  if (domain === "career") return makeStory("internal-roles");
  if (domain === "moving") return makeStory("apartments");
  if (domain === "relationships") return makeStory("relationship-next-move");

  const journey = makeJourney(domain);
  if (domain === "education") {
    return { ...journey, question: "Should I learn on the job or take the degree?", options: journey.options.slice(0, 2) };
  }
  return {
    ...journey,
    question: "Which of these two futures am I actually willing to live?",
    options: [
      option(journey.options[0], { id: "choice-a", title: "First path", subtitle: "Name what pulls you here", location: "Where it leads" }),
      option(journey.options[1], { id: "choice-b", title: "Second path", subtitle: "Name what pulls you here", location: "Where it leads" }),
    ],
  };
}

export function makeJourney(domain: JourneyDomain): Decision {
  const base = structuredClone(sampleDecision);
  base.domain = domain;

  if (domain === "career") return base;
  if (domain === "moving") return {
    ...base,
    question: "Should I stay in Paris, move to London, try Lisbon, or split my year?",
    context: "I am comparing the daily life, cost, support network, and flexibility each place would create over the next year.",
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
      context: "I want to compare the actions available to me without scoring or predicting the other person.",
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
    context: "I care about the person and opportunities each learning path creates, as well as its cost and effect on daily energy.",
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
    context: "",
    priorities: { security: 25, energy: 25, belonging: 25, optionality: 25 },
    shock: { ...base.shock, label: "The thing I am assuming does not happen", month: 6 },
  };
}
