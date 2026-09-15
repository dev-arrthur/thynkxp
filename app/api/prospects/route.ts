import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../lib/admin-auth';

type CnaeItem = { id?: string | number; descricao?: string };
type Municipality = { id?: number; nome?: string };
type CompanyRecord = Record<string, unknown>;
type Attempt = { count: number; resetAt: number };
type Partner = { name: string; qualification: string; joinedAt: string };
type TaxRegime = { year: number; form: string; filings: number };
type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
};
type WebHit = { title: string; url: string; description: string; source: string };
type ProviderStatus = { id: string; label: string; enabled: boolean; ok: boolean; detail: string };

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
  clinica: { code: '8630503', description: 'Atividade médica ambulatorial restrita a consultas' },
  odontologia: { code: '8630504', description: 'Atividade odontológica' },
  petshop: { code: '4789004', description: 'Comércio varejista de animais vivos e de artigos e alimentos para animais de estimação' },
};

const BUSINESS_STOP_WORDS = new Set([
  'ltda', 'eireli', 'mei', 'me', 'sa', 's', 'a', 'empresa', 'servicos', 'servico', 'comercio',
  'comercial', 'brasil', 'grupo', 'cia', 'limitada', 'unipessoal',
]);
const SOCIAL_HOSTS = ['instagram.com', 'facebook.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'x.com', 'twitter.com'];
const DIRECTORY_HOSTS = ['google.com', 'maps.google', 'tripadvisor.', 'guiamais.', 'solutudo.', 'telelistas.', 'yelp.', 'waze.com'];

let cnaeCache: { expiresAt: number; data: CnaeItem[] } | null = null;
const municipalityCache = new Map<string, { expiresAt: number; data: Municipality[] }>();

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalize(value: unknown) {
  return clean(value, 300)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function digits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function asNumber(value: unknown) {
  const result = typeof value === 'number' ? value : Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (String(value).toUpperCase() === 'S') return true;
  if (String(value).toUpperCase() === 'N') return false;
  return null;
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

async function fetchJson<T>(url: string, init?: RequestInit, timeout = UPSTREAM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'thynkXP-lead-radar/2.0',
        ...(init?.headers || {}),
      },
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
  if (numeric.length >= 5 && numeric.length <= 7) return [{ code: numeric.padEnd(7, '0'), description: `CNAE ${numeric}` }];

  const normalized = normalize(segment);
  for (const [alias, item] of Object.entries(CNAE_ALIASES)) {
    if (normalized === alias || normalized.includes(alias)) return [item];
  }

  const tokens = normalized.split(' ').filter((token) => token.length >= 3);
  if (!tokens.length) return [];
  const ranked = (await allCnaes()).map((item) => {
    const description = clean(item.descricao, 240);
    const haystack = normalize(description);
    const tokenHits = tokens.filter((token) => haystack.includes(token)).length;
    const exactBonus = normalized && haystack.includes(normalized) ? 3 : 0;
    return { code: digits(item.id), description, score: tokenHits + exactBonus };
  }).filter((item) => item.code.length >= 5 && item.score > 0)
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
  return cached.data.find((item) => normalize(item.nome) === target)
    || cached.data.find((item) => normalize(item.nome).includes(target) || target.includes(normalize(item.nome)))
    || null;
}

function formatCnpj(value: unknown) {
  const raw = digits(value).slice(0, 14);
  if (raw.length !== 14) return raw;
  return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function companyPhone(record: CompanyRecord) {
  return clean(record.ddd_telefone_1 || record.telefone || record.phone, 40) || clean(record.ddd_telefone_2, 40);
}

function companyEmail(record: CompanyRecord) {
  return clean(record.correio_eletronico || record.email, 180).toLowerCase();
}

function companyAddress(record: CompanyRecord) {
  return [clean(record.descricao_tipo_de_logradouro, 40), clean(record.logradouro, 160), clean(record.numero, 30), clean(record.complemento, 100), clean(record.bairro, 100), clean(record.municipio, 120), clean(record.uf, 2)]
    .filter(Boolean).join(', ');
}

function companyPartners(record: CompanyRecord): Partner[] {
  const raw = Array.isArray(record.qsa) ? record.qsa : [];
  return raw.slice(0, 20).map((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      name: clean(row.nome_socio, 180),
      qualification: clean(row.qualificacao_socio, 140),
      joinedAt: clean(row.data_entrada_sociedade, 20),
    };
  }).filter((item) => item.name);
}

function companyTaxRegime(record: CompanyRecord): TaxRegime[] {
  const raw = Array.isArray(record['regime_tributário'])
    ? record['regime_tributário']
    : Array.isArray(record.regime_tributario) ? record.regime_tributario : [];
  return raw.map((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      year: Math.max(0, Math.min(3000, Math.round(asNumber(row.ano)))),
      form: clean(row['forma_de_tributação'] || row.forma_de_tributacao, 120),
      filings: Math.max(0, Math.round(asNumber(row.quantidade_de_escrituracoes))),
    };
  }).filter((item) => item.form).sort((a, b) => b.year - a.year).slice(0, 6);
}

function secondaryCnaes(record: CompanyRecord) {
  const raw = Array.isArray(record.cnaes_secundarios) ? record.cnaes_secundarios : [];
  return raw.slice(0, 8).map((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return { code: digits(row.codigo).slice(0, 7), description: clean(row.descricao, 180) };
  }).filter((item) => item.code || item.description);
}

function baseScore(record: CompanyRecord, partners: Partner[], regimes: TaxRegime[]) {
  let score = 20;
  const reasons: string[] = ['CNPJ ativo e compatível com o segmento'];
  const phone = companyPhone(record);
  const email = companyEmail(record);
  const capital = asNumber(record.capital_social);
  const porte = normalize(record.porte);
  const openedAt = clean(record.data_inicio_atividade, 20);
  const openedDate = openedAt ? new Date(`${openedAt}T00:00:00`) : null;
  const ageDays = openedDate && !Number.isNaN(openedDate.getTime()) ? Math.max(0, (Date.now() - openedDate.getTime()) / 86_400_000) : 0;

  if (phone) { score += 18; reasons.push('telefone empresarial disponível'); }
  if (email) { score += 18; reasons.push('e-mail empresarial disponível'); }
  if (capital >= 100_000) { score += 12; reasons.push('capital social acima de R$ 100 mil'); }
  else if (capital >= 20_000) { score += 8; reasons.push('capital social acima de R$ 20 mil'); }
  else if (capital > 0) score += 3;
  if (porte.includes('demais') || porte.includes('grande')) { score += 9; reasons.push('porte com maior potencial de contratação'); }
  else if (porte.includes('pequeno')) score += 6;
  else if (porte.includes('micro')) score += 3;
  if (ageDays >= 730) { score += 8; reasons.push('empresa estabelecida há mais de 2 anos'); }
  else if (ageDays >= 365) score += 4;
  if (clean(record.nome_fantasia, 180)) score += 3;
  if (partners.length) { score += 4; reasons.push('quadro societário identificado'); }
  if (regimes.length || asBoolean(record.opcao_pelo_simples) === true) { score += 4; reasons.push('informação tributária disponível'); }
  return { score, reasons };
}

function companyTokens(name: string) {
  return normalize(name).split(' ').filter((token) => token.length > 2 && !BUSINESS_STOP_WORDS.has(token));
}

function matchScore(companyName: string, legalName: string, candidate: string) {
  const target = normalize(candidate);
  const names = [companyName, legalName].filter(Boolean);
  let best = 0;
  for (const name of names) {
    const normalizedName = normalize(name);
    if (normalizedName.length >= 5 && target.includes(normalizedName)) best = Math.max(best, 1);
    const tokens = companyTokens(name);
    if (!tokens.length) continue;
    const hits = tokens.filter((token) => target.includes(token)).length;
    best = Math.max(best, hits / Math.min(tokens.length, 4));
  }
  return best;
}

function hostOf(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

async function googlePlaces(segment: string, city: string, uf: string): Promise<{ places: GooglePlace[]; status: ProviderStatus }> {
  const key = String(process.env.GOOGLE_PLACES_API_KEY || '').trim();
  if (!key) return { places: [], status: { id: 'google_places', label: 'Google Places', enabled: false, ok: false, detail: 'Chave não configurada' } };
  try {
    const pages = Math.max(1, Math.min(3, Number(process.env.GOOGLE_PLACES_MAX_PAGES || 2) || 2));
    const places: GooglePlace[] = [];
    let pageToken = '';
    for (let page = 0; page < pages; page += 1) {
      const body: Record<string, unknown> = { textQuery: `${segment} em ${city}, ${uf}, Brasil`, pageSize: 20, languageCode: 'pt-BR', regionCode: 'BR' };
      if (pageToken) body.pageToken = pageToken;
      const result = await fetchJson<{ places?: GooglePlace[]; nextPageToken?: string }>('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount,nextPageToken',
        },
        body: JSON.stringify(body),
      }, 10_000);
      places.push(...(Array.isArray(result.places) ? result.places : []));
      pageToken = clean(result.nextPageToken, 500);
      if (!pageToken) break;
    }
    return { places, status: { id: 'google_places', label: 'Google Places', enabled: true, ok: true, detail: `${places.length} locais encontrados` } };
  } catch (error) {
    console.warn('Google Places indisponível no Radar:', error instanceof Error ? error.message : 'unknown_error');
    return { places: [], status: { id: 'google_places', label: 'Google Places', enabled: true, ok: false, detail: 'Falha no enriquecimento' } };
  }
}

