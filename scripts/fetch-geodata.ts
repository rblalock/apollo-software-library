/**
 * Earth coastlines and lunar features for the globe views (roadmap item 2). Downloads are cached under tmp/geo;
 * the simplified, provenance-stamped results are written to data/derived/.
 *   Earth coastlines: Natural Earth 1:110m (public domain).
 *   Lunar craters and named features: IAU/USGS Gazetteer of Planetary Nomenclature (public domain).
 *   Lunar maria outlines: LROC global mare boundaries, Nelson et al. 2014 (NASA LRO, PDS).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseDbf, parseShp } from './lib/shapefile';
import { simplifyLine } from './lib/simplify';
import { download, sha256, today, writeJson, type ProvenanceSource } from './lib/provenance';

const DIR = 'tmp/geo';
mkdirSync(DIR, { recursive: true });

async function cached(url: string, file: string): Promise<{ bytes: Uint8Array; source: ProvenanceSource }> {
  const path = `${DIR}/${file}`;
  if (!existsSync(path)) writeFileSync(path, (await download(url)).bytes);
  const bytes = new Uint8Array(readFileSync(path));
  return { bytes, source: { url, retrieved: today(), sha256: sha256(bytes) } };
}
const r2 = (x: number) => Math.round(x * 100) / 100, r3 = (x: number) => Math.round(x * 1000) / 1000;
const lon180 = (lon: number) => ((lon + 540) % 360) - 180;

// Earth: Natural Earth 1:110m coastline (already generalized; kept as is).
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_coastline.geojson';
const ne = await cached(NE, 'ne_110m_coastline.geojson');
const coast = JSON.parse(new TextDecoder().decode(ne.bytes)) as { features: { geometry: { coordinates: [number, number][] } }[] };
const lines = coast.features.map((f) => f.geometry.coordinates.map(([lon, lat]) => [r3(lon), r3(lat)]));
// The 1969 Earth views also draw the large lakes (Victoria, Tanganyika, Malawi on Fig 6).
const NE_LAKES = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_lakes.geojson';
const nl = await cached(NE_LAKES, 'ne_110m_lakes.geojson');
type Poly = { type: 'Polygon'; coordinates: [number, number][][] } | { type: 'MultiPolygon'; coordinates: [number, number][][][] };
const lakes = (JSON.parse(new TextDecoder().decode(nl.bytes)) as { features: { geometry: Poly }[] }).features
  .flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]!] : f.geometry.coordinates.map((p) => p[0]!)))
  .map((ring) => ring.map(([lon, lat]) => [r3(lon), r3(lat)]));
writeJson('data/derived/earth-coastline.json', {
  provenance: { sources: [ne.source, nl.source], method: 'Natural Earth 1:110m coastline LineStrings and lake outer rings, coordinates rounded to 0.001°. Longitude east, latitude north (degrees).', script: 'scripts/fetch-geodata.ts', generated: today() },
  lines,
  lakes,
}, 0);
console.log(`earth-coastline: ${lines.length} lines, ${lines.reduce((s, l) => s + l.length, 0)} points; ${lakes.length} lakes`);

// Moon: IAU nomenclature centre points (craters ≥ 20 km and the named maria, seas, lakes, bays and marshes).
const NOMEN = 'https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.zip';
const nz = await cached(NOMEN, 'moon_nomenclature.zip');
execFileSync('unzip', ['-o', '-q', `${DIR}/moon_nomenclature.zip`, '-d', `${DIR}/nomen`]);
const nomen = parseDbf(new Uint8Array(readFileSync(`${DIR}/nomen/MOON_nomenclature_center_pts.dbf`)), 'utf-8');
const MIN_CRATER_KM = 20;
const AREAL = /^(Mare|Oceanus|Sinus|Lacus|Palus)/;
const feature = (r: Record<string, string | number>) => ({ name: String(r.clean_name), lat: r3(Number(r.center_lat)), lon: r3(lon180(Number(r.center_lon))), diamKm: r2(Number(r.diameter)) });
const craters = nomen.filter((r) => r.type === 'Crater, craters' && Number(r.diameter) >= MIN_CRATER_KM).map(feature);
const areas = nomen.filter((r) => AREAL.test(String(r.type))).map((r) => ({ ...feature(r), type: String(r.type).split(',')[0] }));
writeJson('data/derived/moon-features.json', {
  provenance: { sources: [nz.source], method: `IAU/USGS Gazetteer of Planetary Nomenclature centre points: craters of diameter ≥ ${MIN_CRATER_KM} km, and every mare, oceanus, sinus, lacus and palus. Longitude converted to −180…180 east.`, script: 'scripts/fetch-geodata.ts', generated: today() },
  craters,
  areas,
}, 0);
console.log(`moon-features: ${craters.length} craters, ${areas.length} named areas`);

// Moon: LROC mare boundaries, simplified.
const LROC = 'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/EXTRAS/SHAPEFILE/LROC_GLOBAL_MARE';
const shp = await cached(`${LROC}/LROC_GLOBAL_MARE_180.SHP`, 'LROC_GLOBAL_MARE_180.SHP');
const dbf = await cached(`${LROC}/LROC_GLOBAL_MARE_180.DBF`, 'LROC_GLOBAL_MARE_180.DBF');
const recs = parseShp(shp.bytes), attrs = parseDbf(dbf.bytes);
const MIN_AREA_DEG2 = 10, TOL_DEG = 0.25;
const ringArea = (r: [number, number][]) => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]!; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const outlines = recs.flatMap((rec, i) => rec.parts.filter((p) => ringArea(p) >= MIN_AREA_DEG2)
  .map((p) => ({ name: String(attrs[i]!.MARE_NAME), ring: simplifyLine(p, TOL_DEG).map(([lon, lat]) => [r2(lon), r2(lat)]) })));
writeJson('data/derived/moon-maria.json', {
  provenance: { sources: [shp.source, dbf.source], method: `LROC global mare boundary polygons (Nelson et al. 2014, LPSC 45, 2861), IAU Moon 2000 coordinates, −180…180 east. Rings under ${MIN_AREA_DEG2} deg² dropped; Douglas–Peucker at ${TOL_DEG}°; rounded to 0.01°.`, script: 'scripts/fetch-geodata.ts', generated: today() },
  outlines,
}, 0);
console.log(`moon-maria: ${outlines.length} rings, ${outlines.reduce((s, o) => s + o.ring.length, 0)} points`);
