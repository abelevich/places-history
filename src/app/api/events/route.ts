import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { EventsResponse, WikidataItem, EventFeature, CoordinatesResponse, CoordinatesFeature } from '@/types/events'
import { getEventImageUrl, getOptimizedImageUrl } from '@/lib/image-utils'
import { DEFAULT_RADIUS_KM } from '@/lib/config'

/**
 * KEY FIXES APPLIED TO RESOLVE GEOGRAPHIC FILTERING ISSUES:
 * 
 * 1. IMPROVED BOUNDING BOX CALCULATION:
 *    - Fixed longitude delta calculation using proper cosine of latitude
 *    - Added small buffer (0.1 degrees) to ensure all relevant results are captured
 *    - Improved coordinate validation in SPARQL queries
 * 
 * 2. STRICT DISTANCE FILTERING:
 *    - Enhanced distance calculation validation
 *    - Added detailed logging for items inside/outside radius
 *    - Improved coordinate parsing error handling
 * 
 * 3. BETTER SPARQL QUERY FILTERING:
 *    - Added strict bounding box filters to both main and simple queries
 *    - Increased result limits to 200 for better coverage
 *    - Added coordinate validation filters
 * 
 * 4. ENHANCED DEBUGGING:
 *    - Added comprehensive logging for bounding box calculations
 *    - Detailed distance filtering logs with visual indicators
 *    - Better error handling and validation
 * 
 * These fixes ensure that when searching for NYC (40.7128, -74.0060), 
 * results are actually within the specified radius instead of thousands of miles away.
 */

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
 * Uses improved bounding box filtering for geographic relevance and temporal filtering
 */
