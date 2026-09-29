import { Body, GeoVector, MakeTime } from 'astronomy-engine';
import { scale, sub, unit, type Vec3 } from '../math/vec';
import { moonFixedToJ2000 } from '../ephemeris/moonframe';
import { axesFromBoresight } from '../projection/projection';
import { EARTH_FLATTENING, EARTH_RADIUS_KM, MOON_MEAN_RADIUS_KM } from '../trajectory/gravity';
import type { State } from '../trajectory/propagate';
import { earthFixedToJ2000, moonState } from '../trajectory/states';
import type { GlobeScene } from './globe';

/**
 * The Earth or Moon as the view program drew it from a spacecraft (TN D-6853 Figs 6–7): looking at the body's
 * centre, with the spacecraft's inertial velocity projected to plot +y — the convention identified on Fig 6(a).
 */
export function bodyGlobeScene(body: 'earth' | 'moon', utc: Date, observer: State, extentDeg: number, up: Vec3 = observer.v): GlobeScene {
  const centre: Vec3 = body === 'earth' ? [0, 0, 0] : moonState(utc).r;
  const s = GeoVector(Body.Sun, MakeTime(utc), false);
  const sun = scale([s.x, s.y, s.z], 149597870.7);
  return {
    radiusKm: body === 'earth' ? EARTH_RADIUS_KM : MOON_MEAN_RADIUS_KM,
    centreKm: centre,
    observerKm: observer.r,
    sunDir: unit(sub(sun, centre)),
    bodyFixedToInertial: body === 'earth' ? earthFixedToJ2000(utc) : moonFixedToJ2000(utc),
    axes: axesFromBoresight(sub(centre, observer.r), up),
    extentDeg,
    flattening: body === 'earth' ? EARTH_FLATTENING : 0,
  };
}
