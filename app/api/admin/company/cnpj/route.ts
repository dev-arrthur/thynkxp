import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../../lib/admin-auth';

type Row = Record<string, unknown>;
function clean(value: unknown, max = 500) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function digits(value: unknown, max = 30) { return String(value || '').replace(/\D/g, '').slice(0, max); }
function json(payload: Record<string, unknown>, status = 200) { return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } }); }

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': 'thynkXP-admin-client-onboarding/1.0' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    return await response.json() as Row;
  } finally { clearTimeout(timer); }
}

function normalize(row: Row) {
  const qsaRaw = Array.isArray(row.qsa) ? row.qsa : [];
  const partners = qsaRaw.slice(0, 20).map((item) => {
    const data = item && typeof item === 'object' ? item as Row : {};
    return clean(data.nome_socio || data.nome, 180);
  }).filter(Boolean);

  return {
    cnpj: digits(row.cnpj || row.cnpj_basico, 14),
    legalName: clean(row.razao_social || row.nome_empresarial, 220),
    tradeName: clean(row.nome_fantasia, 180),
    email: clean(row.email || row.correio_eletronico, 180).toLowerCase(),
    phone: clean(row.ddd_telefone_1 || row.telefone || row.phone, 50),
    partners,
    openedAt: clean(row.data_inicio_atividade, 20),
    cnae: digits(row.cnae_fiscal || row.cnae_principal, 7),
    cnaeDescription: clean(row.cnae_fiscal_descricao || row.descricao_atividade_principal, 240),
    companySize: clean(row.porte || row.descricao_porte, 120),
    legalNature: clean(row.natureza_juridica || row.descricao_natureza_juridica, 180),
    location: {
      cep: digits(row.cep, 8),
      state: clean(row.uf, 2).toUpperCase(),
      city: clean(row.municipio || row.nome_municipio, 140),
      street: clean(row.logradouro, 220),
      number: clean(row.numero, 30),
      complement: clean(row.complemento, 180),
      district: clean(row.bairro, 160),
    },
  };
}

export async function GET(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);
  const cnpj = digits(new URL(req.url).searchParams.get('cnpj'), 14);
  if (cnpj.length !== 14) return json({ error: 'invalid_cnpj' }, 400);

  try {
    const row = await fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    return json({ ok: true, company: normalize(row), source: 'BrasilAPI / dados públicos de CNPJ' });
  } catch {
    try {
      const base = String(process.env.CNPJ_SEARCH_BASE_URL || 'https://minhareceita.org').trim().replace(/\/+$/, '');
      const row = await fetchJson(`${base}/${cnpj}`);
      return json({ ok: true, company: normalize(row), source: 'Minha Receita / dados públicos de CNPJ' });
    } catch {
      return json({ error: 'cnpj_not_found' }, 404);
    }
  }
}
