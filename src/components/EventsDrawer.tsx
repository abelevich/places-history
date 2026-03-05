'use client'

import { useMemo } from 'react'
import { HistoricalEvent } from '@/types/events'
import { EventCard } from '@/components/EventCard'

interface EventsDrawerProps {
  events: HistoricalEvent[]
  isLoading: boolean
  error: string | null
  selectedLocation: { lat: number; lng: number } | null
  radius: number
  sortBy: 'distance' | 'date'
  onSortChange: (sort: 'distance' | 'date') => void
  onEventClick?: (event: HistoricalEvent) => void
}

export function EventsDrawer({
  events,
  isLoading,
  error,
  selectedLocation,
  radius,
  sortBy,
  onSortChange,
  onEventClick
}: EventsDrawerProps) {
  const sortedEvents = useMemo(() => {
    const sorted = [...events]
    if (sortBy === 'date') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.properties.date).getTime()
        const dateB = new Date(b.properties.date).getTime()
        if (isNaN(dateA) && isNaN(dateB)) return 0
        if (isNaN(dateA)) return 1
        if (isNaN(dateB)) return -1
        return dateA - dateB
      })
    } else {
      sorted.sort((a, b) => (a.properties.distance || 0) - (b.properties.distance || 0))
    }
    return sorted
  }, [events, sortBy])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header with sort + count */}
      {events.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {events.length} event{events.length !== 1 ? 's' : ''} within {radius.toFixed(0)} km
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onSortChange('distance')}
              className={`px-2 py-0.5 text-[11px] rounded ${sortBy === 'distance' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Nearest
            </button>
            <button
              onClick={() => onSortChange('date')}
              className={`px-2 py-0.5 text-[11px] rounded ${sortBy === 'date' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Oldest
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
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
          <div className="p-6 text-center">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-gray-500 text-sm">No historical events found in this area.</p>
            <p className="text-gray-400 text-xs mt-1">Try increasing the radius or adjusting the year range.</p>
          </div>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div className="divide-y divide-gray-100">
            {sortedEvents.map((event) => (
              <EventCard
                key={event.properties.id}
                event={event}
                onClick={onEventClick ? () => onEventClick(event) : undefined}
              />
            ))}
          </div>
        )}

        {!isLoading && !error && !selectedLocation && (
          <div className="p-6 text-center">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-gray-500 text-sm">
              Click anywhere on the map or search for a place to discover historical events.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
