'use client'

import { HistoricalEvent } from '@/types/events'

interface EventsDrawerProps {
  events: HistoricalEvent[]
  isLoading: boolean
  error: string | null
  selectedLocation: { lat: number; lng: number } | null
  radius: number
}

export function EventsDrawer({ events, isLoading, error, selectedLocation, radius }: EventsDrawerProps) {
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatDistance = (distance?: number): string => {
    if (!distance) return ''
    return `${distance.toFixed(1)} km away`
  }

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Historical Events</h1>
        {selectedLocation && (
          <p className="text-sm text-gray-600 mt-1">
            Near {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && events.length === 0 && selectedLocation && (
          <div className="p-4">
            <p className="text-gray-500 text-center">No historical events found in this area.</p>
          </div>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <div key={event.properties.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm leading-tight">
                      {event.properties.label}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(event.properties.date)}
                    </p>
                    {event.properties.description && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                        {event.properties.description}
                      </p>
                    )}
                  </div>
                  {event.properties.distance && (
                    <span className="text-xs text-blue-600 font-medium ml-2">
                      {formatDistance(event.properties.distance)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && !selectedLocation && (
          <div className="p-4">
            <p className="text-gray-500 text-center">
              Click anywhere on the map to find historical events.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {events.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Found {events.length} historical event{events.length !== 1 ? 's' : ''} within {radius}km radius
          </p>
        </div>
      )}
    </div>
  )
} 