import { useMemo, useState } from 'react';
import { buildScene, FIG_3A_SPEC, InvalidGetError, parseGet, renderSvg, type GimbalAngles } from '@asl/view-engine';
import { baseline, baselineResiduals, recovered, residualArrows, scanUnderlay, stars, TOLERANCE } from '../../lib/fig3a';
import { parseAngleDraft } from '../../lib/inputs';
import { InputsPanel } from './InputsPanel';
import { ResidualsTable } from './ResidualsTable';

type Mode = 'recreation' | 'original' | 'overlay';
type Style = 'microfilm' | 'print';

function Segmented<T extends string>(props: { label: string; value: T; options: ReadonlyArray<readonly [T, string]>; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{props.label}</legend>
      {props.options.map(([v, text]) => (
        <label
          key={v}
          className={`cursor-pointer rounded border px-3 py-1 font-mono text-xs uppercase tracking-wide has-[:focus-visible]:outline-2 ${
            props.value === v
              ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
              : 'border-stone-400 dark:border-stone-600'
          }`}
        >
          <input type="radio" className="sr-only" name={props.label} value={v} checked={props.value === v} onChange={() => props.onChange(v)} />
          {text}
        </label>
      ))}
    </fieldset>
  );
}

type GimbalKey = keyof GimbalAngles;
const GIMBAL_KEYS: GimbalKey[] = ['inner', 'middle', 'outer'];
const GIMBAL_RANGE = { min: -360, max: 360 };
const sameGimbals = (a: GimbalAngles, b: GimbalAngles) => a.inner === b.inner && a.middle === b.middle && a.outer === b.outer;
const draftsOf = (g: GimbalAngles): Record<GimbalKey, string> => ({ inner: String(g.inner), middle: String(g.middle), outer: String(g.outer) });

export default function Fig3aExhibit() {
  const [mode, setMode] = useState<Mode>('recreation');
  const [style, setStyle] = useState<Style>('microfilm');
  const [labels, setLabels] = useState(true);
  const [opacity, setOpacity] = useState(0.55);
  const [getText, setGetText] = useState(FIG_3A_SPEC.get);
  const [validGet, setValidGet] = useState(FIG_3A_SPEC.get);
  const [getError, setGetError] = useState<string | null>(null);
  const [gimbals, setGimbals] = useState<GimbalAngles>(FIG_3A_SPEC.gimbals);
  const [gimbalDrafts, setGimbalDrafts] = useState(draftsOf(FIG_3A_SPEC.gimbals));
  const [gimbalErrors, setGimbalErrors] = useState<Partial<Record<GimbalKey, string>>>({});

  const onGetText = (text: string) => {
    setGetText(text);
    try {
      parseGet(text);
      setValidGet(text.trim());
      setGetError(null);
    } catch (e) {
      setGetError(e instanceof InvalidGetError ? e.message : String(e));
    }
  };
  const onGimbalDraft = (key: GimbalKey, text: string) => {
    setGimbalDrafts((d) => ({ ...d, [key]: text }));
    const parsed = parseAngleDraft(text, GIMBAL_RANGE);
    if (parsed.ok) {
      setGimbals((g) => ({ ...g, [key]: parsed.value }));
      setGimbalErrors(({ [key]: _cleared, ...rest }) => rest);
    } else {
      setGimbalErrors((e) => ({ ...e, [key]: parsed.error }));
    }
  };
  const reset = () => {
    onGetText(FIG_3A_SPEC.get);
    setGimbals(FIG_3A_SPEC.gimbals);
    setGimbalDrafts(draftsOf(FIG_3A_SPEC.gimbals));
    setGimbalErrors({});
  };

  const isBaseline = validGet === FIG_3A_SPEC.get && sameGimbals(gimbals, FIG_3A_SPEC.gimbals);
  const baselineDrafts = draftsOf(FIG_3A_SPEC.gimbals);
  const inputsAtBaseline = isBaseline && getText === FIG_3A_SPEC.get && getError === null
    && GIMBAL_KEYS.every((k) => gimbalDrafts[k] === baselineDrafts[k]) && Object.keys(gimbalErrors).length === 0;
  const dl = useMemo(
    () => (isBaseline ? baseline : buildScene({ ...FIG_3A_SPEC, get: validGet, gimbals }, { stars })),
    [isBaseline, validGet, gimbals],
  );
  const svg = useMemo(() => {
    const arrows = mode === 'overlay' && isBaseline ? residualArrows(baselineResiduals.rows) : [];
    return renderSvg({ ...dl, primitives: [...dl.primitives, ...arrows] }, {
      style,
      labels,
      showPrimitives: mode !== 'original',
      underlay: mode === 'recreation' ? undefined : scanUnderlay(mode === 'original' ? 1 : opacity, style === 'microfilm'),
      title: mode === 'original' ? 'TN D-6853 Figure 3a, 1972 scan' : 'Figure 3a recomputed from 1969 inputs',
    });
  }, [dl, mode, style, labels, opacity, isBaseline]);

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-label="Figure 3a exhibit">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Segmented label="View" value={mode} onChange={setMode}
            options={[['recreation', 'Recreation'], ['original', '1972 original'], ['overlay', 'Overlay']] as const} />
          <Segmented label="Style" value={style} onChange={setStyle}
            options={[['microfilm', 'Microfilm'], ['print', 'Report print']] as const} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Labels
          </label>
        </div>
        {mode === 'overlay' && (
          <label className="flex items-center gap-3 text-sm">
            Scan opacity
            <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-48" />
          </label>
        )}
        <div
          className="overflow-hidden rounded border border-stone-300 dark:border-stone-700 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {mode === 'overlay' && (isBaseline
          ? <p className="text-sm text-stone-600 dark:text-stone-400">Orange arrows run from each body's position on the 1972 scan toward its recomputed position, magnified ×5.</p>
          : <p className="text-sm text-amber-700 dark:text-amber-400">The inputs differ from 1969, so the overlay no longer lines up. Reset to compare.</p>)}
        {dl.notes.map((n) => <p key={n} className="text-sm text-stone-600 dark:text-stone-400">{n}</p>)}
      </div>
      <InputsPanel
        getText={getText} getError={getError} onGetText={onGetText}
        gimbalDrafts={gimbalDrafts} gimbalErrors={gimbalErrors} onGimbalDraft={onGimbalDraft} onReset={reset}
        utc={dl.utc} recovered={recovered} isBaseline={inputsAtBaseline}
      />
      <div className="lg:col-span-2">
        <ResidualsTable {...baselineResiduals} tolerance={TOLERANCE} />
      </div>
    </section>
  );
}
