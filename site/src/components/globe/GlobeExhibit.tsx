import { useMemo, useState } from 'react';
import { InvalidGetError, parseGet, renderSvg } from '@asl/view-engine';
import { GLOBES, globeDisplay, globeUnderlay } from '../../lib/globes';
import { Segmented } from '../ui/Segmented';

type Mode = 'recreation' | 'original' | 'overlay';
type Style = 'microfilm' | 'print';

export default function GlobeExhibit({ panelIds }: { panelIds: string[] }) {
  const [panelId, setPanelId] = useState(panelIds[0]!);
  const panel = GLOBES[panelId]!;
  const [mode, setMode] = useState<Mode>('recreation');
  const [style, setStyle] = useState<Style>('microfilm');
  const [labels, setLabels] = useState(true);
  const [opacity, setOpacity] = useState(0.55);
  const [getText, setGetText] = useState(panel.get);
  const [validGet, setValidGet] = useState(panel.get);
  const [getError, setGetError] = useState<string | null>(null);

  const select = (id: string) => { setPanelId(id); setGetText(GLOBES[id]!.get); setValidGet(GLOBES[id]!.get); setGetError(null); };
  const onGet = (t: string) => {
    setGetText(t);
    try {
      parseGet(t);
      if (!globeDisplay(panel, t.trim())) { setGetError('No spacecraft state at that time (the reconstruction covers 0:11:49 to 195:03:05)'); return; }
      setValidGet(t.trim()); setGetError(null);
    } catch (e) { setGetError(e instanceof InvalidGetError ? e.message : String(e)); }
  };

  const display = useMemo(() => globeDisplay(panel, validGet), [panel, validGet]);
  const atPrinted = validGet === panel.get;
  const svg = useMemo(() => display && renderSvg(display.dl, {
    style, labels, showPrimitives: mode !== 'original',
    underlay: mode === 'recreation' ? undefined : globeUnderlay(panel, mode === 'original' ? 1 : opacity, style === 'microfilm'),
    title: mode === 'original' ? `TN D-6853 Fig ${panel.id.slice(3)}, 1972 scan` : `Fig ${panel.id.slice(3)} recomputed at ${validGet} GET`,
  }), [display, style, labels, mode, opacity, panel, validGet]);

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-label={`Figure ${panel.id.slice(3, 4)} exhibit`}>
      <div className="space-y-4">
        <Segmented label="Panel" value={panelId} onChange={select} options={panelIds.map((id) => [id, GLOBES[id]!.label] as const)} />
        <div className="flex flex-wrap items-center gap-4">
          <Segmented label="View" value={mode} onChange={setMode}
            options={[['recreation', 'Recreation'], ['original', '1972 original'], ['overlay', 'Overlay']] as const} />
          <Segmented label="Style" value={style} onChange={setStyle} options={[['microfilm', 'Microfilm'], ['print', 'Report print']] as const} />
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
        {svg && (
          <div className="overflow-hidden rounded border border-stone-300 dark:border-stone-700 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            suppressHydrationWarning dangerouslySetInnerHTML={{ __html: svg }} />
        )}
        {mode === 'overlay' && !atPrinted && (
          <p className="text-sm text-amber-700 dark:text-amber-400">The time differs from the figure's, so the overlay no longer lines up. Reset to compare.</p>
        )}
      </div>
      <aside className="space-y-5 text-sm">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">Inputs</h2>
          <dl className="mt-2 space-y-2">
            <div><dt className="text-muted">Observer</dt><dd>The command module, from the Apollo 11 Mission Report's trajectory table, propagated to the time shown.</dd></div>
            <div><dt className="text-muted">Looking at</dt><dd>The {panel.body === 'earth' ? 'Earth' : 'Moon'}'s centre, {2 * panel.extentDeg}° field.</dd></div>
            <div><dt className="text-muted">Plot "up"</dt><dd>The spacecraft's direction of travel, a rule recovered from Fig 6(a).</dd></div>
          </dl>
        </div>
        <form className="space-y-2 rounded border border-stone-300 p-4 dark:border-stone-700" onSubmit={(e) => e.preventDefault()}>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">Try it</h2>
          <label className="block">GET (hhh:mm:ss)
            <input className="mt-1 w-full rounded border border-stone-400 bg-transparent px-2 py-1 font-mono dark:border-stone-600"
              value={getText} onChange={(e) => onGet(e.target.value)} aria-invalid={getError !== null} aria-describedby={getError ? 'globe-get-error' : undefined} />
          </label>
          {getError && <p id="globe-get-error" role="alert" className="text-amber-700 dark:text-amber-400">{getError}. Showing the last valid time.</p>}
          <button type="button" disabled={atPrinted && getText === panel.get} onClick={() => select(panelId)}
            className="rounded border border-stone-400 px-3 py-1 font-mono text-xs uppercase tracking-wide disabled:opacity-40 dark:border-stone-600">
            Reset to the figure's time
          </button>
        </form>
      </aside>
    </section>
  );
}
