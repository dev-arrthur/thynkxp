'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';

export type GeoGeometry = {
  rings: [number, number][][];
  bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number };
  center: { lat: number; lng: number };
};
export type BrazilStateGeometry = { uf: string; name: string; geometry: GeoGeometry };

function mercatorY(lat: number) {
  const limited = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + limited / 2));
}
function brazilProjection(states: BrazilStateGeometry[], width: number, height: number) {
  const points = states.flatMap((state) => state.geometry.rings.flat());
  const xs = points.map(([lon]) => lon); const ys = points.map(([, lat]) => mercatorY(lat));
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 24; const scale = Math.min((width - pad * 2) / Math.max(.001, maxX - minX), (height - pad * 2) / Math.max(.001, maxY - minY));
  const offsetX = (width - (maxX - minX) * scale) / 2; const offsetY = (height - (maxY - minY) * scale) / 2;
  return (lon: number, lat: number) => ({ x: offsetX + (lon - minX) * scale, y: height - offsetY - (mercatorY(lat) - minY) * scale });
}

export function BrazilRealMap({ selected, onSelect }: { selected: string; onSelect: (state: { uf: string; name: string }) => void }) {
  const [states, setStates] = useState<BrazilStateGeometry[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch('/api/prospects/geo?allStates=1', { cache: 'no-store' }).then(async (response) => {
      const data = await response.json() as { states?: BrazilStateGeometry[] };
      if (active && response.ok) setStates(Array.isArray(data.states) ? data.states : []);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  const width = 720, height = 650;
  const project = useMemo(() => states.length ? brazilProjection(states, width, height) : null, [states]);
  if (loading) return <div className="geo-map-skeleton"><i /><span>Carregando malha oficial dos estados...</span></div>;
  if (!states.length || !project) return <div className="geo-map-skeleton"><span>Não foi possível carregar o mapa oficial agora.</span></div>;
  return <svg className="geo-brazil-real" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapa oficial dos estados do Brasil">
    {states.map((state) => {
      const d = state.geometry.rings.map((ring) => ring.map(([lon, lat], index) => { const point = project(lon, lat); return `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`; }).join(' ') + ' Z').join(' ');
      const center = project(state.geometry.center.lng, state.geometry.center.lat);
      return <g key={state.uf} className={`geo-br-state ${selected === state.uf ? 'is-selected' : ''}`} onClick={() => onSelect(state)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(state); }}>
        <path d={d} fillRule="evenodd" /><text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="central">{state.uf}</text><title>{state.name}</title>
      </g>;
    })}
  </svg>;
}

function worldPoint(lat: number, lng: number, zoom: number) {
  const size = 256 * 2 ** zoom; const sin = Math.sin(Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI / 180);
  return { x: (lng + 180) / 360 * size, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size };
}
function metersPerPixel(lat: number, zoom: number) { return 156543.03392804097 * Math.cos(lat * Math.PI / 180) / 2 ** zoom; }
function chooseZoom(lat: number, radiusKm: number) {
  const desired = radiusKm * 1000 / 112;
  return Math.max(7, Math.min(16, Math.round(Math.log2(156543.03392804097 * Math.cos(lat * Math.PI / 180) / Math.max(1, desired)))));
}

export function LocalRadiusMap({ geometry, radiusKm, city }: { geometry: GeoGeometry; radiusKm: number; city: string }) {
  const [zoomOffset, setZoomOffset] = useState(0); const width = 1000, height = 360;
  useEffect(() => setZoomOffset(0), [geometry.center.lat, geometry.center.lng, radiusKm]);
  const zoom = Math.max(7, Math.min(17, chooseZoom(geometry.center.lat, radiusKm) + zoomOffset));
  const center = worldPoint(geometry.center.lat, geometry.center.lng, zoom); const tileSize = 256; const n = 2 ** zoom;
  const minTileX = Math.floor((center.x - width / 2) / tileSize) - 1, maxTileX = Math.floor((center.x + width / 2) / tileSize) + 1;
  const minTileY = Math.max(0, Math.floor((center.y - height / 2) / tileSize) - 1), maxTileY = Math.min(n - 1, Math.floor((center.y + height / 2) / tileSize) + 1);
  const tiles: { key: string; href: string; x: number; y: number }[] = [];
  for (let y = minTileY; y <= maxTileY; y += 1) for (let x = minTileX; x <= maxTileX; x += 1) {
    const wrappedX = ((x % n) + n) % n; tiles.push({ key: `${x}:${y}`, href: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`, x: x * tileSize - center.x + width / 2, y: y * tileSize - center.y + height / 2 });
  }
  const cityPaths = geometry.rings.map((ring, ringIndex) => {
    const d = ring.map(([lng, lat], index) => { const p = worldPoint(lat, lng, zoom); return `${index ? 'L' : 'M'} ${(p.x - center.x + width / 2).toFixed(1)} ${(p.y - center.y + height / 2).toFixed(1)}`; }).join(' ') + ' Z';
    return <path d={d} key={ringIndex} />;
  });
  const radiusPixels = Math.min(width * .48, radiusKm * 1000 / Math.max(.01, metersPerPixel(geometry.center.lat, zoom)));
  return <div className="geo-local-map-v6">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Mapa de ${city} com raio real de ${radiusKm} quilômetros`}>
      <g className="geo-osm-tiles">{tiles.map((tile) => <image key={tile.key} href={tile.href} x={tile.x} y={tile.y} width={tileSize} height={tileSize} />)}</g>
      <g className="geo-municipality-boundary">{cityPaths}</g>
      <circle className="geo-radius-real" cx={width / 2} cy={height / 2} r={radiusPixels} />
      <circle className="geo-radius-center" cx={width / 2} cy={height / 2} r="8" />
    </svg>
    <div className="geo-map-pin-v6"><Icon name="location" size={19} /></div>
    <div className="geo-map-zoom"><button type="button" onClick={() => setZoomOffset((value) => Math.min(3, value + 1))} aria-label="Aproximar">+</button><button type="button" onClick={() => setZoomOffset((value) => Math.max(-3, value - 1))} aria-label="Afastar">−</button></div>
    <div className="geo-osm-attribution">© OpenStreetMap contributors · limite municipal IBGE</div>
  </div>;
}

export function StateShape({ geometry, label }: { geometry: GeoGeometry | null; label: string }) {
  if (!geometry) return <div className="geo-shape-loading"><i /><span>Carregando contorno oficial...</span></div>;
  const width = 320, height = 240; const { minLon, maxLon, minLat, maxLat } = geometry.bbox; const spanX = Math.max(.001, maxLon - minLon), spanY = Math.max(.001, maxLat - minLat);
  const scale = Math.min((width - 30) / spanX, (height - 30) / spanY); const ox = (width - spanX * scale) / 2, oy = (height - spanY * scale) / 2;
  return <svg className="geo-shape" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>{geometry.rings.map((ring, index) => {
    const d = ring.map(([lon, lat], i) => `${i ? 'L' : 'M'} ${(ox + (lon - minLon) * scale).toFixed(1)} ${(oy + (maxLat - lat) * scale).toFixed(1)}`).join(' ') + ' Z';
    return <path d={d} key={index} />;
  })}</svg>;
}
