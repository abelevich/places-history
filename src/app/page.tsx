'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'

import { EventsDrawer } from '@/components/EventsDrawer'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { UserProfile } from '@/components/auth/UserProfile'
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
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>({ lat: 40.7128, lng: -74.0060 }) // Default to NYC
  // Set to 50 miles (80.47 km) for proper 50-mile radius filtering
  // 1 mile = 1.60934 km, so 50 miles = 80.47 km
  const [radius] = useState(80.47) // 50 miles radius converted to kilometers

  const fetchEvents = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events?lat=${lat}&lng=${lng}&r=${radius}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('API response:', data)
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

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng })
    await fetchEvents(lat, lng)
  }, [fetchEvents])

  // Fetch events for default location on component mount
  useEffect(() => {
    if (selectedLocation) {
      fetchEvents(selectedLocation.lat, selectedLocation.lng)
    }
  }, [fetchEvents, selectedLocation])

  console.log('HomePage rendering, events count:', events.length)
  
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Top Panel - spans across both map and events drawer */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Places History</h1>
          </div>
          <UserProfile />
        </div>
        
        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0">
          {/* Map Container */}
          <div className="flex-1 relative">
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
      </div>
    </ProtectedRoute>
  )
} 