async function queryWikidata(lat: number, lng: number, radius: number, startYear: number, endYear: number): Promise<WikidataItem[]> {
  // Calculate bounding box coordinates with improved accuracy
  // 1 degree latitude ≈ 111.32 km (constant)
  const latDelta = radius / 111.32
  
  // 1 degree longitude varies by latitude: at equator ≈ 111.32 km, at poles ≈ 0 km
  // Use the cosine of latitude to adjust longitude delta
  const lngDelta = radius / (111.32 * Math.cos(Math.abs(lat) * Math.PI / 180))
  
  // Add a small buffer to ensure we capture all relevant results
  const buffer = 0.1 // 0.1 degree buffer
  const minLat = lat - latDelta - buffer
  const maxLat = lat + latDelta + buffer
  const minLng = lng - lngDelta - buffer
  const maxLng = lng + lngDelta + buffer
  
  console.log('Improved bounding box calculation:')
  console.log('  Center:', { lat, lng })
  console.log('  Radius:', radius, 'km')
  console.log('  Lat delta:', latDelta.toFixed(4), 'degrees')
  console.log('  Lng delta:', lngDelta.toFixed(4), 'degrees')
  console.log('  Bounding box:', { minLat: minLat.toFixed(4), maxLat: maxLat.toFixed(4), minLng: minLng.toFixed(4), maxLng: maxLng.toFixed(4) })
  
  // Query for items with coordinates - broader approach to find any items with locations
  const sparqlQuery = `
    SELECT ?item ?itemLabel ?date ?location ?wikipediaUrl ?instance ?lat ?lng WHERE {
      ?item wdt:P625 ?location .
      
      # Extract coordinates for geographic filtering
      BIND(REPLACE(str(?location), "^Point\\\\(([^ ]+) ([^)]+)\\\\)$", "$1") AS ?lngStr)
      BIND(REPLACE(str(?location), "^Point\\\\(([^ ]+) ([^)]+)\\\\)$", "$2") AS ?latStr)
      BIND(xsd:decimal(?lngStr) AS ?lng)
      BIND(xsd:decimal(?latStr) AS ?lat)
      
      # Geographic bounding box filtering - only include items within expanded area
      FILTER(?lat >= ${minLat} && ?lat <= ${maxLat})
      FILTER(?lng >= ${minLng} && ?lng <= ${maxLng})
      
      # Get some instances to help identify what kinds of things we're finding
      OPTIONAL { ?item wdt:P31 ?instance }
      
      # Get date (any date property) - more flexible date handling
      OPTIONAL { ?item wdt:P585 ?date }
      OPTIONAL { ?item wdt:P580 ?startDate }
      OPTIONAL { ?item wdt:P571 ?inception }
      OPTIONAL { ?item wdt:P582 ?endDate }
      BIND(COALESCE(?date, ?startDate, ?inception, ?endDate) AS ?date)
      
      # Temporal filtering - only include events within specified year range
      FILTER(BOUND(?date))
      FILTER(YEAR(?date) >= ${startYear})
      FILTER(YEAR(?date) <= ${endYear})
      
      # Get English label
      ?item rdfs:label ?itemLabel .
      FILTER(LANG(?itemLabel) = "en")
      
      # Get Wikipedia article URL (English only)
      OPTIONAL {
        ?wikipediaArticle schema:about ?item .
        ?wikipediaArticle schema:inLanguage "en" .
        FILTER(STRSTARTS(STR(?wikipediaArticle), "https://en.wikipedia.org/"))
        BIND(?wikipediaArticle AS ?wikipediaUrl)
      }
    }
    LIMIT 500
  `

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`
  
  console.log('Wikidata query URL:', url)
  console.log('Query parameters:', { lat, lng, radius })
  console.log('Bounding box:', { minLat, maxLat, minLng, maxLng })
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Places-History-App/1.0 (https://github.com/your-repo)',
        'Accept': 'application/sparql-results+json'
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Wikidata response error:', response.status, errorText)
      
      if (response.status === 500) {
        throw new Error('Wikidata server error - query may be too complex')
      } else if (response.status === 429) {
        throw new Error('Wikidata rate limit exceeded - please wait before retrying')
      } else {
        throw new Error(`Wikidata query failed: ${response.status} - ${errorText}`)
      }
    }

    const data = await response.json()
    console.log('Wikidata query response:', data)
    
    if (!data.results || !data.results.bindings) {
      console.warn('Unexpected Wikidata response format:', data)
      return []
    }
    
    const items = data.results.bindings.map((binding: Record<string, { value: string } | undefined>) => {
      // Use the coordinates from the SPARQL query, or extract manually if failed
      let itemLat = binding.lat?.value || '0'
      let itemLng = binding.lng?.value || '0'
      
      // If SPARQL extraction failed, try manual extraction
      if ((itemLat === '0' || itemLng === '0') && binding.location?.value) {
        const locationStr = binding.location.value
        const match = locationStr.match(/Point\(([^ ]+) ([^)]+)\)/)
        if (match) {
          itemLng = match[1]
          itemLat = match[2]
          console.log('Manual coordinate extraction for', binding.itemLabel?.value, ':', { lat: itemLat, lng: itemLng })
        }
      }
      
      console.log(`Main query: Item "${binding.itemLabel?.value}" at (${itemLat}, ${itemLng}) from SPARQL`)
      
      // Parse and format the date properly
      let formattedDate = 'Unknown date'
      if (binding.date?.value) {
        try {
          // Wikidata dates are typically in format like "1960-01-01T00:00:00Z"
          const dateStr = binding.date.value
          if (dateStr.includes('T')) {
            // ISO date format
            const date = new Date(dateStr)
            if (!isNaN(date.getTime())) {
              formattedDate = date.toISOString().split('T')[0] // YYYY-MM-DD format
            }
          } else if (dateStr.includes('-')) {
            // Just date part
            formattedDate = dateStr.split('T')[0]
          } else {
            formattedDate = dateStr
          }
        } catch (error) {
          console.log('Failed to parse date:', binding.date.value)
          formattedDate = binding.date.value
        }
      }
      
      // Filter Wikipedia URLs to only include English Wikipedia
      let wikipediaUrl = undefined
      if (binding.wikipediaUrl?.value && binding.wikipediaUrl.value.includes('en.wikipedia.org')) {
        wikipediaUrl = { value: binding.wikipediaUrl.value }
      }
      
      return {
        item: { value: binding.item?.value || '' },
        itemLabel: { value: binding.itemLabel?.value || 'Unknown' },
        itemDescription: undefined, // Simplified for now
        date: { value: formattedDate },
        lat: { value: itemLat },
        lng: { value: itemLng },
        distance: undefined, // Will be calculated later
        wikipediaUrl,
        imageUrl: undefined // Simplified for now
      }
    })
    
    // Filter by distance manually with strict radius enforcement
    const filteredItems = items
      .map((item: WikidataItem) => {
        const itemLat = parseFloat(item.lat.value)
        const itemLng = parseFloat(item.lng.value)
        if (isNaN(itemLat) || isNaN(itemLng)) {
          console.log('Skipping item with invalid coordinates:', item.itemLabel.value, 'lat:', item.lat.value, 'lng:', item.lng.value)
          return null
        }
        const distance = calculateDistance(lat, lng, itemLat, itemLng)
        
        // Strict radius enforcement - only include items within the exact radius
        const isWithinRadius = distance <= radius
        
        if (isWithinRadius) {
          console.log(`✅ Item "${item.itemLabel.value}" at (${itemLat}, ${itemLng}) is ${distance.toFixed(1)}km away from (${lat}, ${lng})`)
          // Add the calculated distance to the item for later use
          return { ...item, distance: { value: distance.toString() } }
        } else {
          console.log(`❌ Item "${item.itemLabel.value}" at (${itemLat}, ${itemLng}) is ${distance.toFixed(1)}km away from (${lat}, ${lng}) - OUTSIDE RADIUS`)
          return null
        }
      })
      .filter((item: WikidataItem | null): item is WikidataItem => item !== null)
      .slice(0, 50)
    
    console.log(`Filtered ${filteredItems.length} items within ${radius}km radius`)
    return filteredItems
      
  } catch (error) {
    console.error('Wikidata query error:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('Wikidata query timed out - please try again')
      } else if (error.message.includes('server error')) {
        throw new Error('Wikidata is experiencing issues - please try again later')
      } else if (error.message.includes('rate limit')) {
        throw new Error('Too many requests to Wikidata - please wait before trying again')
      }
    }
    
    throw new Error('Failed to query historical events from Wikidata')
  }
}

/**
 * Alternative query using simpler approach with improved geographic filtering and temporal filtering
 */
async function queryWikidataSimple(lat: number, lng: number, radius: number, startYear: number, endYear: number): Promise<WikidataItem[]> {
  // Calculate bounding box coordinates with improved accuracy (same as main query)
  const latDelta = radius / 111.32
  const lngDelta = radius / (111.32 * Math.cos(Math.abs(lat) * Math.PI / 180))
  const buffer = 0.1
  const minLat = lat - latDelta - buffer
  const maxLat = lat + latDelta + buffer
  const minLng = lng - lngDelta - buffer
  const maxLng = lng + lngDelta + buffer
  
  const sparqlQuery = `
    SELECT ?item ?itemLabel ?itemDescription ?date ?lat ?lng ?wikipediaUrl ?imageUrl WHERE {
      ?item wdt:P625 ?location .
      
      # Filter for items with time properties
      FILTER(EXISTS { ?item wdt:P585 [] } || EXISTS { ?item wdt:P580 [] })
      
      # Extract coordinates - fix coordinate parsing
      BIND(REPLACE(str(?location), "^Point\\\\(([^ ]+) ([^)]+)\\\\)$", "$1") AS ?lngStr)
      BIND(REPLACE(str(?location), "^Point\\\\(([^ ]+) ([^)]+)\\\\)$", "$2") AS ?latStr)
      BIND(xsd:decimal(?lngStr) AS ?lng)
      BIND(xsd:decimal(?latStr) AS ?lat)
      
      # Geographic bounding box filtering - only include items within expanded area
      FILTER(?lat >= ${minLat} && ?lat <= ${maxLat})
      FILTER(?lng >= ${minLng} && ?lng <= ${maxLng})
      
      # Get date
      OPTIONAL { ?item wdt:P585 ?date }
      OPTIONAL { ?item wdt:P580 ?startDate }
      BIND(COALESCE(?date, ?startDate) AS ?date)
      
      # Temporal filtering - only include events within specified year range
      FILTER(BOUND(?date))
      FILTER(YEAR(?date) >= ${startYear})
      FILTER(YEAR(?date) <= ${endYear})
      
      # Get label and description
      OPTIONAL { ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en") }
      OPTIONAL { ?item schema:description ?itemDescription . FILTER(LANG(?itemDescription) = "en") }
      
      # Get Wikipedia article URL
      OPTIONAL {
        ?wikipediaArticle schema:about ?item .
        ?wikipediaArticle schema:inLanguage "en" .
        FILTER(STRSTARTS(STR(?wikipediaArticle), "https://en.wikipedia.org/"))
        BIND(?wikipediaArticle AS ?wikipediaUrl)
      }
      
      # Get image URL from Wikidata P18 property
      OPTIONAL { ?item wdt:P18 ?imageFile }
      OPTIONAL { 
        ?imageFile wdt:P18 ?imageUrl .
        FILTER(STRSTARTS(STR(?imageUrl), "http"))
      }
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
      distance: undefined, // Will be calculated later
      wikipediaUrl: binding.wikipediaUrl ? { value: binding.wikipediaUrl.value } : undefined,
      imageUrl: binding.imageUrl ? { value: binding.imageUrl.value } : undefined
    }))
    
    // Apply proper distance filtering for simple query as well
    console.log(`Simple query: Raw results from Wikidata: ${items.length} items`)
    
    // Filter by distance manually with strict radius enforcement
    const filteredItems = items
      .map((item: WikidataItem) => {
        const itemLat = parseFloat(item.lat.value)
        const itemLng = parseFloat(item.lng.value)
        if (isNaN(itemLat) || isNaN(itemLng)) {
          console.log('Simple query: Skipping item with invalid coordinates:', item.itemLabel.value)
          return null
        }
        const distance = calculateDistance(lat, lng, itemLat, itemLng)
        
        // Strict radius enforcement - only include items within the exact radius
        const isWithinRadius = distance <= radius
        
        if (isWithinRadius) {
          console.log(`✅ Simple query: Item "${item.itemLabel.value}" is ${distance.toFixed(1)}km away`)
          // Add the calculated distance to the item for later use
          return { ...item, distance: { value: distance.toString() } }
        } else {
          console.log(`❌ Simple query: Item "${item.itemLabel.value}" is ${distance.toFixed(1)}km away - OUTSIDE RADIUS`)
          return null
        }
      })
      .filter((item: WikidataItem | null): item is WikidataItem => item !== null)
      .slice(0, 50)
    
    console.log(`Simple query: Filtered to ${filteredItems.length} items within ${radius}km radius`)
    return filteredItems
  } catch (error) {
    console.error('Simple Wikidata query error:', error)
    throw new Error('Failed to query historical events')
  }
}

