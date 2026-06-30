const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'

export type GeocodeResult = {
  lat: string
  lon: string
  display_name: string
  city?: string
  state?: string
}

export async function searchLocation(query: string): Promise<GeocodeResult[]> {
  const res = await fetch(
    `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  )
  if (!res.ok) return []

  const data = await res.json()
  return data.map((item: any) => ({
    lat: item.lat,
    lon: item.lon,
    display_name: item.display_name,
    city: item.address?.city ?? item.address?.town ?? item.address?.village ?? item.address?.county,
    state: item.address?.state,
  }))
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodeResult | null> {
  const res = await fetch(
    `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  )
  if (!res.ok) return null

  const data = await res.json()
  return {
    lat: data.lat,
    lon: data.lon,
    display_name: data.display_name ?? '',
    city: data.address?.city ?? data.address?.town ?? data.address?.village ?? data.address?.county,
    state: data.address?.state,
  }
}
