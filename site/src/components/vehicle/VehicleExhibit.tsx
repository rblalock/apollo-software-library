import { useEffect, useMemo, useRef, useState } from 'react';
import { renderSvg, vehiclePrimitives } from '@asl/view-engine';
import { orbitCamera, VEHICLES } from '../../lib/vehicle';
import { Segmented } from '../ui/Segmented';

type VehicleKey = keyof typeof VEHICLES;
type Style = 'microfilm' | 'print';
const DEG_PER_SECOND = 24;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Slider(props: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3 text-sm">
      {props.label}
      <input type="range" min={props.min} max={props.max} step={1} value={props.value} onChange={(e) => props.onChange(Number(e.target.value))} />
      <span className="text-right font-mono tabular-nums">{props.value}{props.unit}</span>
    </label>
  );
}

export default function VehicleExhibit() {
  const [key, setKey] = useState<VehicleKey>('lm');
  const [az, setAz] = useState(35);
  const [el, setEl] = useState(15);
  const [zoom, setZoom] = useState(100);
  const [style, setStyle] = useState<Style>('microfilm');
  const [playing, setPlaying] = useState(false);
  const last = useRef<number | null>(null);

  useEffect(() => { setPlaying(!reducedMotion()); }, []);
  useEffect(() => {
    if (!playing) { last.current = null; return; }
    let id = 0;
    const tick = (t: number) => {
      if (last.current !== null) {
        const dt = (t - last.current) / 1000;
        setAz((a) => Math.round((a + DEG_PER_SECOND * dt + 360) % 360 * 10) / 10);
      }
      last.current = t;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  const v = VEHICLES[key];
  const { svg, segments } = useMemo(() => {
    const cam = orbitCamera({ azDeg: az, elDeg: el, distance: v.distance * (100 / zoom), target: v.target, extentDeg: v.extentDeg });
    const primitives = vehiclePrimitives(v.parts, cam);
    return {
      segments: primitives.length,
      svg: renderSvg({ extentDeg: v.extentDeg, utc: new Date(0), primitives, placed: [], notes: [] }, { style, title: `Hidden-line ${v.label}, azimuth ${Math.round(az)}°, elevation ${el}°` }),
    };
  }, [v, az, el, zoom, style]);

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-label="Hidden-line vehicle exhibit">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Segmented label="Vehicle" value={key} onChange={setKey}
            options={(Object.keys(VEHICLES) as VehicleKey[]).map((k) => [k, VEHICLES[k].label] as const)} />
          <Segmented label="Style" value={style} onChange={setStyle}
            options={[['microfilm', 'Microfilm'], ['print', 'Report print']] as const} />
          <button type="button" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}
            className="rounded border border-stone-400 px-3 py-1 font-mono text-xs uppercase tracking-wide dark:border-stone-600">
            {playing ? 'Pause' : 'Rotate'}
          </button>
        </div>
        <div className="overflow-hidden rounded border border-stone-300 dark:border-stone-700 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="font-mono text-xs text-stone-500">{segments} visible edge segments</p>
      </div>
      <aside className="space-y-5">
        <div className="space-y-3">
          <Slider label="Azimuth" value={Math.round(az)} min={0} max={359} unit="°" onChange={(a) => { setPlaying(false); setAz(a); }} />
          <Slider label="Elevation" value={el} min={-89} max={89} unit="°" onChange={setEl} />
          <Slider label="Zoom" value={zoom} min={50} max={250} unit="%" onChange={setZoom} />
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Azimuth is measured from the vehicle's front (+Z, the LM's hatch) toward its right (+Y); elevation is above the plane of the landing gear.
        </p>
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-stone-500">Model sources</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-stone-700 dark:text-stone-300">
            {v.sources.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      </aside>
    </section>
  );
}
