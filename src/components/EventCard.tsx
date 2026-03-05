'use client'

import { useState } from 'react'
import { HistoricalEvent } from '@/types/events'
import { formatDisplayDate, formatDistance } from '@/lib/date-utils'

interface EventCardProps {
  event: HistoricalEvent
  onClick?: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  const [imageError, setImageError] = useState(false)
  const { label, description, date, distance, wikipediaUrl, imageUrl } = event.properties

  return (
    <div
      className={`p-4 hover:bg-gray-50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        {imageUrl && !imageError ? (
          <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : null}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-gray-900 text-sm leading-tight truncate">
              {label}
            </h3>
            {distance != null && (
              <span className="text-[11px] text-blue-600 font-medium whitespace-nowrap flex-shrink-0">
                {formatDistance(distance)}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-0.5">{formatDisplayDate(date)}</p>

          {description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>
          )}

          {wikipediaUrl && (
            <a
              href={wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1.5"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Wikipedia
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
