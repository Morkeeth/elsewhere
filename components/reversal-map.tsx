import type { BreakpointAnalysis, Future } from "@/lib/schema";

type Props = {
  analysis: BreakpointAnalysis;
  futures: Future[];
};

function formatValue(value: number, unit: string) {
  if (unit.startsWith("EUR")) return `€${Math.round(value).toLocaleString()}`;
  return `${Math.round(value)} ${unit}`;
}

export function ReversalMap({ analysis, futures }: Props) {
  const futuresById = new Map(futures.map((future) => [future.optionId, future]));
  return (
    <section className="reversal-map" aria-label="Assumption breakpoint map">
      <div className="reversal-map-head">
        <div><span className="section-number">04 / ASSUMPTION BREAKPOINT</span><h2>What would have to become true for a future to stop holding up?</h2></div>
        <p><b>{analysis.assumption.label}</b><br />{analysis.assumption.affects}</p>
      </div>
      <div className="assumption-receipt">
        <span>{analysis.assumption.provenance.replace("-", " ")}</span>
        <strong>Current assumption: {formatValue(analysis.referenceValue, analysis.assumption.unit)}</strong>
        <small>Personal fit is your weighted calculation—not an objective ranking. Fragile begins after a deterministic 3-point fit decline.</small>
      </div>
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
      <p className="map-caption">AI identifies what is contested. Deterministic code recomputes every future at each assumption value and finds where personal fit becomes fragile.</p>
    </section>
  );
}
