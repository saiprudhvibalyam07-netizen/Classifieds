import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { MapPin, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { LatLngExpression } from 'leaflet'

type Props = {
  latitude: number
  longitude: number
  title: string
  address: string | null
}

export function ListingMap({ latitude, longitude, title, address }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const position: LatLngExpression = [latitude, longitude]

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <MapPin className="h-4 w-4" />
        Location
      </div>

      {address && (
        <p className="mb-3 text-sm text-gray-600">{address}</p>
      )}

      <div className="overflow-hidden rounded-xl shadow-sm">
        {mounted && (
          <MapContainer
            center={position}
            zoom={14}
            scrollWheelZoom={false}
            className="z-0 h-64 w-full"
            key={`${latitude}-${longitude}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position}>
              <Popup>{title}</Popup>
            </Marker>
          </MapContainer>
        )}
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
