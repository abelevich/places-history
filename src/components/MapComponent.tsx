'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { HistoricalEvent } from '@/types/events'

import 'mapbox-gl/dist/mapbox-gl.css'

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
mapboxgl.accessToken = mapboxToken

interface MapComponentProps {
  onMapClick: (lat: number, lng: number) => void
  events: HistoricalEvent[]
  selectedLocation: { lat: number; lng: number } | null
  radius: number
  flyTo?: { lat: number; lng: number; zoom?: number } | null
}

export function MapComponent({ onMapClick, events, selectedLocation, radius, flyTo }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const eventMarkers = useRef<mapboxgl.Marker[]>([])
  const selectedLocationMarker = useRef<mapboxgl.Marker | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [hasTokenError, setHasTokenError] = useState(false)

  const createCircleGeometry = useCallback((center: [number, number], radiusKm: number): GeoJSON.Feature => {
    const earthRadius = 6371
    const angularRadius = radiusKm / earthRadius
    const coordinates: [number, number][] = []
    const steps = 64

    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI
      const lat = center[1] + (angularRadius * Math.cos(angle) * (180 / Math.PI))
      const lng = center[0] + (angularRadius * Math.sin(angle) * (180 / Math.PI) / Math.cos(center[1] * Math.PI / 180))
      coordinates.push([lng, lat])
    }

    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coordinates] },
      properties: {}
    }
  }, [])

  const updateSelectedLocationMarker = useCallback((lat: number, lng: number) => {
    if (!map.current || !isMapReady) return

    if (selectedLocationMarker.current) {
      selectedLocationMarker.current.remove()
      selectedLocationMarker.current = null
    }

    const el = document.createElement('div')
    el.className = 'w-6 h-6 bg-blue-600 rounded-full'
    el.style.border = '3px solid white'
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
    el.title = 'Selected Location'

    selectedLocationMarker.current = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(map.current!)
  }, [isMapReady])

  const updateRadiusCircle = useCallback((lat: number, lng: number) => {
    if (!map.current || !isMapReady) return

    const sourceId = 'radius-circle'

    if (map.current.getSource(sourceId)) {
      if (map.current.getLayer('radius-circle-layer')) map.current.removeLayer('radius-circle-layer')
      if (map.current.getLayer('radius-circle-outline')) map.current.removeLayer('radius-circle-outline')
      map.current.removeSource(sourceId)
    }

    const circleGeometry = createCircleGeometry([lng, lat], radius)

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [circleGeometry] }
    })

    map.current.addLayer({
      id: 'radius-circle-layer',
      type: 'fill',
      source: sourceId,
      paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.1, 'fill-outline-color': '#3B82F6' }
    })

    map.current.addLayer({
      id: 'radius-circle-outline',
      type: 'line',
      source: sourceId,
      paint: { 'line-color': '#3B82F6', 'line-width': 2, 'line-opacity': 0.8 }
    })
  }, [isMapReady, radius, createCircleGeometry])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    if (!mapboxToken) {
      setHasTokenError(true)
      return
    }

    const ensureContainerDimensions = () => {
      if (!mapContainer.current) return false
      const parent = mapContainer.current.parentElement
      if (parent) {
        const rect = parent.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          mapContainer.current.style.width = '100%'
          mapContainer.current.style.height = '100%'
          mapContainer.current.style.minHeight = '400px'
          return true
        }
      }
      return false
    }

    const initMap = () => {
      if (!ensureContainerDimensions()) {
        setTimeout(initMap, 100)
        return
      }

      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-74.006, 40.7128],
          zoom: 9,
          attributionControl: false,
          failIfMajorPerformanceCaveat: false
        })

        map.current.on('error', (e) => {
          console.error('Mapbox error:', e.error)
        })

        map.current.on('load', () => {
          setIsMapReady(true)
        })

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

        map.current.on('click', (e) => {
          const { lng, lat } = e.lngLat
          updateSelectedLocationMarker(lat, lng)
          updateRadiusCircle(lat, lng)
          onMapClick(lat, lng)
        })
      } catch (error) {
        console.error('Failed to initialize map:', error)
      }
    }

    initMap()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
      if (selectedLocationMarker.current) {
        selectedLocationMarker.current.remove()
        selectedLocationMarker.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update radius circle when selectedLocation or radius changes
  useEffect(() => {
    if (selectedLocation && map.current && isMapReady) {
      updateSelectedLocationMarker(selectedLocation.lat, selectedLocation.lng)
      updateRadiusCircle(selectedLocation.lat, selectedLocation.lng)
    } else if (!selectedLocation && selectedLocationMarker.current) {
      selectedLocationMarker.current.remove()
      selectedLocationMarker.current = null
    }
  }, [selectedLocation, isMapReady, radius, updateSelectedLocationMarker, updateRadiusCircle])

  // Handle flyTo requests (from search bar)
  useEffect(() => {
    if (flyTo && map.current && isMapReady) {
      map.current.flyTo({
        center: [flyTo.lng, flyTo.lat],
        zoom: flyTo.zoom || 11,
        duration: 1500
      })
    }
  }, [flyTo, isMapReady])

  // Update event markers
  useEffect(() => {
    eventMarkers.current.forEach(marker => marker.remove())
    eventMarkers.current = []

    if (!map.current || !isMapReady || events.length === 0) return

    events.forEach((event) => {
      const el = document.createElement('div')

      if (event.properties.imageUrl) {
        el.className = 'w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer'
        el.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.4)'
        el.title = `${event.properties.label} (${event.properties.date})`
      } else {
        el.className = 'w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer'
        el.title = `${event.properties.label} (${event.properties.date})`
      }

      const eventMarker = new mapboxgl.Marker(el)
        .setLngLat([event.geometry.coordinates[0], event.geometry.coordinates[1]])
        .addTo(map.current!)

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div class="p-3 max-w-xs">
            ${event.properties.imageUrl ? `
              <div class="mb-3">
                <img
                  src="${event.properties.imageUrl}"
                  alt="${event.properties.label}"
                  class="w-full h-32 object-cover rounded-lg shadow-sm"
                  onerror="this.style.display='none'"
                />
              </div>
            ` : ''}
            <h3 class="font-semibold text-sm mb-2">${event.properties.label}</h3>
            <p class="text-xs text-gray-600 mb-2">${event.properties.date}</p>
            ${event.properties.description ? `<p class="text-xs text-gray-700 mb-2 leading-relaxed">${event.properties.description}</p>` : ''}
            ${event.properties.distance ? `<p class="text-xs text-blue-600 mb-2">${event.properties.distance.toFixed(1)} km away</p>` : ''}
            ${event.properties.wikipediaUrl ? `<a href="${event.properties.wikipediaUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:underline block">Read on Wikipedia</a>` : ''}
          </div>
        `)

      eventMarker.setPopup(popup)
      eventMarkers.current.push(eventMarker)
    })
  }, [events, isMapReady])

  if (hasTokenError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Mapbox Token Missing</h2>
          <p className="text-gray-700 mb-4">
            The Mapbox access token is not configured. Please follow these steps:
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 mb-4">
            <li>Get a free Mapbox token from <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">mapbox.com</a></li>
            <li>Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in the project root</li>
            <li>Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here</code></li>
            <li>Restart the development server</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full" style={{ minHeight: '400px' }}>
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ minHeight: '400px', position: 'relative' }}
      />
    </div>
  )
}
