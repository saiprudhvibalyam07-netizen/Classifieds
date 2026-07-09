import { MapPin, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

type Props = {
  latitude: number
  longitude: number
  title: string
  address: string | null
}

export function ListingMap({ latitude, longitude, title, address }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
    setMounted(true)
  }, [])

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <MapPin className="h-4 w-4" />
        Location
      </div>
      {address && <p className="mb-3 text-sm text-gray-600">{address}</p>}
      <div className="overflow-hidden rounded-xl shadow-sm">
        {mounted && <MapInner lat={latitude} lng={longitude} title={title} />}
      </div>
      <a
        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
      >
        <ExternalLink className="h-4 w-4" />
        Open in Google Maps
      </a>
    </div>
  )
}

function MapInner({ lat, lng, title }: { lat: number; lng: number; title: string }) {
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

  const { MapContainer, TileLayer, Marker, Popup } = RL
  const position = [lat, lng] as [number, number]

  return (
    <MapContainer
      center={position}
      zoom={14}
      scrollWheelZoom={false}
      className="z-0 h-64 w-full"
      key={`${lat}-${lng}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>{title}</Popup>
      </Marker>
    </MapContainer>
  )
}