async function braveSearch(segment: string, city: string, uf: string): Promise<{ hits: WebHit[]; status: ProviderStatus }> {
  const key = String(process.env.BRAVE_SEARCH_API_KEY || '').trim();
  if (!key) return { hits: [], status: { id: 'brave', label: 'Brave Search', enabled: false, ok: false, detail: 'Chave não configurada' } };
  try {
    const queries = [`${segment} ${city} ${uf}`, `site:instagram.com ${segment} ${city} ${uf}`];
    const responses = await Promise.all(queries.map(async (q) => {
      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      url.searchParams.set('q', q);
      url.searchParams.set('count', '20');
      url.searchParams.set('country', 'br');
      url.searchParams.set('search_lang', 'pt-br');
      return fetchJson<{ web?: { results?: { title?: string; url?: string; description?: string }[] } }>(url.toString(), {
        headers: { 'X-Subscription-Token': key },
      }, 8_000);
    }));
    const hits = responses.flatMap((response) => response.web?.results || []).map((item) => ({
      title: clean(item.title, 240), url: clean(item.url, 500), description: clean(item.description, 500), source: 'Brave Search',
    })).filter((item) => item.url);
    return { hits, status: { id: 'brave', label: 'Brave Search', enabled: true, ok: true, detail: `${hits.length} sinais web encontrados` } };
  } catch (error) {
    console.warn('Brave Search indisponível no Radar:', error instanceof Error ? error.message : 'unknown_error');
    return { hits: [], status: { id: 'brave', label: 'Brave Search', enabled: true, ok: false, detail: 'Falha no enriquecimento' } };
  }
}

