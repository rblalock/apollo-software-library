import { useEffect, useMemo, useRef, useState } from 'react';
import { renderSvg } from '@asl/view-engine';
import { REELS } from '../../lib/reels';
import { Segmented } from '../ui/Segmented';

type Style = 'microfilm' | 'print';
const SPEEDS = ['4', '8', '12', '24'] as const;
type Speed = (typeof SPEEDS)[number];

/** Film grain: a small noise tile made once and repeated over the frame (cheap to composite; decorative only). */
function Grain() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    setUrl(c.toDataURL());
  }, []);
  return url ? <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `url(${url})` }} aria-hidden="true" /> : null;
}

/**
 * The film player. `autoplay` starts playback after hydration unless the reader's system asks for reduced motion;
 * `compact` drops the speed, style and grain controls (the home page).
 */
export default function FilmExhibit({ autoplay = false, compact = false }: { autoplay?: boolean; compact?: boolean }) {
  const [reelId, setReelId] = useState(REELS[0]!.id);
  const reel = REELS.find((r) => r.id === reelId)!;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(String(reel.fps) as Speed);
  const [style, setStyle] = useState<Style>('microfilm');
  const [grain, setGrain] = useState(true);
  const cache = useRef(new Map<string, { svg: string; caption: string }>());

  const selectReel = (id: string) => {
    const r = REELS.find((x) => x.id === id)!;
    setReelId(id); setIndex(0); setPlaying(false); setSpeed(String(r.fps) as Speed);
  };

  const frame = useMemo(() => {
    const key = `${reelId}:${index}:${style}`;
    let f = cache.current.get(key);
    if (!f) {
      const { dl, caption } = reel.frame(index);
      f = { svg: renderSvg(dl, { style, title: `${reel.label}, ${caption}` }), caption };
      cache.current.set(key, f);
    }
    return f;
  }, [reel, reelId, index, style]);

  useEffect(() => {
    if (autoplay && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true);
  }, [autoplay]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % reel.frames), 1000 / Number(speed));
    return () => window.clearInterval(id);
  }, [playing, speed, reel]);

  const step = (d: number) => { setPlaying(false); setIndex((i) => (i + d + reel.frames) % reel.frames); };
  // On the home page the frame is held under 60% of the window height, so the controls stay on screen with it.
  const width = compact ? 'max-w-[min(100%,60vh)]' : 'mx-auto max-w-3xl';
  const button = 'rounded border border-stone-400 px-3 py-1 font-mono text-xs uppercase tracking-wide dark:border-stone-600';

  return (
    <section className="space-y-4" aria-label="Film of computed frames">
      <Segmented label="Reel" value={reelId} onChange={selectReel} options={REELS.map((r) => [r.id, r.short] as const)} />
      <p className={`text-sm text-stone-700 dark:text-stone-300 ${compact ? width : 'max-w-3xl'}`}>{reel.description}</p>
      <div className={`relative overflow-hidden rounded ${width} border border-stone-300 dark:border-stone-700`}>
        {/* Server and browser JavaScript engines can round a borderline visibility or clipping test differently in the
            last bit, so the server's first frame may differ by one sample point; it is kept until the next change. */}
        <div className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          suppressHydrationWarning dangerouslySetInnerHTML={{ __html: frame.svg }} />
        {grain && style === 'microfilm' && <Grain />}
      </div>
      <div className={`flex flex-wrap items-center gap-3 ${width}`}>
        <button type="button" className={button} onClick={() => step(-1)} aria-label="Previous frame">◀</button>
        <button type="button" className={button} aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <button type="button" className={button} onClick={() => step(1)} aria-label="Next frame">▶</button>
        <label className="flex min-w-[12rem] flex-1 items-center gap-2 text-sm">
          <span className="sr-only">Frame</span>
          <input type="range" className="w-full" min={0} max={reel.frames - 1} value={index} onChange={(e) => { setPlaying(false); setIndex(Number(e.target.value)); }} />
        </label>
        <p className="font-mono text-xs tabular-nums" aria-live={playing ? 'off' : 'polite'}>
          FRAME {String(index + 1).padStart(3, '0')}/{reel.frames} · {frame.caption}
        </p>
      </div>
      {!compact && <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4">
        <Segmented label="Frames per second" value={speed} onChange={setSpeed} options={SPEEDS.map((s) => [s, `${s} fps`] as const)} />
        <Segmented label="Style" value={style} onChange={setStyle} options={[['microfilm', 'Microfilm'], ['print', 'Report print']] as const} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={grain} onChange={(e) => setGrain(e.target.checked)} /> Film grain</label>
      </div>}
    </section>
  );
}
