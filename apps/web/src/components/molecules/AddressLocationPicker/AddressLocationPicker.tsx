import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_DEPARTAMENTO,
  listDepartamentos,
  listMunicipios,
  matchDepartamento,
  matchMunicipio,
} from '@/features/geo/colombia';
import {
  buscarDirecciones,
  CHOCO_BIAS,
  type GeoSuggestion,
  reverseGeocode,
} from '@/features/geo/photon';

// Vite no resuelve bien los iconos por defecto de Leaflet.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export type AddressLocationValue = {
  departamento: string;
  municipio: string;
  direccion: string;
  lat: number | null;
  lng: number | null;
};

type Props = {
  value: AddressLocationValue;
  onChange: (next: AddressLocationValue) => void;
  mapPosition?: 'above' | 'below';
  /** Try browser geolocation once when there are no coordinates yet. */
  autoGeolocate?: boolean;
};

async function applyLatLng(
  lat: number,
  lng: number,
  current: AddressLocationValue,
  options?: { keepDireccion?: boolean },
): Promise<AddressLocationValue> {
  try {
    const hit = await reverseGeocode(lat, lng);
    if (hit) {
      const departamento =
        matchDepartamento(hit.departamento) || current.departamento || DEFAULT_DEPARTAMENTO;
      const municipio =
        matchMunicipio(departamento, hit.municipio) || hit.municipio || current.municipio;
      return {
        departamento,
        municipio,
        direccion: options?.keepDireccion && current.direccion.trim()
          ? current.direccion
          : hit.direccion || current.direccion,
        lat,
        lng,
      };
    }
  } catch {
    // Keep coordinates even if reverse geocoding fails.
  }
  return { ...current, lat, lng };
}

