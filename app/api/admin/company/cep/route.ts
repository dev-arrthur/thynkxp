import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../../lib/admin-auth';

function digits(value: unknown, max = 20) { return String(value || '').replace(/\D/g, '').slice(0, max); }
function clean(value: unknown, max = 300) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function json(payload: Record<string, unknown>, status = 200) { return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } }); }

export async function GET(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);
  const cep = digits(new URL(req.url).searchParams.get('cep'), 8);
  if (cep.length !== 8) return json({ error: 'invalid_cep' }, 400);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('cep_upstream_failed');
    const row = await response.json() as Record<string, unknown>;
    if (row.erro) return json({ error: 'cep_not_found' }, 404);
    return json({ ok: true, address: {
      cep,
      state: clean(row.uf, 2).toUpperCase(),
      city: clean(row.localidade, 140),
      street: clean(row.logradouro, 220),
      district: clean(row.bairro, 160),
      complement: clean(row.complemento, 180),
    } });
  } catch {
    return json({ error: 'cep_unavailable' }, 503);
  } finally { clearTimeout(timer); }
}
