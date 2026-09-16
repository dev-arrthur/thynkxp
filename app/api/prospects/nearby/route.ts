import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../lib/admin-auth';

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
  location?: { latitude?: number; longitude?: number };
};
function clean(value: unknown, max = 500) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function json(payload: Record<string, unknown>, status = 200) { return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } }); }

export async function GET(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);
  const url = new URL(req.url);
  const segment = clean(url.searchParams.get('segment'), 120);
  const city = clean(url.searchParams.get('city'), 120);
  const uf = clean(url.searchParams.get('uf'), 2).toUpperCase();
  const lat = number(url.searchParams.get('lat'));
  const lng = number(url.searchParams.get('lng'));
  const radiusKm = Math.max(1, Math.min(50, number(url.searchParams.get('radiusKm')) || 10));
  if (!segment || !city || !/^[A-Z]{2}$/.test(uf) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (!lat && !lng)) return json({ error: 'invalid_search_area' }, 400);

  const key = String(process.env.GOOGLE_PLACES_API_KEY || '').trim();
  if (!key) return json({ ok: true, prospects: [], provider: { id: 'google_places_radius', label: 'Google Places por raio', enabled: false, ok: false, detail: 'GOOGLE_PLACES_API_KEY não configurada' } });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST', signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount,places.location',
      },
      body: JSON.stringify({
        textQuery: `${segment} em ${city}, ${uf}, Brasil`,
        pageSize: 20,
        languageCode: 'pt-BR',
        regionCode: 'BR',
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusKm * 1000 } },
      }),
    });
    if (!response.ok) return json({ error: 'nearby_search_failed' }, 502);
    const payload = await response.json() as { places?: GooglePlace[] };
    const prospects = (payload.places || []).map((place) => {
      const phone = clean(place.nationalPhoneNumber || place.internationalPhoneNumber, 50);
      const website = clean(place.websiteUri, 500);
      const rating = number(place.rating);
      const ratings = Math.max(0, Math.round(number(place.userRatingCount)));
      let score = 32;
      const reasons = [`Encontrado na busca local em raio de ${radiusKm} km`];
      if (phone) { score += 18; reasons.push('telefone local disponível'); }
      if (website) { score += 16; reasons.push('site identificado'); }
      if (rating >= 4.5) { score += 12; reasons.push('avaliação local acima de 4,5'); }
      else if (rating >= 4) score += 8;
      if (ratings >= 100) { score += 12; reasons.push('mais de 100 avaliações públicas'); }
      else if (ratings >= 20) score += 6;
      score = Math.min(100, score);
      return {
        id: `place:${clean(place.id, 180)}`,
        cnpj: '', name: clean(place.displayName?.text, 180), legalName: '', phone, email: '', address: clean(place.formattedAddress, 500), city, uf,
        cnae: '', cnaeDescription: segment, secondaryCnaes: [], capitalSocial: 0, porte: '', legalNature: '', openedAt: '', partners: [], taxRegime: [], simples: null, mei: null,
        taxSummary: '', website, instagram: '', facebook: '', googleMapsUrl: clean(place.googleMapsUri, 500), googlePlaceId: clean(place.id, 180),
        googleRating: rating, googleRatingCount: ratings, digitalSources: ['Google Places · busca por raio'], score,
        qualification: score >= 72 ? 'quente' : score >= 52 ? 'morno' : 'explorar', reasons,
        location: place.location || null, matchedNiches: [segment],
      };
    }).filter((item) => item.name);
    return json({ ok: true, prospects, provider: { id: 'google_places_radius', label: 'Google Places por raio', enabled: true, ok: true, detail: `${prospects.length} negócios no raio de ${radiusKm} km` } });
  } catch {
    return json({ error: 'nearby_search_failed' }, 503);
  } finally { clearTimeout(timer); }
}
