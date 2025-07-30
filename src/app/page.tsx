'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

import { EventsDrawer } from '@/components/EventsDrawer'
import { HistoricalEvent } from '@/types/events'

// Dynamically import Mapbox to avoid SSR issues
const MapComponentWithNoSSR = dynamic(() => import('@/components/MapComponent').then(mod => ({ default: mod.MapComponent })), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">Loading map...</div>
})

export default function HomePage() {
  const [events, setEvents] = useState<HistoricalEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [radius] = useState(16.0934) // 10 miles radius (converted to km)

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true)
    setError(null)
    setSelectedLocation({ lat, lng })

    try {
      const response = await fetch(`/api/events?lat=${lat}&lng=${lng}&r=${radius}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      // Handle both FeatureCollection and direct array of features
      const features = data.features || data
      setEvents(features || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [radius])

  console.log('HomePage rendering, events count:', events.length)
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Map Container */}
      <div className="flex-1 relative min-h-0">
        <MapComponentWithNoSSR 
          onMapClick={handleMapClick} 
          events={events} 
          selectedLocation={selectedLocation}
          radius={radius}
        />
      </div>
      
      {/* Events Drawer */}
      <EventsDrawer 
        events={events}
        isLoading={isLoading}
        error={error}
        selectedLocation={selectedLocation}
        radius={radius}
      />
    </div>
  )
} 