/**
 * Debug function to test basic Wikidata connectivity
 */
async function testWikidataConnection(): Promise<void> {
  // Very simple test query to check basic connectivity
  const testQuery = `
    SELECT ?item ?itemLabel WHERE {
      ?item wdt:P31 wd:Q5 .
      ?item rdfs:label ?itemLabel .
      FILTER(LANG(?itemLabel) = "en")
    }
    LIMIT 3
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
 * Convert Wikidata items to GeoJSON features with only coordinates
 */
function convertToGeoJSON(items: WikidataItem[], centerLat: number, centerLng: number): CoordinatesResponse {
  const features = items.map((item) => {
    const lat = parseFloat(item.lat.value)
    const lng = parseFloat(item.lng.value)
    
    // Debug coordinate parsing
    if (isNaN(lat) || isNaN(lng)) {
      console.log('Invalid coordinates for item:', item.itemLabel.value, 'lat:', item.lat.value, 'lng:', item.lng.value)
      return null
    }

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [lng, lat] as [number, number]
      },
      properties: {
        // Only return coordinates, no other properties
        coordinates: [lng, lat] as [number, number]
      }
    }
  }).filter((feature) => feature !== null) as CoordinatesFeature[]

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Convert Wikidata items to full GeoJSON features with all properties
 * Now includes distance filtering to ensure only items within radius are returned
 */
function convertToFullGeoJSON(items: WikidataItem[], centerLat: number, centerLng: number, radius: number): EventsResponse {
  const features = items.map((item) => {
    const lat = parseFloat(item.lat.value)
    const lng = parseFloat(item.lng.value)
    
    // Debug coordinate parsing
    if (isNaN(lat) || isNaN(lng)) {
      console.log('Invalid coordinates for item:', item.itemLabel.value, 'lat:', item.lat.value, 'lng:', item.lng.value)
      return null
    }
    
    const distance = calculateDistance(centerLat, centerLng, lat, lng)
    
    // Apply strict distance filtering in the final conversion step
    if (distance > radius) {
      console.log(`❌ convertToFullGeoJSON: Item "${item.itemLabel.value}" at (${lat}, ${lng}) is ${distance.toFixed(1)}km away - OUTSIDE RADIUS`)
      return null
    }
    
    console.log(`✅ convertToFullGeoJSON: Item "${item.itemLabel.value}" at (${lat}, ${lng}) is ${distance.toFixed(1)}km away from center (${centerLat}, ${centerLng})`)

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
        distance,
        wikipediaUrl: item.wikipediaUrl?.value,
        imageUrl: undefined // Simplified for now
      }
    }
  }).filter((feature) => feature !== null) as EventFeature[]

  console.log(`convertToFullGeoJSON: Filtered to ${features.length} items within ${radius}km radius`)
  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Fallback query to get any historical events if the main query fails
 */
async function queryWikidataFallback(lat: number, lng: number, radius: number, startYear: number, endYear: number): Promise<WikidataItem[]> {
  // Calculate bounding box coordinates (same as main query)
  const latDelta = radius / 111.32
  const lngDelta = radius / (111.32 * Math.cos(Math.abs(lat) * Math.PI / 180))
  const buffer = 0.1
  const minLat = lat - latDelta - buffer
  const maxLat = lat + latDelta + buffer
  const minLng = lng - lngDelta - buffer
  const maxLng = lng + lngDelta + buffer
  
  const fallbackQuery = `
    SELECT ?item ?itemLabel ?date ?location ?wikipediaUrl ?lat ?lng WHERE {
      ?item wdt:P625 ?location .
      ?item wdt:P585 ?date .
      
      # Extract coordinates for geographic filtering
      BIND(REPLACE(str(?location), "^Point\\\\(([^ ]+) ([^)]+)\\\\)$", "$1") AS ?lngStr)
      BIND(REPLACE(str(?location), "^Point\\\\(([^ ]+) ([^)]+)\\\\)$", "$2") AS ?latStr)
      BIND(xsd:decimal(?lngStr) AS ?lng)
      BIND(xsd:decimal(?latStr) AS ?lat)
      
      # Geographic bounding box filtering - only include items within expanded area
      FILTER(?lat >= ${minLat} && ?lat <= ${maxLat})
      FILTER(?lng >= ${minLng} && ?lng <= ${maxLng})
      
      # Temporal filtering - only include events within specified year range
      FILTER(BOUND(?date))
      FILTER(YEAR(?date) >= ${startYear})
      FILTER(YEAR(?date) <= ${endYear})
      
      # Get English label
      ?item rdfs:label ?itemLabel .
      FILTER(LANG(?itemLabel) = "en")
      
      # Get Wikipedia article URL (English only)
      OPTIONAL {
        ?wikipediaArticle schema:about ?item .
        ?wikipediaArticle schema:inLanguage "en" .
        FILTER(STRSTARTS(STR(?wikipediaArticle), "https://en.wikipedia.org/"))
        BIND(?wikipediaArticle AS ?wikipediaUrl)
      }
      
      # Ensure we have valid coordinates
      FILTER(STRSTARTS(STR(?location), "Point("))
    }
    LIMIT 50
  `

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(fallbackQuery)}&format=json`
  
  console.log('Fallback Wikidata query URL:', url)
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Places-History-App/1.0 (https://github.com/your-repo)',
        'Accept': 'application/sparql-results+json'
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      console.error('Fallback query failed:', response.status)
      return []
    }

    const data = await response.json()
    console.log('Fallback query response:', data)
    
    if (!data.results || !data.results.bindings) {
      return []
    }
    
    const items = data.results.bindings.map((binding: Record<string, { value: string } | undefined>) => {
      // Use coordinates from SPARQL query, or extract manually if failed
      let lat = binding.lat?.value || '0'
      let lng = binding.lng?.value || '0'
      
      // If SPARQL extraction failed, try manual extraction
      if ((lat === '0' || lng === '0') && binding.location?.value) {
        const locationStr = binding.location.value
        const match = locationStr.match(/Point\(([^ ]+) ([^)]+)\)/)
        if (match) {
          lng = match[1]
          lat = match[2]
          console.log('Fallback manual coordinate extraction for', binding.itemLabel?.value, ':', { lat, lng })
        }
      }
      
      console.log(`Fallback query: Item "${binding.itemLabel?.value}" at (${lat}, ${lng}) from SPARQL`)
      
      // Parse and format the date properly
      let formattedDate = 'Unknown date'
      if (binding.date?.value) {
        try {
          // Wikidata dates are typically in format like "1960-01-01T00:00:00Z"
          const dateStr = binding.date.value
          if (dateStr.includes('T')) {
            // ISO date format
            const date = new Date(dateStr)
            if (!isNaN(date.getTime())) {
              formattedDate = date.toISOString().split('T')[0] // YYYY-MM-DD format
            }
          } else if (dateStr.includes('-')) {
            // Just date part
            formattedDate = dateStr.split('T')[0]
          } else {
            formattedDate = dateStr
          }
        } catch (error) {
          console.log('Failed to parse date:', binding.date.value)
          formattedDate = binding.date.value
        }
      }
      
      // Filter Wikipedia URLs to only include English Wikipedia
      let wikipediaUrl = undefined
      if (binding.wikipediaUrl?.value && binding.wikipediaUrl.value.includes('en.wikipedia.org')) {
        wikipediaUrl = { value: binding.wikipediaUrl.value }
      }
      
      return {
        item: { value: binding.item?.value || '' },
        itemLabel: { value: binding.itemLabel?.value || 'Unknown' },
        itemDescription: undefined,
        date: { value: formattedDate },
        lat: { value: lat },
        lng: { value: lng },
        distance: undefined,
        wikipediaUrl,
        imageUrl: undefined
      }
    })
    
    // Apply proper distance filtering for fallback query as well
    const filteredItems = items
      .map((item: WikidataItem) => {
        const itemLat = parseFloat(item.lat.value)
        const itemLng = parseFloat(item.lng.value)
        if (isNaN(itemLat) || isNaN(itemLng)) {
          console.log('Fallback query: Skipping item with invalid coordinates:', item.itemLabel.value)
          return null
        }
        const distance = calculateDistance(lat, lng, itemLat, itemLng)
        
        // Strict radius enforcement - only include items within the exact radius
        const isWithinRadius = distance <= radius
        
        if (isWithinRadius) {
          console.log(`✅ Fallback query: Item "${item.itemLabel.value}" is ${distance.toFixed(1)}km away`)
          // Add the calculated distance to the item for later use
          return { ...item, distance: { value: distance.toString() } }
        } else {
          console.log(`❌ Fallback query: Item "${item.itemLabel.value}" is ${distance.toFixed(1)}km away - OUTSIDE RADIUS`)
          return null
        }
      })
      .filter((item: WikidataItem | null): item is WikidataItem => item !== null)
      .slice(0, 50)
    
    console.log(`Fallback query: Filtered to ${filteredItems.length} items within ${radius}km radius`)
    return filteredItems
    
  } catch (error) {
    console.error('Fallback query error:', error)
    return []
  }
}

