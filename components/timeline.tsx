import type { Decision, Future } from "@/lib/schema";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en", { notation: "compact", style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

function pathFor(future: Future) {
  const values = future.months.map((month) => month.optionality);
  return values.map((value, index) => {
    const x = 10 + index * (280 / 11);
    const y = 87 - value * 0.68;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function Timeline({ future, index, active, shockMonth, domain }: { future: Future; index: number; active: boolean; shockMonth: number; domain: Decision["domain"] }) {
  const end = future.months.at(-1)!;
  const irreversibleX = 10 + (future.irreversibleAt.month - 1) * (280 / 11);
  const shockX = 10 + (shockMonth - 1) * (280 / 11);

  return (
    <article className={`future-card ${active ? "is-active" : ""}`} style={{ "--accent": future.accent } as React.CSSProperties}>
      <div className="future-head">
        <div>
          <span className="future-index">{String(index + 1).padStart(2, "0")}</span>
          <h3>{future.title}</h3>
          <p>{future.subtitle}</p>
        </div>
        <div className="place">{future.location}</div>
      </div>

      <svg className="timeline" viewBox="0 0 300 104" role="img" aria-label={`${future.title} optionality over twelve months`}>
        <defs>
          <linearGradient id={`fade-${future.optionId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={future.accent} stopOpacity="0.2" />
            <stop offset="1" stopColor={future.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[24, 52, 80].map((y) => <line key={y} x1="8" x2="292" y1={y} y2={y} className="grid-line" />)}
        {active && <line x1={shockX} x2={shockX} y1="9" y2="94" className="shock-line" />}
        <path d={`${pathFor(future)} L290,96 L10,96 Z`} fill={`url(#fade-${future.optionId})`} />
        <path d={pathFor(future)} className="future-path" />
        <line x1={irreversibleX} x2={irreversibleX} y1="64" y2="96" className="commit-line" />
        <circle cx={irreversibleX} cy="64" r="3.5" className="commit-dot" />
      </svg>

      <div className="months" aria-hidden="true">
        {future.months.map((month, index) => <span key={month.month}>{index % 3 === 0 ? month.label : "·"}</span>)}
      </div>

      <div className="metric-row">
        <div><span>{domain === "relationships" ? "freedom" : "year end"}</span><strong>{domain === "relationships" ? Math.round(future.metrics.optionality) : formatMoney(end.savingsEur)}</strong></div>
        <div><span>energy</span><strong>{Math.round(future.metrics.averageEnergy)}</strong></div>
        <div><span>belonging</span><strong>{Math.round(future.metrics.averageBelonging)}</strong></div>
      </div>

      {domain !== "relationships" && <div className="ledger-strip">
          <span>net / yr <b>{formatMoney(future.metrics.annualNetIncomeEur)}</b></span>
          <span>fixed / mo <b>{formatMoney(future.metrics.monthlyFixedCostEur)}</b></span>
          <span>optionality <b>{Math.round(future.metrics.optionality)}</b></span>
        </div>}

      <div className="irreversible">
        <span>Commitment assumption</span>
        <strong>{future.irreversibleAt.label}</strong>
      </div>
    </article>
  );
}
