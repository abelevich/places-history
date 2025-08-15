'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { HistoricalEvent } from '@/types/events'

// Import Mapbox CSS directly
import 'mapbox-gl/dist/mapbox-gl.css'

// Set Mapbox access token
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
mapboxgl.accessToken = mapboxToken

// Debug token
console.log('Mapbox token set:', mapboxToken ? 'YES' : 'NO')
console.log('Mapboxgl accessToken:', mapboxgl.accessToken ? 'SET' : 'NOT SET')

// Test token by making a direct API call
if (mapboxToken) {
  fetch(`https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${mapboxToken}`)
    .then(response => {
      console.log('Token test response:', response.status, response.statusText)
      return response.json()
    })
    .then(data => {
      console.log('Token test data:', data.name || 'No name in response')
    })
    .catch(error => {
      console.error('Token test failed:', error)
    })
}

interface MapComponentProps {
  onMapClick: (lat: number, lng: number) => void
  events: HistoricalEvent[]
  selectedLocation: { lat: number; lng: number } | null
  radius: number
}

export function MapComponent({ onMapClick, events, selectedLocation, radius }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const radiusSource = useRef<string | null>(null)
  const eventMarkers = useRef<mapboxgl.Marker[]>([])
  const selectedLocationMarker = useRef<mapboxgl.Marker | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [hasTokenError, setHasTokenError] = useState(false)

  // Function to create a circle geometry
  const createCircleGeometry = (center: [number, number], radiusKm: number): GeoJSON.Feature => {
    const earthRadius = 6371 // Earth's radius in km
    const angularRadius = radiusKm / earthRadius
    
    const coordinates: [number, number][] = []
    const steps = 64 // Number of points to create the circle
    
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI
      const lat = center[1] + (angularRadius * Math.cos(angle) * (180 / Math.PI))
      const lng = center[0] + (angularRadius * Math.sin(angle) * (180 / Math.PI) / Math.cos(center[1] * Math.PI / 180))
      coordinates.push([lng, lat])
    }
    
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      },
      properties: {}
    }
  }

  // Function to update selected location marker
  const updateSelectedLocationMarker = (lat: number, lng: number) => {
    if (!map.current || !isMapReady) return

    // Remove existing selected location marker
    if (selectedLocationMarker.current) {
      selectedLocationMarker.current.remove()
      selectedLocationMarker.current = null
    }

    // Create new marker element
    const el = document.createElement('div')
    el.className = 'w-6 h-6 bg-blue-600 rounded-full border-3 border-white shadow-lg'
    el.style.border = '3px solid white'
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
    el.title = 'Selected Location'

    // Create and add the marker
    selectedLocationMarker.current = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(map.current!)
  }

  // Function to update radius circle
  const updateRadiusCircle = (lat: number, lng: number) => {
    if (!map.current || !isMapReady) return

    const sourceId = 'radius-circle'
    
    // Remove existing radius source and layer
    if (map.current.getSource(sourceId)) {
      if (map.current.getLayer('radius-circle-layer')) {
        map.current.removeLayer('radius-circle-layer')
      }
      if (map.current.getLayer('radius-circle-outline')) {
        map.current.removeLayer('radius-circle-outline')
      }
      map.current.removeSource(sourceId)
    }

    // Create new radius circle
    const circleGeometry = createCircleGeometry([lng, lat], radius)
    
    // Add source
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [circleGeometry]
      }
    })

    // Add layer
    map.current.addLayer({
      id: 'radius-circle-layer',
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#3B82F6',
        'fill-opacity': 0.1,
        'fill-outline-color': '#3B82F6'
      }
    })

    // Add outline layer
    map.current.addLayer({
      id: 'radius-circle-outline',
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#3B82F6',
        'line-width': 2,
        'line-opacity': 0.8
      }
    })

    radiusSource.current = sourceId
  }

  // Initialize map
  useEffect(() => {
    console.log('MapComponent useEffect triggered')
    console.log('mapContainer.current:', !!mapContainer.current)
    console.log('map.current:', !!map.current)
    
    if (!mapContainer.current || map.current) {
      console.log('Skipping map initialization - container or map already exists')
      return
    }

    // Check if token is available
    if (!mapboxToken) {
      console.error('Mapbox token is not set. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file')
      setHasTokenError(true)
      return
    }

    // Ensure container has proper dimensions before initializing map
    const ensureContainerDimensions = () => {
      if (mapContainer.current) {
        const container = mapContainer.current
        const parent = container.parentElement
        
        if (parent) {
          const parentRect = parent.getBoundingClientRect()
          if (parentRect.width > 0 && parentRect.height > 0) {
            container.style.width = '100%'
            container.style.height = '100%'
            container.style.minHeight = '400px'
            return true
          }
        }
        return false
      }
      return false
    }

    // Wait for container to have proper dimensions
    const initMap = () => {
      if (!ensureContainerDimensions()) {
        // If container doesn't have dimensions yet, wait a bit and try again
        setTimeout(initMap, 100)
        return
      }

      try {
        console.log('Initializing Mapbox map with token:', mapboxToken.substring(0, 20) + '...')
        console.log('Token length:', mapboxToken.length)
        
        if (!mapboxToken) {
          console.error('Mapbox token is not set. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file')
          setHasTokenError(true)
          return
        }

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-74.006, 40.7128], // New York coordinates
          zoom: 9,
          attributionControl: false,
          failIfMajorPerformanceCaveat: false
        })
        
        console.log('Map object created:', !!map.current)
        console.log('Map container element:', mapContainer.current)

        // Add error handling
        map.current.on('error', (e) => {
          console.error('Mapbox error:', e)
          console.error('Error details:', e.error)
          console.error('Error type:', e.type)
        })

        // Add source error handling
        map.current.on('sourcedata', (e) => {
          if (e.isSourceLoaded) {
            console.log('Source loaded:', e.sourceId)
          }
        })

        // Add load event handler
        map.current.on('load', () => {
          console.log('Mapbox map loaded successfully')
          console.log('Map container dimensions:', mapContainer.current?.offsetWidth, 'x', mapContainer.current?.offsetHeight)
          setIsMapReady(true)
        })

        // Add style load event handler
        map.current.on('styledata', () => {
          console.log('Map style loaded')
        })

        // Add idle event handler
        map.current.on('idle', () => {
          console.log('Map is idle (fully loaded)')
          console.log('Map canvas element:', map.current?.getCanvas())
          console.log('Canvas dimensions:', map.current?.getCanvas()?.width, 'x', map.current?.getCanvas()?.height)
        })

        // Add a timeout to check map state
        setTimeout(() => {
          if (map.current) {
            console.log('Map state after 3 seconds:')
            console.log('Is loaded:', map.current.isStyleLoaded())
            console.log('Canvas exists:', !!map.current.getCanvas())
            console.log('Container dimensions:', mapContainer.current?.offsetWidth, 'x', mapContainer.current?.offsetHeight)
            
            // If style is not loaded, try to reload it
            if (!map.current.isStyleLoaded()) {
              console.log('Style not loaded, attempting to reload...')
              map.current.setStyle('mapbox://styles/mapbox/light-v11')
            }
          }
        }, 3000)

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

        // Handle map clicks
        map.current.on('click', (e) => {
          const { lng, lat } = e.lngLat
          
          // Update selected location marker
          updateSelectedLocationMarker(lat, lng)
          
          // Update radius circle
          updateRadiusCircle(lat, lng)

          // Call the click handler
          onMapClick(lat, lng)
        })

        return () => {
          if (map.current) {
            map.current.remove()
          }
          // Clean up markers
          if (selectedLocationMarker.current) {
            selectedLocationMarker.current.remove()
            selectedLocationMarker.current = null
          }
        }
      } catch (error) {
        console.error('Failed to initialize map:', error)
      }
    }

    // Start initialization
    initMap()
  }, [onMapClick, radius])

  // Update radius circle when selectedLocation changes
  useEffect(() => {
    if (selectedLocation && map.current && isMapReady) {
      updateSelectedLocationMarker(selectedLocation.lat, selectedLocation.lng)
      updateRadiusCircle(selectedLocation.lat, selectedLocation.lng)
    } else if (!selectedLocation && selectedLocationMarker.current) {
      // Remove marker when no location is selected
      selectedLocationMarker.current.remove()
      selectedLocationMarker.current = null
    }
  }, [selectedLocation, isMapReady, radius])

  // Update event markers when events change
  useEffect(() => {
    console.log('MapComponent: Events changed, events.length =', events.length)
    console.log('MapComponent: map.current =', !!map.current)
    console.log('MapComponent: isMapReady =', isMapReady)
    console.log('MapComponent: Sample event =', events[0])
    
    // Remove existing event markers
    eventMarkers.current.forEach(marker => marker.remove())
    eventMarkers.current = []

    if (!map.current || !isMapReady || events.length === 0) {
      console.log('MapComponent: Early return - no map, not ready, or no events')
      return
    }

    // Add new event markers
    events.forEach((event) => {
      const el = document.createElement('div')
      
      // Different marker styles based on whether the event has an image
      if (event.properties.imageUrl) {
        el.className = 'w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer'
        el.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.4)'
        el.title = `${event.properties.label} (${event.properties.date}) - Has image`
      } else {
        el.className = 'w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer'
        el.title = `${event.properties.label} (${event.properties.date})`
      }

      const eventMarker = new mapboxgl.Marker(el)
        .setLngLat([event.geometry.coordinates[0], event.geometry.coordinates[1]])
        .addTo(map.current!)

      // Add popup on click
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
            ` : `
              <div class="mb-3 bg-gray-100 rounded-lg h-32 flex items-center justify-center">
                <div class="text-center text-gray-500">
                  <div class="text-4xl mb-2">🏛️</div>
                  <div class="text-xs">No image available</div>
                </div>
              </div>
            `}
            <h3 class="font-semibold text-sm mb-2">${event.properties.label}</h3>
            <p class="text-xs text-gray-600 mb-2">${event.properties.date}</p>
            ${event.properties.description ? `<p class="text-xs text-gray-700 mb-2 leading-relaxed">${event.properties.description}</p>` : ''}
            ${event.properties.distance ? `<p class="text-xs text-blue-600 mb-2">📍 ${event.properties.distance.toFixed(1)} km away</p>` : ''}
            ${event.properties.wikipediaUrl ? `<a href="${event.properties.wikipediaUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:underline block">📚 Read on Wikipedia</a>` : ''}
          </div>
        `)

      eventMarker.setPopup(popup)
      eventMarkers.current.push(eventMarker)
    })
    
    console.log('MapComponent: Added', eventMarkers.current.length, 'event markers')
  }, [events, isMapReady])

  console.log('MapComponent rendering, mapContainer ref:', !!mapContainer.current)
  console.log('Container dimensions:', mapContainer.current?.offsetWidth, 'x', mapContainer.current?.offsetHeight)
  
  // Show error message if token is missing
  if (hasTokenError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Mapbox Token Missing</h2>
          <p className="text-gray-700 mb-4">
            The Mapbox access token is not configured. Please follow these steps:
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 mb-4">
            <li>Get a free Mapbox token from <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://account.mapbox.com/access-tokens/</a></li>
            <li>Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in the project root</li>
            <li>Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here</code></li>
            <li>Restart the development server</li>
          </ol>
          <p className="text-xs text-gray-500">
            The token should start with <code className="bg-gray-100 px-1 rounded">pk.</code>
          </p>
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