/**
 * Represents a historical event with location and temporal data
 * Updated to match GeoJSON Feature structure from API
 */
export interface HistoricalEvent {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  }
  properties: {
    id: string
    label: string
    description?: string
    date: string
    distance?: number
    wikipediaUrl?: string
    imageUrl?: string
  }
}

/**
 * GeoJSON Feature for historical events
 */
export interface EventFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  }
  properties: {
    id: string
    label: string
    description?: string
    date: string
    distance?: number
    wikipediaUrl?: string
    imageUrl?: string
  }
}

/**
 * GeoJSON Feature for coordinates-only response
 */
export interface CoordinatesFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  }
  properties: {
    coordinates: [number, number] // [lng, lat]
  }
}

/**
 * GeoJSON FeatureCollection response from API
 */
export interface EventsResponse {
  type: 'FeatureCollection'
  features: EventFeature[]
}

/**
 * GeoJSON FeatureCollection response for coordinates-only API
 */
export interface CoordinatesResponse {
  type: 'FeatureCollection'
  features: CoordinatesFeature[]
}

/**
 * Wikidata SPARQL query result item
 */
export interface WikidataItem {
  item: {
    value: string // Q-number
  }
  itemLabel: {
    value: string
  }
  itemDescription?: {
    value: string
  }
  date: {
    value: string // ISO date string
  }
  lat: {
    value: string
  }
  lng: {
    value: string
  }
  distance?: {
    value: string
  }
  wikipediaUrl?: {
    value: string
  }
  imageUrl?: {
    value: string
  }
} 