import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, Loader } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'
import { searchLocation, reverseGeocode } from '../lib/geocode'

type LocationData = {
  latitude: number
  longitude: number
  address: string
  city: string
  state: string
}

type Props = {
  value: LocationData | null
  onChange: (data: LocationData) => void
  error?: string
}

export function LocationPicker({ value, onChange, error }: Props) {
  const [searchInput, setSearchInput] = useState('')
  const [results, setResults] = useState<Array<{ lat: number; lng: number; display_name: string }>>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(searchInput, 400)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    searchLocation(debouncedSearch).then((res) => {
      const mapped = res.map((r) => ({
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        display_name: r.display_name,
      }))
      setResults(mapped)
      setShowResults(true)
      setSearching(false)
      if (mapped.length > 0) {
        const first = mapped[0]
        onChange({ latitude: first.lat, longitude: first.lng, address: first.display_name, city: '', state: '' })
        reverseGeocode(first.lat, first.lng).then((geo) => {
          if (geo) {
            onChange({
              latitude: first.lat,
              longitude: first.lng,
              address: geo.display_name,
              city: geo.city ?? '',
              state: geo.state ?? '',
            })
          }
        })
      }
    })
  }, [debouncedSearch])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleMapClick(lat: number, lng: number) {
    setGeocoding(true)
    const result = await reverseGeocode(lat, lng)
    if (result) {
      onChange({
        latitude: lat,
        longitude: lng,
        address: result.display_name,
        city: result.city ?? '',
        state: result.state ?? '',
      })
    }
    setGeocoding(false)
  }

  function handleResultClick(r: { lat: number; lng: number; display_name: string }) {
    onChange({ latitude: r.lat, longitude: r.lng, address: r.display_name, city: '', state: '' })
    setSearchInput('')
    setShowResults(false)
    reverseGeocode(r.lat, r.lng).then((res) => {
      if (res) {
        onChange({
          latitude: r.lat,
          longitude: r.lng,
          address: res.display_name,
          city: res.city ?? '',
          state: res.state ?? '',
        })
      }
    })
  }

  const defaultCenter: [number, number] = value
    ? [value.latitude, value.longitude]
    : [40.7128, -74.006]

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Location</label>

      <div className="relative mb-3">
        <Navigation className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search for a city or address..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {searching && (
          <Loader className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}

        {showResults && results.length > 0 && (
          <div
            ref={resultsRef}
            className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-white shadow-lg"
          >
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleResultClick(r)}
                className="w-full px-3 py-2 text-left text-sm transition hover:bg-gray-50"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl border">
        {!mapReady && (
          <div className="flex h-64 items-center justify-center bg-gray-100">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        <div className={mapReady ? '' : 'hidden'}>
          <PickerMap
            value={value}
            center={defaultCenter}
            onMapClick={handleMapClick}
            onReady={() => setMapReady(true)}
          />
        </div>
      </div>

      {value && (
        <div className="mt-2 flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {value.address}
            {value.city && ` — ${value.city}`}
            {value.state && `, ${value.state}`}
          </span>
        </div>
      )}

      {geocoding && (
        <p className="mt-1 text-xs text-gray-500">Getting location details...</p>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function PickerMap({ value, center, onMapClick, onReady }: {
  value: LocationData | null
  center: [number, number]
  onMapClick: (lat: number, lng: number) => void
  onReady: () => void
}) {
  const [RL, setRL] = useState<typeof import('react-leaflet') | null>(null)

  useEffect(() => {
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
    ]).then(([L, RL]) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setRL(RL)
    })
  }, [])

  if (!RL) return null

  const { MapContainer, TileLayer, Marker, useMapEvents, useMap } = RL

  function MapClickHandler({ onMapClick: onClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
      click(e: any) {
        onClick(e.latlng.lat, e.latlng.lng)
      },
    })
    return null
  }

  function FlyTo({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap()
    useEffect(() => {
      map.flyTo([lat, lng], map.getZoom())
    }, [lat, lng, map])
    return null
  }

  return (
    <MapContainer
      center={center}
      zoom={value ? 14 : 3}
      className="z-0 h-64 w-full"
      whenReady={() => onReady()}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />
      {value && (
        <>
          <FlyTo lat={value.latitude} lng={value.longitude} />
          <Marker
            position={[value.latitude, value.longitude]}
            draggable={true}
            eventHandlers={{
              dragend: (e: any) => {
                const marker = e.target
                const pos = marker.getLatLng()
                onMapClick(pos.lat, pos.lng)
              },
            }}
          />
        </>
      )}
    </MapContainer>
  )
}
