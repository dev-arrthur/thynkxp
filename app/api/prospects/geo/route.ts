import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../lib/admin-auth';

type GeoJson = { type?: string; features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }>; geometry?: { type?: string; coordinates?: unknown } };
type Point = [number, number];
const stateCache = new Map<string, { expiresAt: number; data: unknown }>();
const cityCache = new Map<string, { expiresAt: number; data: unknown }>();

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'private, max-age=900' } });
}
async function fetchJson<T>(url: string, timeout = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'thynkXP-geo/1.0' } });
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    return await response.json() as T;
  } finally { clearTimeout(timer); }
}
function isPoint(value: unknown): value is Point {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number';
}
function collectRings(coordinates: unknown, depth = 0): Point[][] {
  if (!Array.isArray(coordinates) || depth > 8) return [];
  if (coordinates.length && isPoint(coordinates[0])) return [coordinates.filter(isPoint) as Point[]];
  return coordinates.flatMap((item) => collectRings(item, depth + 1));
}
function simplify(ring: Point[], max = 420) {
  if (ring.length <= max) return ring;
  const stride = Math.max(1, Math.ceil(ring.length / max));
  const sampled = ring.filter((_, index) => index % stride === 0);
  if (ring.length && sampled[sampled.length - 1] !== ring[ring.length - 1]) sampled.push(ring[ring.length - 1]);
  return sampled;
}
function normalizeGeo(raw: GeoJson) {
  const geometry = raw.features?.[0]?.geometry || raw.geometry;
  const rings = collectRings(geometry?.coordinates).filter((ring) => ring.length >= 3).map((ring) => simplify(ring));
  const points = rings.flat();
  if (!points.length) return null;
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of points) { minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); }
  return { rings, bbox: { minLon, maxLon, minLat, maxLat }, center: { lat: (minLat + maxLat) / 2, lng: (minLon + maxLon) / 2 } };
}

export async function GET(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);
  const url = new URL(req.url);
  const uf = String(url.searchParams.get('uf') || '').trim().toUpperCase();
  const municipalityId = String(url.searchParams.get('municipalityId') || '').replace(/\D/g, '').slice(0, 12);

  try {
    if (municipalityId) {
      const cached = cityCache.get(municipalityId);
      if (cached && cached.expiresAt > Date.now()) return json({ ok: true, kind: 'municipality', geometry: cached.data });
      const raw = await fetchJson<GeoJson>(`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${municipalityId}?formato=application/vnd.geo+json&qualidade=minima`);
      const geometry = normalizeGeo(raw);
      if (!geometry) return json({ error: 'geo_not_found' }, 404);
      cityCache.set(municipalityId, { data: geometry, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      return json({ ok: true, kind: 'municipality', geometry });
    }

    if (!/^[A-Z]{2}$/.test(uf)) return json({ error: 'invalid_uf' }, 400);
    const cached = stateCache.get(uf);
    if (cached && cached.expiresAt > Date.now()) return json({ ok: true, kind: 'state', geometry: cached.data });
    const state = await fetchJson<{ id?: number }>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}`);
    if (!state?.id) return json({ error: 'geo_not_found' }, 404);
    const raw = await fetchJson<GeoJson>(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${state.id}?formato=application/vnd.geo+json&qualidade=minima`);
    const geometry = normalizeGeo(raw);
    if (!geometry) return json({ error: 'geo_not_found' }, 404);
    stateCache.set(uf, { data: geometry, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    return json({ ok: true, kind: 'state', geometry });
  } catch {
    return json({ error: 'geo_unavailable' }, 503);
  }
}
