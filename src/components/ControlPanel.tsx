'use client'

import { useState } from 'react'
import { kmToMiles } from '@/lib/config'

interface ControlPanelProps {
  radius: number
  startYear: number
  endYear: number
  onRadiusChange: (radius: number) => void
  onYearRangeChange: (startYear: number, endYear: number) => void
  onGeolocate: () => void
}

export function ControlPanel({
  radius,
  startYear,
  endYear,
  onRadiusChange,
  onYearRangeChange,
  onGeolocate
}: ControlPanelProps) {
  const [localStartYear, setLocalStartYear] = useState(String(startYear))
  const [localEndYear, setLocalEndYear] = useState(String(endYear))

  const handleYearBlur = () => {
    const s = parseInt(localStartYear) || 1500
    const e = parseInt(localEndYear) || new Date().getFullYear()
    if (s <= e) {
      onYearRangeChange(s, e)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Radius slider */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Radius: {radius.toFixed(0)} km ({kmToMiles(radius).toFixed(0)} mi)
        </label>
        <input
          type="range"
          min={1}
          max={50}
          step={1}
          value={radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>

      {/* Year range */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Year range</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={localStartYear}
            onChange={(e) => setLocalStartYear(e.target.value)}
            onBlur={handleYearBlur}
            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="From"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="number"
            value={localEndYear}
            onChange={(e) => setLocalEndYear(e.target.value)}
            onBlur={handleYearBlur}
            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="To"
          />
        </div>
      </div>

      {/* Geolocation button */}
      <button
        onClick={onGeolocate}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
        </svg>
        Use my location
      </button>
    </div>
  )
}
