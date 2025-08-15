'use client'

import { useState } from 'react'
import { EventFeature } from '@/types/events'
import { getPlaceholderImageUrl } from '@/lib/image-utils'

interface EventCardProps {
  event: EventFeature
  onClose?: () => void
}

export function EventCard({ event, onClose }: EventCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const formatDate = (dateString: string) => {
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

  const getImageUrl = () => {
    if (event.properties.imageUrl && !imageError) {
      return event.properties.imageUrl
    }
    return getPlaceholderImageUrl(event.properties.label)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-sm">
      {/* Image Section */}
      <div className="relative h-48 bg-gray-100">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        <img
          src={getImageUrl()}
          alt={event.properties.label}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🏛️</div>
              <div className="text-sm">No image available</div>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 leading-tight">
            {event.properties.label}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {/* Date */}
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(event.properties.date)}
          </div>

          {/* Distance */}
          {event.properties.distance && (
            <div className="flex items-center text-sm text-blue-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.properties.distance.toFixed(1)} km away
            </div>
          )}

          {/* Description */}
          {event.properties.description && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {event.properties.description}
            </p>
          )}

          {/* Wikipedia Link */}
          {event.properties.wikipediaUrl && (
            <a
              href={event.properties.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Read on Wikipedia
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
