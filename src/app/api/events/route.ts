import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { EventsResponse, EventFeature } from '@/types/events'
import { queryNearbyEvents, calculateDistance } from '@/lib/wikidata'
import { DEFAULT_RADIUS_KM } from '@/lib/config'

/**
 * Cached wrapper around the Wikidata query (1-hour TTL).
 */
function cachedQuery(lat: number, lng: number, radius: number, startYear: number, endYear: number) {
  const fn = unstable_cache(
    () => queryNearbyEvents(lat, lng, radius, startYear, endYear),
    ['wikidata-events', `${lat}`, `${lng}`, `${radius}`, `${startYear}`, `${endYear}`],
    { revalidate: 3600, tags: ['wikidata'] }
  )
  return fn()
}

/**
 * Convert Wikidata items to a GeoJSON FeatureCollection.
 */
function toGeoJSON(
  items: Awaited<ReturnType<typeof queryNearbyEvents>>,
  centerLat: number,
  centerLng: number,
  radius: number
): EventsResponse {
  const features: EventFeature[] = []

  for (const item of items) {
    const lat = parseFloat(item.lat.value)
    const lng = parseFloat(item.lng.value)
    if (isNaN(lat) || isNaN(lng)) continue

    const distance = item.distance ? parseFloat(item.distance.value) : calculateDistance(centerLat, centerLng, lat, lng)
    if (distance > radius) continue

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id: item.item.value,
        label: item.itemLabel.value,
        description: item.itemDescription?.value,
        date: item.date.value,
        distance,
        wikipediaUrl: item.wikipediaUrl?.value,
        imageUrl: item.imageUrl?.value
      }
    })
  }

  return { type: 'FeatureCollection', features }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('r') || DEFAULT_RADIUS_KM.toString())
    const startYear = parseInt(searchParams.get('startYear') || '1500')
    const endYear = parseInt(searchParams.get('endYear') || String(new Date().getFullYear()))

    // Validate
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return NextResponse.json({ error: 'Invalid parameters. lat, lng, and r must be valid numbers.' }, { status: 400 })
    }
    if (isNaN(startYear) || isNaN(endYear)) {
      return NextResponse.json({ error: 'Invalid year parameters.' }, { status: 400 })
    }
    if (startYear > endYear) {
      return NextResponse.json({ error: 'startYear must be <= endYear.' }, { status: 400 })
    }
    if (radius < 1 || radius > 500) {
      return NextResponse.json({ error: 'Radius must be between 1 and 500 km.' }, { status: 400 })
    }

    const items = await cachedQuery(lat, lng, radius, startYear, endYear)
    const geoJSON = toGeoJSON(items, lat, lng, radius)
    return NextResponse.json(geoJSON)
  } catch (error) {
    console.error('API error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch historical events'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
