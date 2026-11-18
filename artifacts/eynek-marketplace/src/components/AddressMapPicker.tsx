import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

const BAKU_CENTER: L.LatLngExpression = [40.4093, 49.8671];
const BAKU_BOUNDS = L.latLngBounds([40.28, 49.72], [40.58, 50.12]);

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type AddressMapValue = {
  lat: number;
  lng: number;
};

type Props = {
  value: AddressMapValue | null;
  onChange: (value: AddressMapValue) => void;
  onSuggestAddress?: (line: string) => void;
  disabled?: boolean;
};

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('accept-language', 'az,en');
    url.searchParams.set('zoom', '18');
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { display_name?: string; address?: Record<string, string> };
    if (!data.display_name) return null;
    const a = data.address;
    if (a) {
      const parts = [
        a.road,
        a.house_number ? `bina ${a.house_number}` : '',
        a.suburb || a.neighbourhood,
        a.city_district,
      ].filter(Boolean);
      if (parts.length >= 2) return parts.join(', ');
    }
    const short = data.display_name.split(',').slice(0, 4).join(', ');
    return short;
  } catch {
    return null;
  }
}

export function AddressMapPicker({ value, onChange, onSuggestAddress, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const placeMarker = useCallback(
    (lat: number, lng: number, suggest = true) => {
      if (!mapRef.current) return;
      const latLng = L.latLng(lat, lng);
      if (markerRef.current) {
        markerRef.current.setLatLng(latLng);
      } else {
        markerRef.current = L.marker(latLng, { icon: defaultIcon, draggable: !disabled }).addTo(mapRef.current);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current?.getLatLng();
          if (!pos) return;
          onChange({ lat: pos.lat, lng: pos.lng });
          void reverseGeocode(pos.lat, pos.lng).then((line) => {
            if (line && onSuggestAddress) onSuggestAddress(line);
          });
        });
      }
      onChange({ lat, lng });
      if (suggest) {
        void reverseGeocode(lat, lng).then((line) => {
          if (line && onSuggestAddress) onSuggestAddress(line);
        });
      }
    },
    [disabled, onChange, onSuggestAddress],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: value ? [value.lat, value.lng] : BAKU_CENTER,
      zoom: value ? 16 : 12,
      minZoom: 11,
      maxBounds: BAKU_BOUNDS,
      maxBoundsViscosity: 0.85,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (event) => {
      if (disabled) return;
      placeMarker(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;

    if (value) placeMarker(value.lat, value.lng, false);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- init once

  useEffect(() => {
    if (!mapRef.current) return;
    if (disabled) {
      mapRef.current.dragging.disable();
      mapRef.current.doubleClickZoom.disable();
      markerRef.current?.dragging?.disable();
    } else {
      mapRef.current.dragging.enable();
      mapRef.current.doubleClickZoom.enable();
      markerRef.current?.dragging?.enable();
    }
  }, [disabled]);

  const runSearch = async () => {
    const q = search.trim();
    if (q.length < 3) {
      setSearchError('Ən azı 3 hərf yazın.');
      return;
    }
    setSearchError('');
    setSearching(true);
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'json');
      url.searchParams.set('q', `${q}, Bakı, Azərbaycan`);
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'az');
      url.searchParams.set('bounded', '1');
      url.searchParams.set('viewbox', '49.72,40.58,50.12,40.28');
      const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      const rows = (await response.json()) as { lat: string; lon: string; display_name: string }[];
      if (!rows.length) {
        setSearchError('Nəticə tapılmadı. Xəritədə nöqtə qoyun.');
        return;
      }
      const hit = rows[0];
      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      mapRef.current?.setView([lat, lng], 17, { animate: true });
      placeMarker(lat, lng, false);
      if (onSuggestAddress) onSuggestAddress(hit.display_name.split(',').slice(0, 4).join(', '));
    } catch {
      setSearchError('Axtarış mümkün olmadı. Xəritədə nöqtə seçin.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="address-map-picker" data-testid="address-map-picker">
      <label className="address-map-label" htmlFor="address-map-search">
        Xəritədə ünvan
      </label>
      <p className="address-map-hint">Bakı xəritəsində çatdırılma nöqtəsini seçin; markeri sürükləyə və ya ünvana klik edə bilərsiniz.</p>
      <div className="address-map-search">
        <input
          id="address-map-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void runSearch();
            }
          }}
          placeholder="Məsələn: Nizami küçəsi 203"
          disabled={disabled}
          data-testid="input-address-map-search"
        />
        <button type="button" className="btn btn-secondary address-map-search-btn" onClick={() => void runSearch()} disabled={disabled || searching}>
          {searching ? 'Axtarılır...' : 'Tap'}
        </button>
      </div>
      {searchError ? <p className="address-map-error">{searchError}</p> : null}
      <div
        ref={containerRef}
        className="address-map-canvas"
        role="application"
        aria-label="Bakı ünvan xəritəsi"
        data-testid="address-map-canvas"
      />
      {value ? (
        <p className="address-map-coords" data-testid="address-map-coords">
          Seçilmiş nöqtə: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      ) : (
        <p className="address-map-coords address-map-coords--muted">Hələ nöqtə seçilməyib.</p>
      )}
    </div>
  );
}