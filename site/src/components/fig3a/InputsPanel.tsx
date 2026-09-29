import { APOLLO_11, type GimbalAngles } from '@asl/view-engine';

const docLink = (id: string, page: number) => `/documents/${id}/?page=${page}`;

interface Props {
  getText: string;
  getError: string | null;
  onGetText: (text: string) => void;
  gimbals: GimbalAngles;
  onGimbals: (g: GimbalAngles) => void;
  onReset: () => void;
  utc: Date;
  recovered: { shaftDeg: number; trunnionDeg: number };
  isBaseline: boolean;
}

export function InputsPanel(p: Props) {
  const m = APOLLO_11.refsmmat.lunarLiftoff;
  const gimbalInput = (key: keyof GimbalAngles, label: string) => (
    <label className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <input
        type="number" step={0.1} min={-360} max={360} value={p.gimbals[key]}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(v)) p.onGimbals({ ...p.gimbals, [key]: v });
        }}
        className="w-24 rounded border border-stone-400 bg-transparent px-2 py-1 text-right font-mono dark:border-stone-600"
      />
    </label>
  );
  return (
    <aside className="space-y-6 text-sm">
      <section>
        <h2 className="font-mono text-xs uppercase tracking-widest text-stone-500">Inputs (1969)</h2>
        <dl className="mt-2 space-y-3">
          <div>
            <dt className="font-medium">Time</dt>
            <dd className="font-mono">{p.utc.toISOString().replace('.000Z', 'Z')}</dd>
            <dd className="text-stone-500">Range zero {APOLLO_11.rangeZeroUtc} (Apollo 11 Mission Report)</dd>
          </div>
          <div>
            <dt className="font-medium">Platform: Lunar lift-off REFSMMAT</dt>
            <dd>
              <table className="mt-1 font-mono text-xs"><tbody>
                {m.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className="pr-3 text-right">{v.toFixed(8)}</td>)}</tr>)}
              </tbody></table>
            </dd>
            <dd><a className="underline" href={docLink('69-fm-197', 38)}>69-FM-197, Table II(e)</a></dd>
          </div>
          <div>
            <dt className="font-medium">Instrument: scanning telescope</dt>
            <dd>60° field, shaft 0°, trunnion 0°.</dd>
            <dd className="text-stone-500">A free fit of the scan recovers shaft {p.recovered.shaftDeg.toFixed(1)}°, trunnion {p.recovered.trunnionDeg.toFixed(1)}°.</dd>
          </div>
          <div>
            <dt className="font-medium">Projection</dt>
            <dd>Azimuthal equidistant, ±50°, as seen through the telescope</dd>
          </div>
          <div>
            <dt className="font-medium">Stars</dt>
            <dd>
              <a className="underline" href={docLink('69-fm-197', 309)}>RTCC catalogue, B1970</a> (148 stars), positioned
              from the Yale Bright Star Catalog; the 37 navigation stars use the guidance computer's own vectors.
            </dd>
          </div>
        </dl>
      </section>
      <section className="space-y-3 rounded border border-stone-300 p-4 dark:border-stone-700">
        <h2 className="font-mono text-xs uppercase tracking-widest text-stone-500">Try it</h2>
        <label className="block">
          GET (hhh:mm:ss)
          <input
            value={p.getText} onChange={(e) => p.onGetText(e.target.value)}
            aria-invalid={p.getError !== null} aria-describedby={p.getError ? 'get-error' : undefined}
            className="mt-1 w-full rounded border border-stone-400 bg-transparent px-2 py-1 font-mono dark:border-stone-600"
          />
        </label>
        {p.getError && <p id="get-error" role="alert" className="text-amber-700 dark:text-amber-400">{p.getError}. Showing the last valid time.</p>}
        {gimbalInput('inner', 'Inner gimbal (I)')}
        {gimbalInput('middle', 'Middle gimbal (M)')}
        {gimbalInput('outer', 'Outer gimbal (O)')}
        <button
          type="button" onClick={p.onReset} disabled={p.isBaseline}
          className="rounded border border-stone-900 px-3 py-1 font-mono text-xs uppercase tracking-wide disabled:opacity-40 dark:border-stone-100"
        >
          Reset to 1969 values
        </button>
      </section>
    </aside>
  );
}