async function serperSearch(segment: string, city: string, uf: string): Promise<{ hits: WebHit[]; status: ProviderStatus }> {
  const key = String(process.env.SERPER_API_KEY || '').trim();
  if (!key) return { hits: [], status: { id: 'serper', label: 'Google Search via Serper', enabled: false, ok: false, detail: 'Chave não configurada' } };
  try {
    const queries = [`${segment} ${city} ${uf}`, `site:instagram.com ${segment} ${city} ${uf}`];
    const responses = await Promise.all(queries.map((q) => fetchJson<{ organic?: { title?: string; link?: string; snippet?: string }[] }>('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
      body: JSON.stringify({ q, gl: 'br', hl: 'pt-br', num: 20 }),
    }, 8_000)));
    const hits = responses.flatMap((response) => response.organic || []).map((item) => ({
      title: clean(item.title, 240), url: clean(item.link, 500), description: clean(item.snippet, 500), source: 'Google Search / Serper',
    })).filter((item) => item.url);
    return { hits, status: { id: 'serper', label: 'Google Search / Serper', enabled: true, ok: true, detail: `${hits.length} sinais web encontrados` } };
  } catch (error) {
    console.warn('Serper indisponível no Radar:', error instanceof Error ? error.message : 'unknown_error');
    return { hits: [], status: { id: 'serper', label: 'Google Search / Serper', enabled: true, ok: false, detail: 'Falha no enriquecimento' } };
  }
}

function mapCompany(record: CompanyRecord) {
  const partners = companyPartners(record);
  const taxRegime = companyTaxRegime(record);
  const scoring = baseScore(record, partners, taxRegime);
  const simples = asBoolean(record.opcao_pelo_simples);
  const mei = asBoolean(record.opcao_pelo_mei);
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
    secondaryCnaes: secondaryCnaes(record),
    capitalSocial: asNumber(record.capital_social),
    porte: clean(record.porte, 100),
    legalNature: clean(record.natureza_juridica, 160),
    openedAt: clean(record.data_inicio_atividade, 20),
    partners,
    taxRegime,
    simples,
    mei,
    taxSummary: mei === true ? 'MEI / Simples Nacional' : simples === true ? 'Simples Nacional' : taxRegime[0]?.form || 'Não identificado na base pública',
    website: '', instagram: '', facebook: '', googleMapsUrl: '', googlePlaceId: '', googleRating: 0, googleRatingCount: 0,
    digitalSources: [] as string[],
    score: scoring.score,
    qualification: 'explorar' as 'quente' | 'morno' | 'explorar',
    reasons: scoring.reasons,
  };
}

