import { searchBakuPlaces, type BakuPlace } from './bakuPlaces';

export type GeocodeHit = {
  lat: number;
  lng: number;
  label: string;
  source: 'local' | 'photon' | 'nominatim';
};

const PHOTON = 'https://photon.komoot.io/api/';
const BAKU_VIEWBOX = [49.72, 40.28, 50.12, 40.58] as const;

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
};

function formatPhotonProps(props: Record<string, string | undefined>) {
  const street = props.street?.trim();
  const house = props.housenumber?.trim();
  const name = props.name?.trim();
  const district = props.district?.trim() || props.city?.trim();
  const parts: string[] = [];
  if (name && name !== street) parts.push(name);
  if (street) parts.push(house ? `${street}, ${house}` : street);
  else if (house) parts.push(`bina ${house}`);
  if (district && !parts.some((p) => p.includes(district))) parts.push(district);
  if (parts.length) return parts.join(', ');
  return props.city || props.county || 'Bakı';
}

export function formatPlaceLabel(place: BakuPlace) {
  return place.label;
}

export async function searchBakuAddress(query: string, limit = 6): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const metroQuery = /metro|metropoliten|m\s*\./i.test(q);
  const localCap = metroQuery ? 4 : 3;
  const local = searchBakuPlaces(q, localCap).map((place) => ({
    lat: place.lat,
    lng: place.lng,
    label: place.label,
    source: 'local' as const,
  }));

  const hits: GeocodeHit[] = [...local];
  const seen = new Set(local.map((h) => `${h.lat.toFixed(4)},${h.lng.toFixed(4)}`));
  const photonLimit = local.length && metroQuery ? 2 : Math.max(3, limit - local.length);

  try {
    const url = new URL(PHOTON);
    url.searchParams.set('q', q);
    url.searchParams.set('limit', String(Math.max(2, photonLimit)));
    url.searchParams.set('lang', 'default');
    url.searchParams.set('lat', '40.4093');
    url.searchParams.set('lon', '49.8671');
    url.searchParams.set('bbox', BAKU_VIEWBOX.join(','));
    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const data = (await response.json()) as { features?: PhotonFeature[] };
      for (const feature of data.features ?? []) {
        const [lng, lat] = feature.geometry.coordinates;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const props = feature.properties ?? {};
        const inBaku =
          (props.countrycode === 'AZ' || props.country === 'Azerbaijan' || !props.countrycode) &&
          lat >= 40.25 &&
          lat <= 40.65 &&
          lng >= 49.65 &&
          lng <= 50.25;
        if (!inBaku) continue;
        if (metroQuery && (props.osm_value === 'cafe' || props.osm_value === 'restaurant' || props.osm_value === 'shop')) {
          continue;
        }
        hits.push({
          lat,
          lng,
          label: formatPhotonProps(props),
          source: 'photon',
        });
        if (hits.length >= limit) break;
      }
    }
  } catch {
    /* photon offline */
  }

  if (hits.length < 2) {
    try {
      const rows = await nominatimSearch(q, limit);
      for (const row of rows) {
        const key = `${row.lat.toFixed(4)},${row.lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push(row);
        if (hits.length >= limit) break;
      }
    } catch {
      /* ignore */
    }
  }

  return hits.slice(0, limit);
}

async function nominatimSearch(query: string, limit: number): Promise<GeocodeHit[]> {
  const proxied = new URL('/api/geocode/search', window.location.origin);
  proxied.searchParams.set('q', query);
  proxied.searchParams.set('limit', String(limit));
  const response = await fetch(proxied.toString(), { headers: { Accept: 'application/json' } });
  if (!response.ok) return [];
  const data = (await response.json()) as { results?: GeocodeHit[] };
  return data.results ?? [];
}

export async function reverseBakuAddress(lat: number, lng: number): Promise<string> {
  try {
    const url = new URL('https://photon.komoot.io/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('lang', 'default');
    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const data = (await response.json()) as { features?: PhotonFeature[] };
      const props = data.features?.[0]?.properties;
      if (props) {
        const line = formatPhotonProps(props);
        if (line.length >= 3) return line;
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const proxied = new URL('/api/geocode/reverse', window.location.origin);
    proxied.searchParams.set('lat', String(lat));
    proxied.searchParams.set('lng', String(lng));
    const response = await fetch(proxied.toString(), { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const data = (await response.json()) as { label?: string };
      if (data.label) return data.label;
    }
  } catch {
    /* ignore */
  }

  return `Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}