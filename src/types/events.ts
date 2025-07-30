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
} 