import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { EventsResponse, WikidataItem } from '@/types/events'

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Query Wikidata for historical events near a location
 * Uses SPARQL SERVICE wikibase:around to find items within radius
 */
async function queryWikidata(lat: number, lng: number, radius: number): Promise<WikidataItem[]> {
  const sparqlQuery = `
    SELECT ?item ?itemLabel ?itemDescription ?date ?lat ?lng ?distance WHERE {
      SERVICE wikibase:around {
        ?item wdt:P625 ?location .
        bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral .
        bd:serviceParam wikibase:radius "${radius}" .
        bd:serviceParam wikibase:distance ?distance .
      }
      
      # Filter for items with time properties (P585 = point in time, P580 = start time)
      FILTER(EXISTS { ?item wdt:P585 [] } || EXISTS { ?item wdt:P580 [] })
      
      # Get coordinates using proper SPARQL functions
      BIND(xsd:decimal(strbefore(strafter(str(?location), "Point("), " ")) AS ?lng)
      BIND(xsd:decimal(strbefore(strafter(strafter(str(?location), "Point("), " "), ")")) AS ?lat)
      
      # Get date (prefer P585 over P580)
      OPTIONAL { ?item wdt:P585 ?date }
      OPTIONAL { ?item wdt:P580 ?startDate }
      BIND(COALESCE(?date, ?startDate) AS ?date)
      
      # Get label and description
      OPTIONAL { ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en") }
      OPTIONAL { ?item schema:description ?itemDescription . FILTER(LANG(?itemDescription) = "en") }
      
      # Ensure we have valid coordinates
      FILTER(BOUND(?lat) && BOUND(?lng))
      FILTER(?distance <= ${radius})
    }
    ORDER BY ?distance
    LIMIT 50
  `

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`
  
  console.log('Main Wikidata query URL:', url)
  console.log('Query parameters:', { lat, lng, radius })
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Places-History-App/1.0 (https://github.com/your-repo)',
        'Accept': 'application/sparql-results+json'
      }
    })

    if (!response.ok) {
      throw new Error(`Wikidata query failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('Main Wikidata query response:', data)
    return data.results.bindings.map((binding: Record<string, { value: string } | undefined>) => ({
      item: { value: binding.item?.value || '' },
      itemLabel: { value: binding.itemLabel?.value || 'Unknown' },
      itemDescription: binding.itemDescription ? { value: binding.itemDescription.value } : undefined,
      date: { value: binding.date?.value || '' },
      lat: { value: binding.lat?.value || '0' },
      lng: { value: binding.lng?.value || '0' },
      distance: binding.distance ? { value: binding.distance.value } : undefined
    }))
  } catch (error) {
    console.error('Wikidata query error:', error)
    throw new Error('Failed to query historical events')
  }
}

/**
 * Alternative query using simpler approach without wikibase:around service
 */
