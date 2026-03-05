import { WikidataItem } from '@/types/events'

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
 * Query Wikidata for historical events near a location using the native
 * wikibase:around geo-search service for reliable proximity filtering.
 */
export async function queryNearbyEvents(
  lat: number,
  lng: number,
  radiusKm: number,
  startYear: number,
  endYear: number
): Promise<WikidataItem[]> {
  const sparqlQuery = `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?coord ?wikipediaUrl WHERE {
      SERVICE wikibase:around {
        ?item wdt:P625 ?coord .
        bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral .
        bd:serviceParam wikibase:radius "${radiusKm}" .
      }

      # Get dates - union of common date properties
      {
        { ?item wdt:P585 ?date }
        UNION
        { ?item wdt:P580 ?date }
        UNION
        { ?item wdt:P571 ?date }
      }

      # Temporal filtering
      FILTER(YEAR(?date) >= ${startYear} && YEAR(?date) <= ${endYear})

      # Get English Wikipedia article URL
      OPTIONAL {
        ?wikipediaUrl schema:about ?item ;
                      schema:isPartOf <https://en.wikipedia.org/> .
      }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
    }
    LIMIT 200
  `

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Places-History-App/1.0',
      'Accept': 'application/sparql-results+json'
    },
    signal: AbortSignal.timeout(30000)
  })

  if (!response.ok) {
    const status = response.status
    if (status === 429) throw new Error('Wikidata rate limit exceeded - please wait before retrying')
    if (status === 500) throw new Error('Wikidata server error - query may be too complex')
    throw new Error(`Wikidata query failed: ${status}`)
  }

  const data = await response.json()
  if (!data.results?.bindings) return []

  return parseWikidataResults(data.results.bindings, lat, lng)
}

/**
 * Parse raw SPARQL bindings into WikidataItem objects with calculated distances.
 */
function parseWikidataResults(
  bindings: Record<string, { value: string; datatype?: string } | undefined>[],
  centerLat: number,
  centerLng: number
): WikidataItem[] {
  const seen = new Set<string>()

  const items: WikidataItem[] = []

  for (const binding of bindings) {
    const itemUri = binding.item?.value || ''

    // Deduplicate (UNION can produce multiple rows per item)
    if (seen.has(itemUri)) continue
    seen.add(itemUri)

    // Extract coordinates from WKT Point literal
    const coordStr = binding.coord?.value || ''
    const match = coordStr.match(/Point\(([^ ]+) ([^)]+)\)/)
    if (!match) continue

    const itemLng = parseFloat(match[1])
    const itemLat = parseFloat(match[2])
    if (isNaN(itemLat) || isNaN(itemLng)) continue

    const distance = calculateDistance(centerLat, centerLng, itemLat, itemLng)

    // Wikipedia URL - only English
    let wikipediaUrl: { value: string } | undefined
    if (binding.wikipediaUrl?.value?.includes('en.wikipedia.org')) {
      wikipediaUrl = { value: binding.wikipediaUrl.value }
    }

    items.push({
      item: { value: itemUri },
      itemLabel: { value: binding.itemLabel?.value || 'Unknown' },
      itemDescription: binding.itemDescription?.value
        ? { value: binding.itemDescription.value }
        : undefined,
      date: { value: formatDate(binding.date?.value) },
      lat: { value: String(itemLat) },
      lng: { value: String(itemLng) },
      distance: { value: String(distance) },
      wikipediaUrl,
      imageUrl: undefined
    })
  }

  return items
    .sort((a, b) => parseFloat(a.distance!.value) - parseFloat(b.distance!.value))
    .slice(0, 100)
}

/**
 * Format a Wikidata date string into YYYY-MM-DD or a readable fallback.
 */
function formatDate(raw?: string): string {
  if (!raw) return 'Unknown date'
  try {
    if (raw.includes('T')) {
      const d = new Date(raw)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    }
    if (raw.includes('-')) return raw.split('T')[0]
    return raw
  } catch {
    return raw
  }
}