export function AddressLocationPicker({
  value,
  onChange,
  mapPosition = 'above',
  autoGeolocate = true,
}: Props) {
  const { t } = useTranslation();
  const listId = useId();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const geoTriedRef = useRef(false);
  const skipViewRef = useRef(false);

  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'pending' | 'denied' | 'error' | 'ok'>(
    'idle',
  );

  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const departamentos = listDepartamentos();
  const municipios = listMunicipios(value.departamento);

  async function placeAt(lat: number, lng: number, keepDireccion = false) {
    const next = await applyLatLng(lat, lng, valueRef.current, { keepDireccion });
    onChangeRef.current(next);
  }

  function ensureMarker(map: L.Map, lat: number, lng: number) {
    const latLng: L.LatLngExpression = [lat, lng];
    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
      return markerRef.current;
    }

    const marker = L.marker(latLng, { draggable: true, autoPan: true }).addTo(map);
    marker.on('dragstart', () => {
      skipViewRef.current = true;
    });
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      void placeAt(pos.lat, pos.lng, true).finally(() => {
        skipViewRef.current = false;
      });
    });
    markerRef.current = marker;
    return marker;
  }

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const map = L.map(mapEl.current, {
      center: [value.lat ?? CHOCO_BIAS.lat, value.lng ?? CHOCO_BIAS.lng],
      zoom: value.lat != null ? 16 : 8,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (event) => {
      const { lat, lng } = event.latlng;
      ensureMarker(map, lat, lng);
      void placeAt(lat, lng, true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: map instance must not remount on each keystroke
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    window.setTimeout(() => map.invalidateSize(), 0);

    if (value.lat == null || value.lng == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    ensureMarker(map, value.lat, value.lng);
    if (!skipViewRef.current) {
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16));
    }
  }, [value.lat, value.lng]);

  function locateMe(fromAuto: boolean) {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }

    setGeoStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const map = mapRef.current;
        if (map) ensureMarker(map, lat, lng);
        void placeAt(lat, lng, false).then(() => setGeoStatus('ok'));
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
        if (!fromAuto) {
          // Manual retry already surfaced via geoStatus.
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  // Auto-locate once for new forms (no coordinates yet).
  useEffect(() => {
    if (!autoGeolocate || geoTriedRef.current) return;
    if (value.lat != null && value.lng != null) {
      geoTriedRef.current = true;
      return;
    }
    geoTriedRef.current = true;
    locateMe(true);
    // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot geolocation when the form has no coords yet
  }, [autoGeolocate]);

  useEffect(() => {
    const q = value.direccion.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }

    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      setBuscando(true);
      setSearchError(null);
      const bias =
        value.lat != null && value.lng != null
          ? { lat: value.lat, lng: value.lng }
          : CHOCO_BIAS;
      void buscarDirecciones(q, ctrl.signal, bias)
        .then((rows) => {
          setSuggestions(rows);
          setOpen(rows.length > 0);
          if (rows.length === 0) setSearchError(t('address.noResults'));
        })
        .catch((err: unknown) => {
          if (ctrl.signal.aborted) return;
          setSuggestions([]);
          setSearchError(err instanceof Error ? err.message : t('address.searchFailed'));
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setBuscando(false);
        });
    }, 320);

    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [value.direccion, value.lat, value.lng, t]);

  useEffect(() => {
    function onDocPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, []);

  function applySuggestion(hit: GeoSuggestion) {
    const departamento =
      matchDepartamento(hit.departamento) || value.departamento || DEFAULT_DEPARTAMENTO;
    const municipio = matchMunicipio(departamento, hit.municipio) || hit.municipio;
    onChange({
      departamento,
      municipio,
      direccion: hit.direccion,
      lat: hit.lat,
      lng: hit.lng,
    });
    setSuggestions([]);
    setOpen(false);
    setSearchError(null);
  }

  function onDepartamentoChange(next: string) {
    onChange({
      ...value,
      departamento: next,
      municipio: '',
    });
  }

  function onMunicipioChange(next: string) {
    onChange({ ...value, municipio: next });
    if (!next || !value.departamento) return;

    void buscarDirecciones(`${next}, ${value.departamento}, Colombia`)
      .then((rows) => {
        const hit = rows[0];
        if (!hit) return;
        const current = valueRef.current;
        onChangeRef.current({
          ...current,
          municipio: next,
          lat: hit.lat,
          lng: hit.lng,
        });
      })
      .catch(() => {
        // Optional map bias; ignore failures.
      });
  }

  const geoHint =
    geoStatus === 'pending'
      ? t('address.geoPending')
      : geoStatus === 'denied'
        ? t('address.geoDenied')
        : geoStatus === 'error'
          ? t('address.geoError')
          : t('address.mapHint');

  const mapBlock = (
    <div className="field">
      <div className="address-map-toolbar">
        <span>{t('address.mapLabel')}</span>
        <button
          type="button"
          className="linkish"
          disabled={geoStatus === 'pending'}
          onClick={() => locateMe(false)}
        >
          {geoStatus === 'pending' ? t('address.geoPending') : t('address.useMyLocation')}
        </button>
      </div>
      <div
        ref={mapEl}
        className="address-map"
        role="img"
        aria-label={t('address.mapLabel')}
      />
      <span className="muted">{geoHint}</span>
    </div>
  );

  return (
    <div className="address-picker" ref={wrapRef}>
      {mapPosition === 'above' ? mapBlock : null}

      <label className="field">
        {t('address.departamento')}
        <select
          value={value.departamento}
          onChange={(e) => onDepartamentoChange(e.target.value)}
        >
          <option value="">{t('address.departamentoPlaceholder')}</option>
          {departamentos.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        {t('address.municipio')}
        <select
          value={value.municipio}
          disabled={!value.departamento}
          onChange={(e) => onMunicipioChange(e.target.value)}
        >
          <option value="">
            {value.departamento
              ? t('address.municipioPlaceholder')
              : t('address.municipioNeedsDepartamento')}
          </option>
          {municipios.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="field address-suggest">
        <label htmlFor={listId}>{t('address.direccion')}</label>
        <div className="address-suggest-control">
          <input
            id={listId}
            type="search"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            value={value.direccion}
            placeholder={t('address.direccionPlaceholder')}
            onChange={(e) => {
              onChange({ ...value, direccion: e.target.value });
              setOpen(true);
            }}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
          />
          {open && suggestions.length > 0 ? (
            <ul id={`${listId}-list`} role="listbox" className="address-suggest-list">
              {suggestions.map((hit) => (
                <li key={hit.id} role="option">
                  <button
                    type="button"
                    className="address-suggest-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(hit)}
                  >
                    {hit.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {buscando ? (
          <span className="muted">{t('address.searching')}</span>
        ) : searchError ? (
          <span className="muted" role="status">
            {searchError}
          </span>
        ) : (
          <span className="muted">{t('address.searchHint')}</span>
        )}
      </div>

      {value.lat != null && value.lng != null ? (
        <p className="muted">
          {t('address.coords', { lat: value.lat.toFixed(5), lng: value.lng.toFixed(5) })}
        </p>
      ) : null}

      {mapPosition === 'below' ? mapBlock : null}
    </div>
  );
}
