'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'

import { EventsDrawer } from '@/components/EventsDrawer'
import { SearchBar } from '@/components/SearchBar'
import { ControlPanel } from '@/components/ControlPanel'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { UserProfile } from '@/components/auth/UserProfile'
import { HistoricalEvent } from '@/types/events'
import { DEFAULT_RADIUS_KM } from '@/lib/config'

const MapComponentWithNoSSR = dynamic(
  () => import('@/components/MapComponent').then(mod => ({ default: mod.MapComponent })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
        Loading map...
      </div>
    )
  }
)

const currentYear = new Date().getFullYear()

export default function HomePage() {
  const [events, setEvents] = useState<HistoricalEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius] = useState(DEFAULT_RADIUS_KM)
  const [startYear, setStartYear] = useState(1500)
  const [endYear, setEndYear] = useState(currentYear)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const [sortBy, setSortBy] = useState<'distance' | 'date'>('distance')

  // Track latest fetch to avoid stale results
  const fetchIdRef = useRef(0)

  const fetchEvents = useCallback(async (lat: number, lng: number, r: number, sy: number, ey: number) => {
    const id = ++fetchIdRef.current
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events?lat=${lat}&lng=${lng}&r=${r}&startYear=${sy}&endYear=${ey}`)
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || `HTTP error ${response.status}`)
      }
      const data = await response.json()
      // Only apply if this is still the latest fetch
      if (id === fetchIdRef.current) {
        setEvents(data.features || [])
      }
    } catch (err) {
      if (id === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events')
        setEvents([])
      }
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng })
    fetchEvents(lat, lng, radius, startYear, endYear)
  }, [fetchEvents, radius, startYear, endYear])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSearchSelect = useCallback((lat: number, lng: number, _placeName: string) => {
    setSelectedLocation({ lat, lng })
    setFlyTo({ lat, lng, zoom: 11 })
    fetchEvents(lat, lng, radius, startYear, endYear)
  }, [fetchEvents, radius, startYear, endYear])

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius)
    if (selectedLocation) {
      fetchEvents(selectedLocation.lat, selectedLocation.lng, newRadius, startYear, endYear)
    }
  }, [fetchEvents, selectedLocation, startYear, endYear])

  const handleYearRangeChange = useCallback((sy: number, ey: number) => {
    setStartYear(sy)
    setEndYear(ey)
    if (selectedLocation) {
      fetchEvents(selectedLocation.lat, selectedLocation.lng, radius, sy, ey)
    }
  }, [fetchEvents, selectedLocation, radius])

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setSelectedLocation({ lat, lng })
        setFlyTo({ lat, lng, zoom: 11 })
        fetchEvents(lat, lng, radius, startYear, endYear)
      },
      () => {
        setError('Unable to get your location. Please allow location access.')
      }
    )
  }, [fetchEvents, radius, startYear, endYear])

  const handleEventClick = useCallback((event: HistoricalEvent) => {
    const [lng, lat] = event.geometry.coordinates
    setFlyTo({ lat, lng, zoom: 13 })
  }, [])

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 flex-shrink-0">Places History</h1>
          <div className="flex-1 max-w-md">
            <SearchBar onSelect={handleSearchSelect} />
          </div>
          <UserProfile />
        </div>

        {/* Main content */}
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Map */}
          <div className="flex-1 relative min-h-[300px]">
            <MapComponentWithNoSSR
              onMapClick={handleMapClick}
              events={events}
              selectedLocation={selectedLocation}
              radius={radius}
              flyTo={flyTo}
            />
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-96 lg:w-[28rem] bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col max-h-[50vh] md:max-h-none">
            {/* Controls */}
            <div className="p-4 border-b border-gray-200">
              <ControlPanel
                radius={radius}
                startYear={startYear}
                endYear={endYear}
                onRadiusChange={handleRadiusChange}
                onYearRangeChange={handleYearRangeChange}
                onGeolocate={handleGeolocate}
              />
            </div>

            {/* Events */}
            <EventsDrawer
              events={events}
              isLoading={isLoading}
              error={error}
              selectedLocation={selectedLocation}
              radius={radius}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onEventClick={handleEventClick}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
