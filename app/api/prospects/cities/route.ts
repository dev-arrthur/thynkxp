import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../lib/admin-auth';

type IbgeCity = { id?: number; nome?: string };
type CacheEntry = { expiresAt: number; cities: { id: number; name: string }[] };

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8_000;

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
  });
}

export async function GET(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);

  const uf = new URL(req.url).searchParams.get('uf')?.trim().toUpperCase() || '';
  if (!/^[A-Z]{2}$/.test(uf)) return json({ error: 'invalid_uf' }, 400);

  const current = cache.get(uf);
  if (current && current.expiresAt > Date.now()) return json({ uf, cities: current.cities });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return json({ error: 'cities_unavailable' }, 503);

    const raw = await response.json() as IbgeCity[];
    const cities = (Array.isArray(raw) ? raw : [])
      .map((item) => ({ id: Number(item.id) || 0, name: String(item.nome || '').trim() }))
      .filter((item) => item.id > 0 && item.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    cache.set(uf, { cities, expiresAt: Date.now() + CACHE_TTL_MS });
    return json({ uf, cities });
  } catch (error) {
    console.error('Erro ao carregar cidades do IBGE:', error instanceof Error ? error.message : 'unknown_error');
    return json({ error: 'cities_unavailable' }, 503);
  } finally {
    clearTimeout(timer);
  }
}
