import { useCallback, useEffect, useId, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Search } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { type GeocodeHit, reverseBakuAddress, searchBakuAddress } from '@/lib/bakuGeocode';

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

function suggestLines(hit: GeocodeHit) {
  const label = hit.label.replace(/\s*\\\s*/g, ', ').trim();
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { title: label, sub: hit.source === 'local' ? 'Metro' : 'Ünvan' };
  return { title: parts[0], sub: parts.slice(1, 3).join(', ') };
}

export function AddressMapPicker({ value, onChange, onSuggestAddress, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  const onSuggestRef = useRef(onSuggestAddress);
  const listId = useId();
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    onChangeRef.current = onChange;
    onSuggestRef.current = onSuggestAddress;
  }, [onChange, onSuggestAddress]);

  const applyCoords = useCallback((lat: number, lng: number, suggest = true) => {
    if (!mapRef.current) return;
    const latLng = L.latLng(lat, lng);
    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
    } else {
      markerRef.current = L.marker(latLng, { icon: defaultIcon, draggable: !disabled }).addTo(mapRef.current);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current?.getLatLng();
        if (!pos) return;
        onChangeRef.current({ lat: pos.lat, lng: pos.lng });
        void reverseBakuAddress(pos.lat, pos.lng).then((line) => {
          if (line && onSuggestRef.current) onSuggestRef.current(line);
        });
      });
    }
    onChangeRef.current({ lat, lng });
    mapRef.current.setView(latLng, Math.max(mapRef.current.getZoom(), 16), { animate: true });
    if (suggest) {
      void reverseBakuAddress(lat, lng).then((line) => {
        if (line && onSuggestRef.current) onSuggestRef.current(line);
      });
    }
  }, [disabled]);

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
      setOpen(false);
      setResults([]);
      applyCoords(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;

    if (value) applyCoords(value.lat, value.lng, false);

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

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError('');
      return undefined;
    }
    setSearching(true);
    const handle = window.setTimeout(() => {
      void searchBakuAddress(q, 5).then((hits) => {
        setResults(hits);
        setActiveIndex(0);
        setSearching(false);
        if (!hits.length) setSearchError('Tapılmadı — xəritədə nöqtə qoyun.');
        else setSearchError('');
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!searchWrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pickResult = (hit: GeocodeHit) => {
    setOpen(false);
    setResults([]);
    setSearch(hit.label);
    setSearchError('');
    applyCoords(hit.lat, hit.lng, false);
    onSuggestAddress?.(hit.label);
  };

  const pickActive = () => {
    const hit = results[activeIndex];
    if (hit) pickResult(hit);
    else if (search.trim().length >= 2 && results.length === 0) setSearchError('Tapılmadı — xəritədə nöqtə qoyun.');
  };

  return (
    <div className="address-map-picker" data-testid="address-map-picker">
      <label className="address-map-label" htmlFor="address-map-search">
        Çatdırılma nöqtəsi
      </label>

      <div className="address-map-search-wrap" ref={searchWrapRef}>
        <div className="address-map-search address-map-search--combo">
          <Search size={18} className="address-map-search-icon" aria-hidden />
          <input
            id="address-map-search"
            type="search"
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (results.length) setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                pickActive();
              } else if (event.key === 'Escape') {
                setOpen(false);
              }
            }}
            placeholder="20 yanvar metro, Nizami küç. 203..."
            disabled={disabled}
            data-testid="input-address-map-search"
          />
          {searching ? <span className="address-map-search-spinner" aria-hidden /> : null}
        </div>

        {open && results.length > 0 ? (
          <ul className="address-map-suggest" id={listId} role="listbox" data-testid="address-map-results">
            {results.map((hit, index) => {
              const { title, sub } = suggestLines(hit);
              return (
                <li key={`${hit.source}-${hit.lat}-${hit.lng}`} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    className={`address-map-suggest-item${index === activeIndex ? ' active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pickResult(hit)}
                    disabled={disabled}
                  >
                    <MapPin size={16} aria-hidden />
                    <span>
                      <strong>{title}</strong>
                      <small>{sub}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {searchError && !open ? <p className="address-map-error">{searchError}</p> : null}

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
        <p className="address-map-coords address-map-coords--muted">Xəritəyə klik edin və ya yuxarıdan ünvan seçin.</p>
      )}
    </div>
  );
}