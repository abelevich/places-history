/**
 * Format a date string for display in the UI.
 * Handles YYYY-MM-DD, ISO dates, and fallback strings.
 */
export function formatDisplayDate(dateString: string): string {
  try {
    if (dateString === 'Unknown date' || !dateString) {
      return 'Date unknown'
    }

    // YYYY-MM-DD format
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

    // ISO date format
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    return dateString
  } catch {
    return dateString || 'Date unknown'
  }
}

/**
 * Format a distance value for display.
 */
export function formatDistance(distance?: number): string {
  if (!distance && distance !== 0) return ''
  return `${distance.toFixed(1)} km away`
}
