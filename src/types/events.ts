/**
 * GeoJSON Feature representing a historical event with location and temporal data.
 * Used by both the API response and the frontend components.
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

/** Alias kept for backward compatibility with API internals. */
export type EventFeature = HistoricalEvent

/**
 * GeoJSON FeatureCollection returned by the /api/events endpoint.
 */
export interface EventsResponse {
  type: 'FeatureCollection'
  features: EventFeature[]
}

/**
 * Wikidata SPARQL query result item (intermediate representation).
 */
export interface WikidataItem {
  item: { value: string }
  itemLabel: { value: string }
  itemDescription?: { value: string }
  date: { value: string }
  lat: { value: string }
  lng: { value: string }
  distance?: { value: string }
  wikipediaUrl?: { value: string }
  imageUrl?: { value: string }
}
