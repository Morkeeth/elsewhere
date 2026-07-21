import type { BreakpointAnalysis, Future } from "@/lib/schema";

type Props = {
  analysis: BreakpointAnalysis;
  futures: Future[];
};

function formatValue(value: number, unit: string) {
  if (unit.startsWith("EUR")) return `€${Math.round(value).toLocaleString()}`;
  return `${Math.round(value)} ${unit}`;
}

function leadAt(point: BreakpointAnalysis["points"][number]) {
  return [...point.fits].sort((left, right) => right.fit - left.fit)[0]?.optionId;
}

export function ReversalMap({ analysis, futures }: Props) {
  const futuresById = new Map(futures.map((future) => [future.optionId, future]));
  const ordered = [...analysis.points].sort((left, right) => left.value - right.value);
  const crossings = ordered.flatMap((point, index) => {
    if (index === 0 || leadAt(point) === leadAt(ordered[index - 1])) return [];
    return [{ before: ordered[index - 1], after: point }];
  });
  const crossing = crossings.find(({ before, after }) => analysis.referenceValue >= before.value && analysis.referenceValue <= after.value) ?? crossings[0];
  const beforeFuture = crossing ? futuresById.get(leadAt(crossing.before)) : undefined;
  const afterFuture = crossing ? futuresById.get(leadAt(crossing.after)) : undefined;
  const hinge = crossing && beforeFuture && afterFuture
    ? `Between ${formatValue(crossing.before.value, analysis.assumption.unit)} and ${formatValue(crossing.after.value, analysis.assumption.unit)}, the stronger personal fit changes from ${beforeFuture.title} to ${afterFuture.title}.`
    : `No path takes the lead across this tested range. The useful signal is which life becomes fragile first.`;
  return (
    <section className="reversal-map" aria-label="Assumption breakpoint map">
      <div className="reversal-map-head">
        <div><span className="section-number">02 / THE DECISION HINGE</span><h2>What changes the decision?</h2></div>
        <p><b>{analysis.assumption.label}</b><br />{analysis.assumption.affects}</p>
      </div>
      <div className="hinge-callout">
        <span>THE REVERSAL</span>
        <strong>{hinge}</strong>
        <p>This calculation follows the priorities entered for this decision. It exposes the assumption to verify; it does not choose a home.</p>
      </div>
      <div className="assumption-receipt">
        <span>{analysis.assumption.provenance.replace("-", " ")}</span>
        <strong>Current scenario value: {formatValue(analysis.referenceValue, analysis.assumption.unit)}</strong>
        <small>Personal fit is your weighted calculation. It is not an objective ranking. Fragile begins after a deterministic 3-point fit decline.</small>
      </div>
      <details className="hinge-details">
        <summary>Inspect the full assumption sweep <b>+</b></summary>
        <div className="map-scroll" tabIndex={0} aria-label="Swipe through assumption range">
          <div className="map-grid" style={{ "--points": analysis.points.length } as React.CSSProperties}>
            <div className="map-label map-axis">{analysis.assumption.adverseDirection === "higher" ? "LOWER" : "HIGHER"} <span>← MORE FORGIVING</span><span>MORE DEMANDING →</span> {analysis.assumption.adverseDirection === "higher" ? "HIGHER" : "LOWER"}</div>
            {analysis.points.map((point) => <div className={`map-tick ${point.value === analysis.referenceValue ? "current" : ""}`} key={point.value}>{formatValue(point.value, analysis.assumption.unit)}</div>)}
            {analysis.futures.map((result) => {
              const future = futuresById.get(result.optionId);
              return <div className="map-row" key={result.optionId}>
                <div className="map-label"><span style={{ color: future?.accent }}>{future?.title}</span><small>{result.breakpointValue === null ? "holds across this range" : `fragile at ${formatValue(result.breakpointValue, analysis.assumption.unit)}`}</small></div>
                {analysis.points.map((point) => {
                  const state = point.fits.find((fit) => fit.optionId === result.optionId)!;
                  const isBreakpoint = point.value === result.breakpointValue;
                  const isCurrent = point.value === analysis.referenceValue;
                  return <div className={`map-cell ${state.state} ${isCurrent ? "current" : ""} ${isBreakpoint ? "breakpoint" : ""}`} key={point.value} aria-label={`${future?.title}: ${state.state}, personal fit ${state.fit}`}><span>{isBreakpoint ? "●" : ""}</span></div>;
                })}
              </div>;
            })}
          </div>
        </div>
        <p className="map-caption">Deterministic code recomputes every future at every value. AI interprets the trade-offs later; it cannot move this crossing.</p>
      </details>
    </section>
  );
}
