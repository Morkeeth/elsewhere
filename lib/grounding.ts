import sourcesJson from "@/data/sources.json";
import { sourceSchema, type DecisionOption } from "@/lib/schema";

const sources = sourceSchema.array().parse(sourcesJson);
const gbpPerEur = sources.find((source) => source.id === "ecb-gbp-2026-07-16")?.value ?? 0.84873;

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function nativeToEur(value: number, currency: DecisionOption["currency"]) {
  return currency === "GBP" ? value / gbpPerEur : value;
}

function progressiveTax(income: number, bands: Array<{ cap: number; rate: number }>) {
  let remaining = Math.max(0, income);
  let previousCap = 0;
  let tax = 0;
  for (const band of bands) {
    const width = band.cap === Infinity ? remaining : Math.max(0, band.cap - previousCap);
    const taxable = Math.min(remaining, width);
    tax += taxable * band.rate;
    remaining -= taxable;
    previousCap = band.cap;
    if (remaining <= 0) break;
  }
  return tax;
}

export function calculateFrancePayroll(annualGrossEur: number, employeeContributionRate: number) {
  const employeeContributions = annualGrossEur * employeeContributionRate;
  const netBeforeIncomeTax = annualGrossEur - employeeContributions;
  const netTaxable = netBeforeIncomeTax * 0.9;
  const incomeTax =
    Math.max(0, Math.min(netTaxable, 29_579) - 11_601) * 0.11 +
    Math.max(0, Math.min(netTaxable, 84_577) - 29_580) * 0.30 +
    Math.max(0, Math.min(netTaxable, 181_917) - 84_578) * 0.41 +
    Math.max(0, netTaxable - 181_918) * 0.45;
  const annualNet = netBeforeIncomeTax - incomeTax;

  return {
    annualGross: roundMoney(annualGrossEur),
    taxableIncome: roundMoney(netTaxable),
    employeeContributions: roundMoney(employeeContributions),
    incomeTax: roundMoney(incomeTax),
    annualNet: roundMoney(annualNet),
    effectiveDeductionRate: roundMoney((employeeContributions + incomeTax) / Math.max(1, annualGrossEur)),
    sourceIds: ["fr-tax-2026", "user-scenario"],
  };
}

export function calculateUkPayroll(annualGrossGbp: number) {
  const allowanceReduction = Math.max(0, annualGrossGbp - 100_000) / 2;
  const personalAllowance = Math.max(0, 12_570 - allowanceReduction);
  const taxableIncome = Math.max(0, annualGrossGbp - personalAllowance);
  const additionalThresholdTaxable = Math.max(37_700, 125_140 - personalAllowance);
  const incomeTax = progressiveTax(taxableIncome, [
    { cap: 37_700, rate: 0.20 },
    { cap: additionalThresholdTaxable, rate: 0.40 },
    { cap: Infinity, rate: 0.45 },
  ]);
  const niMain = Math.max(0, Math.min(annualGrossGbp, 50_270) - 12_570) * 0.08;
  const niUpper = Math.max(0, annualGrossGbp - 50_270) * 0.02;
  const nationalInsurance = niMain + niUpper;
  const annualNet = annualGrossGbp - incomeTax - nationalInsurance;

  return {
    annualGross: roundMoney(annualGrossGbp),
    taxableIncome: roundMoney(taxableIncome),
    employeeContributions: roundMoney(nationalInsurance),
    incomeTax: roundMoney(incomeTax),
    annualNet: roundMoney(annualNet),
    effectiveDeductionRate: roundMoney((incomeTax + nationalInsurance) / Math.max(1, annualGrossGbp)),
    sourceIds: ["uk-tax-2026", "uk-ni-2026"],
  };
}

export function calculatePayroll(option: DecisionOption) {
  if (option.taxProfile === "uk-2026") {
    const native = calculateUkPayroll(option.annualGross);
    return {
      ...native,
      annualGrossEur: roundMoney(nativeToEur(native.annualGross, option.currency)),
      annualNetEur: roundMoney(nativeToEur(native.annualNet, option.currency)),
      taxAndContributionsEur: roundMoney(nativeToEur(native.incomeTax + native.employeeContributions, option.currency)),
    };
  }
  if (option.taxProfile === "france-2026") {
    const native = calculateFrancePayroll(option.annualGross, option.employeeContributionRate);
    return {
      ...native,
      annualGrossEur: native.annualGross,
      annualNetEur: native.annualNet,
      taxAndContributionsEur: roundMoney(native.incomeTax + native.employeeContributions),
    };
  }

  const deducted = option.annualGross * (option.employeeContributionRate + option.effectiveTaxRate);
  const annualNet = option.annualGross - deducted;
  return {
    annualGross: option.annualGross,
    taxableIncome: option.annualGross,
    employeeContributions: roundMoney(option.annualGross * option.employeeContributionRate),
    incomeTax: roundMoney(option.annualGross * option.effectiveTaxRate),
    annualNet: roundMoney(annualNet),
    effectiveDeductionRate: roundMoney(deducted / Math.max(1, option.annualGross)),
    annualGrossEur: roundMoney(nativeToEur(option.annualGross, option.currency)),
    annualNetEur: roundMoney(nativeToEur(annualNet, option.currency)),
    taxAndContributionsEur: roundMoney(nativeToEur(deducted, option.currency)),
    sourceIds: ["user-scenario"],
  };
}

export function groundOption(option: DecisionOption) {
  const payroll = calculatePayroll(option);
  return {
    payroll,
    monthlyRentEur: roundMoney(nativeToEur(option.monthlyRent, option.currency)),
    monthlyLivingEur: roundMoney(nativeToEur(option.monthlyLiving, option.currency)),
    relocationEur: roundMoney(nativeToEur(option.relocation, option.currency)),
    fxSourceIds: option.currency === "GBP" ? ["ecb-gbp-2026-07-16"] : [],
  };
}