async function queryWikidataSimple(lat: number, lng: number, radius: number): Promise<WikidataItem[]> {
  const sparqlQuery = `
    SELECT ?item ?itemLabel ?itemDescription ?date ?lat ?lng WHERE {
      ?item wdt:P625 ?location .
      
      # Filter for items with time properties
      FILTER(EXISTS { ?item wdt:P585 [] } || EXISTS { ?item wdt:P580 [] })
      
      # Extract coordinates
      BIND(xsd:decimal(strbefore(strafter(str(?location), "Point("), " ")) AS ?lng)
      BIND(xsd:decimal(strbefore(strafter(strafter(str(?location), "Point("), " "), ")")) AS ?lat)
      
      # Get date
      OPTIONAL { ?item wdt:P585 ?date }
      OPTIONAL { ?item wdt:P580 ?startDate }
      BIND(COALESCE(?date, ?startDate) AS ?date)
      
      # Get label and description
      OPTIONAL { ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en") }
      OPTIONAL { ?item schema:description ?itemDescription . FILTER(LANG(?itemDescription) = "en") }
      
      # Ensure we have valid coordinates
      FILTER(BOUND(?lat) && BOUND(?lng))
    }
    LIMIT 100
  `

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`
  
  console.log('Simple Wikidata query URL:', url)
  console.log('Simple query parameters:', { lat, lng, radius })
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Places-History-App/1.0 (https://github.com/your-repo)',
        'Accept': 'application/sparql-results+json'
      }
    })

    if (!response.ok) {
      throw new Error(`Wikidata query failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('Simple Wikidata query response:', data)
    
    const items = data.results.bindings.map((binding: Record<string, { value: string } | undefined>) => ({
      item: { value: binding.item?.value || '' },
      itemLabel: { value: binding.itemLabel?.value || 'Unknown' },
      itemDescription: binding.itemDescription ? { value: binding.itemDescription.value } : undefined,
      date: { value: binding.date?.value || '' },
      lat: { value: binding.lat?.value || '0' },
      lng: { value: binding.lng?.value || '0' },
      distance: undefined // Will be calculated later
    }))
    
    // Filter by distance manually
    return items.filter((item: WikidataItem) => {
      const itemLat = parseFloat(item.lat.value)
      const itemLng = parseFloat(item.lng.value)
      const distance = calculateDistance(lat, lng, itemLat, itemLng)
      return distance <= radius
    }).slice(0, 50)
  } catch (error) {
    console.error('Simple Wikidata query error:', error)
    throw new Error('Failed to query historical events')
  }
}

/**
 * Debug function to test basic Wikidata connectivity
 */
async function testWikidataConnection(): Promise<void> {
  const testQuery = `
    SELECT ?item ?itemLabel WHERE {
      ?item wdt:P31 wd:Q5 .
      ?item wdt:P625 ?location .
      ?item rdfs:label ?itemLabel .
      FILTER(LANG(?itemLabel) = "en")
    }
    LIMIT 5
  `
  
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(testQuery)}&format=json`
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Places-History-App/1.0 (https://github.com/your-repo)',
        'Accept': 'application/sparql-results+json'
      }
    })
    
    if (!response.ok) {
      console.error('Wikidata connection test failed:', response.status)
      return
    }
    
    const data = await response.json()
    console.log('Wikidata connection test successful, found', data.results.bindings.length, 'results')
  } catch (error) {
    console.error('Wikidata connection test error:', error)
  }
}

/**
 * Convert Wikidata items to GeoJSON features
 */
function convertToGeoJSON(items: WikidataItem[], centerLat: number, centerLng: number): EventsResponse {
  const features = items.map((item) => {
    const lat = parseFloat(item.lat.value)
    const lng = parseFloat(item.lng.value)
    const distance = item.distance ? parseFloat(item.distance.value) : 
      calculateDistance(centerLat, centerLng, lat, lng)

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [lng, lat] as [number, number]
      },
      properties: {
        id: item.item.value,
        label: item.itemLabel.value,
        description: item.itemDescription?.value,
        date: item.date.value,
        distance
      }
    }
  })

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Cached version of the Wikidata query with 1-hour cache
 */
const cachedQueryWikidata = unstable_cache(
  queryWikidata,
  ['wikidata-events'],
  {
    revalidate: 3600, // 1 hour
    tags: ['wikidata']
  }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseInt(searchParams.get('r') || '80')

    // Validate parameters
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return NextResponse.json(
        { error: 'Invalid parameters. lat, lng, and r must be valid numbers.' },
        { status: 400 }
      )
    }

    if (radius > 500) {
      return NextResponse.json(
        { error: 'Radius too large. Maximum allowed is 500km.' },
        { status: 400 }
      )
    }

    // Test Wikidata connection first
    await testWikidataConnection()

    // Query Wikidata with caching
    let items = await cachedQueryWikidata(lat, lng, radius)
    
    // If no results, try the simple query as fallback
    if (items.length === 0) {
      console.log('No results from main query, trying simple query...')
      items = await queryWikidataSimple(lat, lng, radius)
    }
    
    // Convert to GeoJSON
    const geoJSON = convertToGeoJSON(items, lat, lng)

    return NextResponse.json(geoJSON)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical events' },
      { status: 500 }
    )
  }
} 