/**
 * Cached version of the Wikidata query with 1-hour cache
 */
  async function cachedQueryWikidata(lat: number, lng: number, radius: number, startYear: number, endYear: number) {
  const cached = unstable_cache(
    () => queryWikidata(lat, lng, radius, startYear, endYear),
    ['wikidata-events', `lat:${lat}`, `lng:${lng}`, `r:${radius}`, `start:${startYear}`, `end:${endYear}`],
    {
      revalidate: 3600, // 1 hour
      tags: ['wikidata']
    }
  )
  return cached()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('r') || DEFAULT_RADIUS_KM.toString())
    const coordinatesOnly = searchParams.get('coordinates') === 'true'
    
    // Add temporal filtering parameters - default to last 500 years for historical relevance
    const startYear = parseInt(searchParams.get('startYear') || '1500')
    const endYear = parseInt(searchParams.get('endYear') || new Date().getFullYear().toString())

    // Validate parameters
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return NextResponse.json(
        { error: 'Invalid parameters. lat, lng, and r must be valid numbers.' },
        { status: 400 }
      )
    }
    
    // Validate year parameters
    if (isNaN(startYear) || isNaN(endYear)) {
      return NextResponse.json(
        { error: 'Invalid year parameters. startYear and endYear must be valid numbers.' },
        { status: 400 }
      )
    }
    
    if (startYear > endYear) {
      return NextResponse.json(
        { error: 'startYear must be less than or equal to endYear.' },
        { status: 400 }
      )
    }
    
    if (endYear > new Date().getFullYear()) {
      return NextResponse.json(
        { error: 'endYear cannot be in the future.' },
        { status: 400 }
      )
    }

    // Validate radius range - too small won't find events, too large returns irrelevant results
    if (radius < 1) {
      return NextResponse.json(
        { error: 'Radius too small. Minimum allowed is 1km.' },
        { status: 400 }
      )
    }
    
    if (radius > 500) {
      return NextResponse.json(
        { error: 'Radius too large. Maximum allowed is 500km (311 miles).' },
        { status: 400 }
      )
    }
    
    // Log the search parameters for debugging
    console.log('API request parameters:', { lat, lng, radius, coordinatesOnly, startYear, endYear })

    // Test Wikidata connection first
    await testWikidataConnection()

    // Query Wikidata with caching
    let items = await cachedQueryWikidata(lat, lng, radius, startYear, endYear)
    
    console.log('Raw Wikidata items:', items.length, 'items found')
    if (items.length > 0) {
      console.log('Sample item:', items[0])
      console.log('Sample item coordinates:', {
        lat: items[0].lat.value,
        lng: items[0].lng.value,
        label: items[0].itemLabel.value
      })
    }
    
    // If no results, try a fallback query
    if (items.length === 0) {
      console.log('No results from main query, trying fallback...')
      items = await queryWikidataFallback(lat, lng, radius, startYear, endYear)
      console.log('Fallback query returned:', items.length, 'items')
    }
    
    // Convert to GeoJSON based on coordinatesOnly parameter
    let geoJSON
    if (coordinatesOnly) {
      console.log('Returning coordinates-only response...')
      geoJSON = convertToGeoJSON(items, lat, lng)
      console.log('Coordinates-only GeoJSON result:', geoJSON.features.length, 'features')
      console.log('Sample feature:', geoJSON.features[0])
    } else {
      console.log('Returning full response with all properties...')
      // Use the original full response conversion
      geoJSON = convertToFullGeoJSON(items, lat, lng, radius)
      console.log('Full GeoJSON result:', geoJSON.features.length, 'features')
      console.log('Sample feature:', geoJSON.features[0])
    }

    return NextResponse.json(geoJSON)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical events' },
      { status: 500 }
    )
  }
} 