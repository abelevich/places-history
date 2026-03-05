'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface SearchResult {
  id: string
  placeName: string
  text: string
  center: [number, number] // [lng, lat]
}

interface SearchBarProps {
  onSelect: (lat: number, lng: number, placeName: string) => void
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!token) return

    setIsLoading(true)
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&limit=5&types=place,locality,neighborhood,address,poi`
      )
      if (!res.ok) return
      const data = await res.json()
      const items: SearchResult[] = (data.features || []).map((f: { id: string; place_name: string; text: string; center: [number, number] }) => ({
        id: f.id,
        placeName: f.place_name,
        text: f.text,
        center: f.center
      }))
      setResults(items)
      setIsOpen(items.length > 0)
    } catch {
      // Silently fail - search is non-critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  const handleSelect = (result: SearchResult) => {
    setQuery(result.placeName)
    setIsOpen(false)
    setResults([])
    onSelect(result.center[1], result.center[0], result.placeName)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search for a place..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result) => (
            <li key={result.id}>
              <button
                onClick={() => handleSelect(result)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-start gap-2"
              >
                <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-gray-700">{result.placeName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
