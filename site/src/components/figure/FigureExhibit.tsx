import { useMemo, useState } from 'react';
import { buildScene, InvalidGetError, parseGet, renderSvg, type GimbalAngles } from '@asl/view-engine';
import { baselineScene, FIGURES, recoveredSct, residualArrows, residuals, scanUnderlay, stars, TOLERANCE } from '../../lib/figures';
import { parseAngleDraft } from '../../lib/inputs';
import { InputsPanel } from './InputsPanel';
import { ResidualsTable } from './ResidualsTable';

type Mode = 'recreation' | 'original' | 'overlay';
type Style = 'microfilm' | 'print';
type GimbalKey = keyof GimbalAngles;
const GIMBAL_KEYS: GimbalKey[] = ['inner', 'middle', 'outer'];
const GIMBAL_RANGE = { min: -360, max: 360 };
const draftsOf = (g: GimbalAngles): Record<GimbalKey, string> => ({ inner: String(g.inner), middle: String(g.middle), outer: String(g.outer) });
const sameGimbals = (a: GimbalAngles, b: GimbalAngles) => a.inner === b.inner && a.middle === b.middle && a.outer === b.outer;

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

export default function FigureExhibit({ figureIds }: { figureIds: string[] }) {
  const [figureId, setFigureId] = useState(figureIds[0]!);
  const figure = FIGURES[figureId]!;
  const spec = figure.spec;
  const [mode, setMode] = useState<Mode>('recreation');
  const [style, setStyle] = useState<Style>('microfilm');
  const [labels, setLabels] = useState(true);
  const [opacity, setOpacity] = useState(0.55);
  const [getText, setGetText] = useState(spec.get);
  const [validGet, setValidGet] = useState(spec.get);
  const [getError, setGetError] = useState<string | null>(null);
  const [gimbals, setGimbals] = useState<GimbalAngles>(spec.gimbals);
  const [gimbalDrafts, setGimbalDrafts] = useState(draftsOf(spec.gimbals));
  const [gimbalErrors, setGimbalErrors] = useState<Partial<Record<GimbalKey, string>>>({});

  const resetTo = (id: string) => {
    const s = FIGURES[id]!.spec;
    setGetText(s.get); setValidGet(s.get); setGetError(null);
    setGimbals(s.gimbals); setGimbalDrafts(draftsOf(s.gimbals)); setGimbalErrors({});
  };
  const selectFigure = (id: string) => { setFigureId(id); resetTo(id); };
  const onGetText = (text: string) => {
    setGetText(text);
    try { parseGet(text); setValidGet(text.trim()); setGetError(null); }
    catch (e) { setGetError(e instanceof InvalidGetError ? e.message : String(e)); }
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

  const isBaseline = validGet === spec.get && sameGimbals(gimbals, spec.gimbals);
  const baseDrafts = draftsOf(spec.gimbals);
  const atBaseline = isBaseline && getText === spec.get && getError === null
    && GIMBAL_KEYS.every((k) => gimbalDrafts[k] === baseDrafts[k]) && Object.keys(gimbalErrors).length === 0;

  const baseline = useMemo(() => baselineScene(figure), [figure]);
  const figureResiduals = useMemo(() => residuals(figure), [figure]);
  const recovered = useMemo(() => recoveredSct(figure), [figure]);
  const dl = useMemo(
    () => (isBaseline ? baseline : buildScene({ ...spec, get: validGet, gimbals }, { stars })),
    [isBaseline, baseline, spec, validGet, gimbals],
  );
  const svg = useMemo(() => {
    const arrows = mode === 'overlay' && isBaseline ? residualArrows(figureResiduals.rows) : [];
    return renderSvg({ ...dl, primitives: [...dl.primitives, ...arrows] }, {
      style, labels, showPrimitives: mode !== 'original',
      underlay: mode === 'recreation' ? undefined : scanUnderlay(figure, mode === 'original' ? 1 : opacity, style === 'microfilm'),
      title: mode === 'original' ? `TN D-6853 ${figure.label}, 1972 scan` : `${figure.label} recomputed from 1969 inputs`,
    });
  }, [dl, mode, style, labels, opacity, isBaseline, figure, figureResiduals]);

  const tryIt = spec.instrument.kind === 'sct'
    ? { getText, getError, onGetText, gimbalDrafts, gimbalErrors, onGimbalDraft, onReset: () => resetTo(figureId), atBaseline }
    : null;

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-label={`${figure.label} exhibit`}>
      <div className="space-y-4">
        {figureIds.length > 1 && (
          <Segmented label="Panel" value={figureId} onChange={selectFigure}
            options={figureIds.map((id) => [id, FIGURES[id]!.label] as const)} />
        )}
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
          : <p className="text-sm text-amber-700 dark:text-amber-400">The inputs differ from the figure's, so the overlay no longer lines up. Reset to compare.</p>)}
        {dl.notes.map((n) => <p key={n} className="text-sm text-stone-600 dark:text-stone-400">{n}</p>)}
      </div>
      <InputsPanel figure={figure} utc={dl.utc} recovered={recovered} tryIt={tryIt} />
      <div className="lg:col-span-2">
        <ResidualsTable {...figureResiduals} tolerance={TOLERANCE} />
      </div>
    </section>
  );
}
