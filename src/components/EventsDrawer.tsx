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
      // Handle "Unknown date" case
      if (dateString === 'Unknown date' || !dateString) {
        return 'Date unknown'
      }
      
      // If it's already in YYYY-MM-DD format, format it nicely
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateString)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      }
      
      // Try parsing as ISO date
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
      
      // If all else fails, return the original string
      return dateString
    } catch {
      return dateString || 'Date unknown'
    }
  }

  const formatDistance = (distance?: number): string => {
    if (!distance) return ''
    return `${distance.toFixed(1)} km away`
  }

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
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
                    {event.properties.wikipediaUrl && (
                      <a
                        href={event.properties.wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline mt-2"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.25 5.5a.75.75 0 00-.75.75v7.5c0 .414.336.75.75.75h7.5a.75.75 0 00.75-.75v-7.5a.75.75 0 00-.75-.75h-7.5zM2 5.5a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0114 5.5v7.5a2.25 2.25 0 01-2.25 2.25h-7.5A2.25 2.25 0 012 13v-7.5z"
                            clipRule="evenodd"
                          />
                          <path
                            fillRule="evenodd"
                            d="M10.75 2a.75.75 0 00-.75.75v.5a.75.75 0 00.75.75h.5a.75.75 0 00.75-.75v-.5a.75.75 0 00-.75-.75h-.5zM10 2a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h.5a.75.75 0 00.75-.75v-.5A.75.75 0 0010.5 2H10z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Read on Wikipedia
                      </a>
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