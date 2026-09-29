import { APOLLO_11, type GimbalAngles } from '@asl/view-engine';
import type { FigureConfig } from '../../lib/figures';

const docLink = (id: string, page: number) => `/documents/${id}/?page=${page}`;
type GimbalKey = keyof GimbalAngles;

interface Props {
  figure: FigureConfig;
  utc: Date;
  recovered: { shaftDeg: number; trunnionDeg: number } | null;
  tryIt: {
    getText: string;
    getError: string | null;
    onGetText: (text: string) => void;
    gimbalDrafts: Record<GimbalKey, string>;
    gimbalErrors: Partial<Record<GimbalKey, string>>;
    onGimbalDraft: (key: GimbalKey, text: string) => void;
    onReset: () => void;
    atBaseline: boolean;
  } | null;
}

export function InputsPanel({ figure, utc, recovered, tryIt }: Props) {
  const inst = figure.spec.instrument;
  const matrix = inst.kind === 'sct' ? figure.spec.refsmmat : inst.lmBodyFromRef;
  const gimbalInput = (key: GimbalKey, label: string) => {
    if (!tryIt) return null;
    const error = tryIt.gimbalErrors[key];
    const errorId = `gimbal-${key}-error`;
    return (
      <div>
        <label className="flex items-center justify-between gap-3">
          <span>{label}</span>
          <input
            type="text" inputMode="decimal" value={tryIt.gimbalDrafts[key]}
            onChange={(e) => tryIt.onGimbalDraft(key, e.target.value)}
            aria-invalid={error !== undefined} aria-describedby={error ? errorId : undefined}
            className="w-24 rounded border border-stone-400 bg-transparent px-2 py-1 text-right font-mono dark:border-stone-600"
          />
        </label>
        {error && <p id={errorId} role="alert" className="mt-1 text-amber-700 dark:text-amber-400">{error}. Showing the last valid angle.</p>}
      </div>
    );
  };
  return (
    <aside className="space-y-6 text-sm">
      <section>
        <h2 className="font-mono text-xs uppercase tracking-widest text-stone-500">Inputs</h2>
        <dl className="mt-2 space-y-3">
          <div>
            <dt className="font-medium">Time shown</dt>
            <dd className="font-mono">{utc.toISOString().replace('.000Z', 'Z')}</dd>
            <dd className="text-stone-500">Range zero {APOLLO_11.rangeZeroUtc}</dd>
          </div>
          <div>
            <dt className="font-medium">{inst.kind === 'sct' ? 'Platform: Lunar lift-off REFSMMAT' : 'LM attitude on the surface (reference → LM body)'}</dt>
            <dd>
              <table className="mt-1 font-mono text-xs"><tbody>
                {matrix.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className="pr-3 text-right">{v.toFixed(8)}</td>)}</tr>)}
              </tbody></table>
            </dd>
            <dd className="text-stone-500">{figure.attitudeNote}</dd>
            <dd><a className="underline" href={docLink('69-fm-197', 38)}>69-FM-197, Table II (REFSMMATs)</a></dd>
          </div>
          <div>
            <dt className="font-medium">Instrument</dt>
            {inst.kind === 'sct' ? (
              <>
                <dd>CSM scanning telescope: 60° field, shaft 0°, trunnion 0°.</dd>
                {recovered && <dd className="text-stone-500">A free fit of the scan recovers shaft {recovered.shaftDeg.toFixed(1)}°, trunnion {recovered.trunnionDeg.toFixed(1)}°.</dd>}
              </>
            ) : (
              <dd>LM alignment optical telescope, detent at {inst.detentDeg}° azimuth, 45° from the LM +X axis; 60° field. The image turns with the telescope head (−{inst.detentDeg}°), as the drawn reticle shows.</dd>
            )}
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
      {tryIt && (
        <section className="space-y-3 rounded border border-stone-300 p-4 dark:border-stone-700">
          <h2 className="font-mono text-xs uppercase tracking-widest text-stone-500">Try it</h2>
          <label className="block">
            GET (hhh:mm:ss)
            <input
              value={tryIt.getText} onChange={(e) => tryIt.onGetText(e.target.value)}
              aria-invalid={tryIt.getError !== null} aria-describedby={tryIt.getError ? 'get-error' : undefined}
              className="mt-1 w-full rounded border border-stone-400 bg-transparent px-2 py-1 font-mono dark:border-stone-600"
            />
          </label>
          {tryIt.getError && <p id="get-error" role="alert" className="text-amber-700 dark:text-amber-400">{tryIt.getError}. Showing the last valid time.</p>}
          {gimbalInput('inner', 'Inner gimbal (I)')}
          {gimbalInput('middle', 'Middle gimbal (M)')}
          {gimbalInput('outer', 'Outer gimbal (O)')}
          <button
            type="button" onClick={tryIt.onReset} disabled={tryIt.atBaseline}
            className="rounded border border-stone-900 px-3 py-1 font-mono text-xs uppercase tracking-wide disabled:opacity-40 dark:border-stone-100"
          >
            Reset to the figure's values
          </button>
        </section>
      )}
    </aside>
  );
}
