import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../lib/admin-auth';

type CnaeItem = { id?: string | number; descricao?: string };
type Municipality = { id?: number; nome?: string };
type CompanyRecord = Record<string, unknown>;
type Attempt = { count: number; resetAt: number };

const attempts = new Map<string, Attempt>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const UPSTREAM_TIMEOUT_MS = 12_000;

const CNAE_ALIASES: Record<string, { code: string; description: string }> = {
  barbearia: { code: '9602501', description: 'Cabeleireiros, manicure e pedicure' },
  barbeiro: { code: '9602501', description: 'Cabeleireiros, manicure e pedicure' },
  salao: { code: '9602501', description: 'Cabeleireiros, manicure e pedicure' },
  estetica: { code: '9602502', description: 'Atividades de estética e outros serviços de cuidados com a beleza' },
  restaurante: { code: '5611201', description: 'Restaurantes e similares' },
  lanchonete: { code: '5611203', description: 'Lanchonetes, casas de chá, de sucos e similares' },
  academia: { code: '9313100', description: 'Atividades de condicionamento físico' },
  contabilidade: { code: '6920601', description: 'Atividades de contabilidade' },
  contador: { code: '6920601', description: 'Atividades de contabilidade' },
  advocacia: { code: '6911701', description: 'Serviços advocatícios' },
  advogado: { code: '6911701', description: 'Serviços advocatícios' },
  publicidade: { code: '7311400', description: 'Agências de publicidade' },
  marketing: { code: '7311400', description: 'Agências de publicidade' },
  software: { code: '6201501', description: 'Desenvolvimento de programas de computador sob encomenda' },
  tecnologia: { code: '6204000', description: 'Consultoria em tecnologia da informação' },
};

let cnaeCache: { expiresAt: number; data: CnaeItem[] } | null = null;
const municipalityCache = new Map<string, { expiresAt: number; data: Municipality[] }>();

function clean(value: unknown, max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalize(value: unknown) {
  return clean(value, 240)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function digits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function requestIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
    .split(',')[0]
    .trim()
    .slice(0, 80);
}

function checkRateLimit(req: Request) {
  const key = requestIp(req);
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  attempts.set(key, current);
  return { allowed: true, retryAfter: 0 };
}

function json(payload: Record<string, unknown>, status = 200, headers?: HeadersInit) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', ...headers },
  });
}

async function fetchJson<T>(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'thynkXP-lead-radar/1.0' },
    });
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