function enrichCompany(company: ReturnType<typeof mapCompany>, places: GooglePlace[], hits: WebHit[]) {
  const place = places.map((item) => ({ item, score: matchScore(company.name, company.legalName, item.displayName?.text || '') }))
    .filter((item) => item.score >= 0.5).sort((a, b) => b.score - a.score)[0]?.item;
  const matchingHits = hits.map((item) => ({ item, score: matchScore(company.name, company.legalName, `${item.title} ${item.description} ${item.url}`) }))
    .filter((item) => item.score >= 0.5).sort((a, b) => b.score - a.score);

  const instagram = matchingHits.find(({ item }) => hostOf(item.url).includes('instagram.com'))?.item.url || '';
  const facebook = matchingHits.find(({ item }) => hostOf(item.url).includes('facebook.com'))?.item.url || '';
  const websiteHit = matchingHits.find(({ item }) => {
    const host = hostOf(item.url);
    return host && !SOCIAL_HOSTS.some((social) => host.includes(social)) && !DIRECTORY_HOSTS.some((directory) => host.includes(directory));
  })?.item;
  const website = clean(place?.websiteUri, 500) || clean(websiteHit?.url, 500);
  const phone = company.phone || clean(place?.nationalPhoneNumber || place?.internationalPhoneNumber, 40);
  const digitalSources = new Set<string>();
  if (place) digitalSources.add('Google Places');
  if (websiteHit) digitalSources.add(websiteHit.source);
  if (instagram) digitalSources.add(matchingHits.find(({ item }) => item.url === instagram)?.item.source || 'Busca web');

  let score = company.score;
  const reasons = [...company.reasons];
  if (website) { score += 8; reasons.push('site identificado'); }
  if (instagram) { score += 6; reasons.push('Instagram identificado'); }
  if (place?.id) { score += 3; reasons.push('presença validada em busca local'); }
  if ((place?.rating || 0) >= 4.2 && (place?.userRatingCount || 0) >= 20) { score += 4; reasons.push('boa reputação em busca local'); }
  score = Math.min(100, score);

  return {
    ...company,
    phone,
    website,
    instagram,
    facebook,
    googleMapsUrl: clean(place?.googleMapsUri, 500),
    googlePlaceId: clean(place?.id, 180),
    googleRating: asNumber(place?.rating),
    googleRatingCount: Math.max(0, Math.round(asNumber(place?.userRatingCount))),
    digitalSources: [...digitalSources],
    score,
    qualification: score >= 72 ? 'quente' as const : score >= 52 ? 'morno' as const : 'explorar' as const,
    reasons: [...new Set(reasons)].slice(0, 8),
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
    const [cnaes, municipality] = await Promise.all([resolveCnaes(segment), resolveMunicipality(uf, city)]);
    if (!cnaes.length) return json({ error: 'segment_not_found', suggestions: Object.keys(CNAE_ALIASES).slice(0, 10) }, 422);
    if (!municipality?.id) return json({ error: 'city_not_found' }, 422);

    const base = String(process.env.CNPJ_SEARCH_BASE_URL || 'https://minhareceita.org').trim().replace(/\/+$/, '');
    const searchUrl = new URL(`${base}/`);
    searchUrl.searchParams.set('uf', uf);
    searchUrl.searchParams.set('municipio', String(municipality.id));
    searchUrl.searchParams.set('cnae', cnaes.map((item) => item.code).join(','));
    searchUrl.searchParams.set('limit', '50');
    if (cursor) searchUrl.searchParams.set('cursor', cursor);

    const [registry, google, brave, serper] = await Promise.all([
      fetchJson<{ data?: CompanyRecord[]; cursor?: string }>(searchUrl.toString()),
      googlePlaces(segment, clean(municipality.nome, 120) || city, uf),
      braveSearch(segment, clean(municipality.nome, 120) || city, uf),
      serperSearch(segment, clean(municipality.nome, 120) || city, uf),
    ]);

    const baseCompanies = (Array.isArray(registry.data) ? registry.data : [])
      .filter((record) => normalize(record.descricao_situacao_cadastral) === 'ativa' || Number(record.situacao_cadastral) === 2)
      .map(mapCompany)
      .filter((company) => company.id.length === 14);
    const webHits = [...brave.hits, ...serper.hits];
    const companies = baseCompanies.map((company) => enrichCompany(company, google.places, webHits))
      .sort((a, b) => b.score - a.score || b.capitalSocial - a.capitalSocial)
      .slice(0, 50);

    const providers: ProviderStatus[] = [
      { id: 'receita', label: 'Receita Federal / Minha Receita', enabled: true, ok: true, detail: `${companies.length} empresas ativas carregadas` },
      { id: 'ibge', label: 'IBGE', enabled: true, ok: true, detail: `Município ${clean(municipality.nome, 120) || city} validado` },
      google.status, brave.status, serper.status,
    ];

    return json({
      prospects: companies,
      cursor: clean(registry.cursor, 240) || null,
      criteria: { segment, city: clean(municipality.nome, 120) || city, uf, cnaes },
      providers,
      source: 'Receita Federal / Minha Receita / IBGE + enriquecimento digital opcional',
    });
  } catch (error) {
    console.error('Erro no Radar de Leads:', error instanceof Error ? error.message : 'unknown_error');
    return json({ error: 'prospect_search_unavailable' }, 503);
  }
}
