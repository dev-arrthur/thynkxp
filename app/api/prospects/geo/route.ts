import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../lib/admin-auth';

type GeoJson = { type?: string; features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }>; geometry?: { type?: string; coordinates?: unknown } };
type Point = [number, number];
type Geometry = { rings: Point[][]; bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number }; center: { lat: number; lng: number } };

const STATE_IDS: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17,
  MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29,
  MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53,
};
const STATE_NAMES: Record<string, string> = {
  RO:'Rondônia',AC:'Acre',AM:'Amazonas',RR:'Roraima',PA:'Pará',AP:'Amapá',TO:'Tocantins',MA:'Maranhão',PI:'Piauí',CE:'Ceará',RN:'Rio Grande do Norte',PB:'Paraíba',PE:'Pernambuco',AL:'Alagoas',SE:'Sergipe',BA:'Bahia',MG:'Minas Gerais',ES:'Espírito Santo',RJ:'Rio de Janeiro',SP:'São Paulo',PR:'Paraná',SC:'Santa Catarina',RS:'Rio Grande do Sul',MS:'Mato Grosso do Sul',MT:'Mato Grosso',GO:'Goiás',DF:'Distrito Federal',
};
const stateCache = new Map<string, { expiresAt: number; data: Geometry }>();
const cityCache = new Map<string, { expiresAt: number; data: Geometry }>();
let brazilCache: { expiresAt: number; data: Array<{ uf: string; name: string; geometry: Geometry }> } | null = null;

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'private, max-age=900' } });
}
async function fetchJson<T>(url: string, timeout = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'thynkXP-geo/2.0' } });
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    return await response.json() as T;
  } finally { clearTimeout(timer); }
}
function isPoint(value: unknown): value is Point { return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number'; }
function collectRings(coordinates: unknown, depth = 0): Point[][] {
  if (!Array.isArray(coordinates) || depth > 9) return [];
  if (coordinates.length && isPoint(coordinates[0])) return [coordinates.filter(isPoint) as Point[]];
  return coordinates.flatMap((item) => collectRings(item, depth + 1));
}
function simplify(ring: Point[], max = 680) {
  if (ring.length <= max) return ring;
  const stride = Math.max(1, Math.ceil(ring.length / max));
  const sampled = ring.filter((_, index) => index % stride === 0);
  if (ring.length && sampled[sampled.length - 1] !== ring[ring.length - 1]) sampled.push(ring[ring.length - 1]);
  return sampled;
}
function ringCentroid(ring: Point[]) {
  let twiceArea = 0, x = 0, y = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i]; const [x2, y2] = ring[(i + 1) % ring.length];
    const cross = x1 * y2 - x2 * y1; twiceArea += cross; x += (x1 + x2) * cross; y += (y1 + y2) * cross;
  }
  const area = twiceArea / 2;
  if (!Number.isFinite(area) || Math.abs(area) < 1e-10) return null;
  return { area: Math.abs(area), lng: x / (3 * twiceArea), lat: y / (3 * twiceArea) };
}
function normalizeGeo(raw: GeoJson): Geometry | null {
  const geometry = raw.features?.[0]?.geometry || raw.geometry;
  const rings = collectRings(geometry?.coordinates).filter((ring) => ring.length >= 3).map((ring) => simplify(ring));
  const points = rings.flat(); if (!points.length) return null;
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of points) { minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); }
  const centroids = rings.map(ringCentroid).filter((item): item is NonNullable<ReturnType<typeof ringCentroid>> => Boolean(item));
  const main = centroids.sort((a, b) => b.area - a.area)[0];
  const center = main ? { lat: main.lat, lng: main.lng } : { lat: (minLat + maxLat) / 2, lng: (minLon + maxLon) / 2 };
  return { rings, bbox: { minLon, maxLon, minLat, maxLat }, center };
}
async function stateGeometry(uf: string) {
  const cached = stateCache.get(uf); if (cached && cached.expiresAt > Date.now()) return cached.data;
  const id = STATE_IDS[uf]; if (!id) return null;
  const raw = await fetchJson<GeoJson>(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${id}?formato=application/vnd.geo+json&qualidade=minima`);
  const geometry = normalizeGeo(raw); if (!geometry) return null;
  stateCache.set(uf, { data: geometry, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
  return geometry;
}

export async function GET(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);
  const url = new URL(req.url);
  const uf = String(url.searchParams.get('uf') || '').trim().toUpperCase();
  const municipalityId = String(url.searchParams.get('municipalityId') || '').replace(/\D/g, '').slice(0, 12);
  const allStates = url.searchParams.get('allStates') === '1';
  try {
    if (allStates) {
      if (brazilCache && brazilCache.expiresAt > Date.now()) return json({ ok: true, kind: 'brazil', states: brazilCache.data });
      const settled = await Promise.all(Object.keys(STATE_IDS).map(async (stateUf) => ({ uf: stateUf, name: STATE_NAMES[stateUf], geometry: await stateGeometry(stateUf) })));
      const states = settled.filter((item): item is { uf: string; name: string; geometry: Geometry } => Boolean(item.geometry));
      brazilCache = { data: states, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
      return json({ ok: true, kind: 'brazil', states });
    }
    if (municipalityId) {
      const cached = cityCache.get(municipalityId);
      if (cached && cached.expiresAt > Date.now()) return json({ ok: true, kind: 'municipality', geometry: cached.data });
      const raw = await fetchJson<GeoJson>(`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${municipalityId}?formato=application/vnd.geo+json&qualidade=minima`);
      const geometry = normalizeGeo(raw); if (!geometry) return json({ error: 'geo_not_found' }, 404);
      cityCache.set(municipalityId, { data: geometry, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      return json({ ok: true, kind: 'municipality', geometry });
    }
    if (!/^[A-Z]{2}$/.test(uf) || !STATE_IDS[uf]) return json({ error: 'invalid_uf' }, 400);
    const geometry = await stateGeometry(uf); if (!geometry) return json({ error: 'geo_not_found' }, 404);
    return json({ ok: true, kind: 'state', geometry });
  } catch {
    return json({ error: 'geo_unavailable' }, 503);
  }
}
