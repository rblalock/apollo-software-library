import type { ResidualRow } from '../../lib/figures';

interface Props { rows: ResidualRow[]; rmsDeg: number; maxDeg: number; tolerance: { rmsDeg: number; maxDeg: number }; scanLabel: string; verdict: string }

const f = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : 'n/a');

export function ResidualsTable({ rows, rmsDeg, maxDeg, tolerance, scanLabel, verdict }: Props) {
  return (
    <section aria-labelledby="residuals-heading">
      <h2 id="residuals-heading" className="font-mono text-xs uppercase tracking-widest text-muted">
        Residuals: recreation vs. the {scanLabel} scan (at the figure's own inputs)
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-stone-300 text-left dark:border-stone-700">
              <th className="py-1 pr-4 font-medium">Body</th>
              <th className="pr-4 font-medium">Scan x, y (°)</th>
              <th className="pr-4 font-medium">Recreation x, y (°)</th>
              <th className="pr-4 font-medium">Δ (°)</th>
              <th className="font-medium">Within {tolerance.maxDeg}°</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-stone-200 dark:border-stone-800">
                <td className="py-1 pr-4">{r.id}{r.actually && <span className="text-amber-700 dark:text-amber-400"> (printed label; actually {r.actually})</span>}</td>
                <td className="pr-4 font-mono">{f(r.scanX)}, {f(r.scanY)}</td>
                <td className="pr-4 font-mono">{f(r.modelX)}, {f(r.modelY)}</td>
                <td className="pr-4 font-mono">{f(r.dist)}</td>
                <td>{r.pass ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">
        RMS <span className="font-mono">{rmsDeg.toFixed(2)}°</span>, max <span className="font-mono">{maxDeg.toFixed(2)}°</span>. {verdict}
      </p>
    </section>
  );
}