async function allCnaes() {
  if (cnaeCache && cnaeCache.expiresAt > Date.now()) return cnaeCache.data;
  const data = await fetchJson<CnaeItem[]>('https://servicodados.ibge.gov.br/api/v2/cnae/subclasses');
  cnaeCache = { data: Array.isArray(data) ? data : [], expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
  return cnaeCache.data;
}

async function resolveCnaes(segment: string) {
  const numeric = digits(segment);
  if (numeric.length >= 5 && numeric.length <= 7) {
    return [{ code: numeric.padEnd(7, '0'), description: `CNAE ${numeric}` }];
  }

  const normalized = normalize(segment);
  for (const [alias, item] of Object.entries(CNAE_ALIASES)) {
    if (normalized === alias || normalized.includes(alias)) return [item];
  }

  const tokens = normalized.split(' ').filter((token) => token.length >= 3);
  if (!tokens.length) return [];

  const ranked = (await allCnaes())
    .map((item) => {
      const description = clean(item.descricao, 240);
      const haystack = normalize(description);
      const tokenHits = tokens.filter((token) => haystack.includes(token)).length;
      const exactBonus = normalized && haystack.includes(normalized) ? 3 : 0;
      return {
        code: digits(item.id),
        description,
        score: tokenHits + exactBonus,
      };
    })
    .filter((item) => item.code.length >= 5 && item.score > 0)
    .sort((a, b) => b.score - a.score || a.description.localeCompare(b.description, 'pt-BR'));

  const unique = new Map<string, { code: string; description: string }>();
  for (const item of ranked) {
    if (!unique.has(item.code)) unique.set(item.code, { code: item.code, description: item.description });
    if (unique.size >= 3) break;
  }
  return [...unique.values()];
}

async function resolveMunicipality(uf: string, city: string) {
  const key = uf.toUpperCase();
  let cached = municipalityCache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    const data = await fetchJson<Municipality[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(key)}/municipios`);
    cached = { data: Array.isArray(data) ? data : [], expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
    municipalityCache.set(key, cached);
  }

  const target = normalize(city);
  const exact = cached.data.find((item) => normalize(item.nome) === target);
  if (exact?.id) return exact;
  return cached.data.find((item) => normalize(item.nome).includes(target) || target.includes(normalize(item.nome))) || null;
}

function asNumber(value: unknown) {
  const result = typeof value === 'number' ? value : Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function formatCnpj(value: unknown) {
  const raw = digits(value).slice(0, 14);
  if (raw.length !== 14) return raw;
  return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function companyPhone(record: CompanyRecord) {
  return clean(record.ddd_telefone_1 || record.telefone || record.phone, 40)
    || clean(record.ddd_telefone_2, 40);
}

function companyEmail(record: CompanyRecord) {
  return clean(record.correio_eletronico || record.email, 180).toLowerCase();
}

function companyAddress(record: CompanyRecord) {
  return [
    clean(record.descricao_tipo_de_logradouro, 40),
    clean(record.logradouro, 160),
    clean(record.numero, 30),
    clean(record.bairro, 100),
    clean(record.municipio, 120),
    clean(record.uf, 2),
  ].filter(Boolean).join(', ');
}

function scoreCompany(record: CompanyRecord) {
  let score = 20;
  const reasons: string[] = ['CNPJ ativo e compatível com o segmento'];
  const phone = companyPhone(record);
  const email = companyEmail(record);
  const capital = asNumber(record.capital_social);
  const porte = normalize(record.porte);
  const openedAt = clean(record.data_inicio_atividade, 20);
  const openedDate = openedAt ? new Date(`${openedAt}T00:00:00`) : null;
  const ageDays = openedDate && !Number.isNaN(openedDate.getTime())
    ? Math.max(0, (Date.now() - openedDate.getTime()) / 86_400_000)
    : 0;

  if (phone) { score += 25; reasons.push('telefone empresarial disponível'); }
  if (email) { score += 25; reasons.push('e-mail empresarial disponível'); }
  if (capital >= 100_000) { score += 15; reasons.push('capital social acima de R$ 100 mil'); }
  else if (capital >= 20_000) { score += 10; reasons.push('capital social acima de R$ 20 mil'); }
  else if (capital > 0) score += 4;

  if (porte.includes('demais') || porte.includes('grande')) { score += 10; reasons.push('porte com maior potencial de contratação'); }
  else if (porte.includes('pequeno')) { score += 7; reasons.push('empresa de pequeno porte'); }
  else if (porte.includes('micro')) score += 4;

  if (ageDays >= 730) { score += 10; reasons.push('empresa estabelecida há mais de 2 anos'); }
  else if (ageDays >= 365) score += 5;
  if (clean(record.nome_fantasia, 180)) score += 5;

  const capped = Math.max(0, Math.min(100, score));
  return {
    score: capped,
    qualification: capped >= 70 ? 'quente' : capped >= 50 ? 'morno' : 'explorar',
    reasons: reasons.slice(0, 5),
  };
}

function mapCompany(record: CompanyRecord) {
  const scoring = scoreCompany(record);
  return {
    id: digits(record.cnpj),
    cnpj: formatCnpj(record.cnpj),
    name: clean(record.nome_fantasia, 180) || clean(record.razao_social, 180) || 'Empresa sem nome fantasia',
    legalName: clean(record.razao_social, 180),
    phone: companyPhone(record),
    email: companyEmail(record),
    address: companyAddress(record),
    city: clean(record.municipio, 120),
    uf: clean(record.uf, 2).toUpperCase(),
    cnae: digits(record.cnae_fiscal),
    cnaeDescription: clean(record.cnae_fiscal_descricao, 220),
    capitalSocial: asNumber(record.capital_social),
    porte: clean(record.porte, 100),
    openedAt: clean(record.data_inicio_atividade, 20),
    ...scoring,
  };
}

export async function GET(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);

  const rate = checkRateLimit(req);
  if (!rate.allowed) return json({ error: 'too_many_requests' }, 429, { 'Retry-After': String(rate.retryAfter) });

  const url = new URL(req.url);
  const segment = clean(url.searchParams.get('segment'), 100);
  const city = clean(url.searchParams.get('city'), 120);
  const uf = clean(url.searchParams.get('uf'), 2).toUpperCase();
  const cursor = clean(url.searchParams.get('cursor'), 240);

  if (segment.length < 2) return json({ error: 'segment_required' }, 400);
  if (city.length < 2) return json({ error: 'city_required' }, 400);
  if (!/^[A-Z]{2}$/.test(uf)) return json({ error: 'invalid_uf' }, 400);

  try {
    const [cnaes, municipality] = await Promise.all([
      resolveCnaes(segment),
      resolveMunicipality(uf, city),
    ]);

    if (!cnaes.length) return json({ error: 'segment_not_found', suggestions: Object.keys(CNAE_ALIASES).slice(0, 8) }, 422);
    if (!municipality?.id) return json({ error: 'city_not_found' }, 422);

    const base = String(process.env.CNPJ_SEARCH_BASE_URL || 'https://minhareceita.org').trim().replace(/\/+$/, '');
    const searchUrl = new URL(`${base}/`);
    searchUrl.searchParams.set('uf', uf);
    searchUrl.searchParams.set('municipio', String(municipality.id));
    searchUrl.searchParams.set('cnae', cnaes.map((item) => item.code).join(','));
    searchUrl.searchParams.set('limit', '50');
    if (cursor) searchUrl.searchParams.set('cursor', cursor);

    const result = await fetchJson<{ data?: CompanyRecord[]; cursor?: string }>(searchUrl.toString());
    const companies = (Array.isArray(result.data) ? result.data : [])
      .filter((record) => normalize(record.descricao_situacao_cadastral) === 'ativa' || Number(record.situacao_cadastral) === 2)
      .map(mapCompany)
      .filter((company) => company.id.length === 14)
      .sort((a, b) => b.score - a.score || b.capitalSocial - a.capitalSocial)
      .slice(0, 40);

    return json({
      prospects: companies,
      cursor: clean(result.cursor, 240) || null,
      criteria: {
        segment,
        city: clean(municipality.nome, 120) || city,
        uf,
        cnaes,
      },
      source: 'Receita Federal / Minha Receita / IBGE',
    });
  } catch (error) {
    console.error('Erro no Radar de Leads:', error instanceof Error ? error.message : 'unknown_error');
    return json({ error: 'prospect_search_unavailable' }, 503);
  }
}
