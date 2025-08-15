/**
 * Application configuration constants
 * 
 * This file centralizes configuration values that can be easily modified
 * without searching through multiple files.
 */

// Geographic search configuration
export const GEOGRAPHIC_CONFIG = {
  // Default search radius in miles
  DEFAULT_RADIUS_MILES: 5,
  
  // Convert miles to kilometers (1 mile = 1.60934 km)
  MILES_TO_KM: 1.60934,
  
  // Maximum allowed radius in kilometers (from API validation)
  MAX_RADIUS_KM: 500,
} as const

// Calculate the default radius in kilometers
export const DEFAULT_RADIUS_KM = GEOGRAPHIC_CONFIG.DEFAULT_RADIUS_MILES * GEOGRAPHIC_CONFIG.MILES_TO_KM

// Helper function to convert miles to kilometers
export const milesToKm = (miles: number): number => {
  return miles * GEOGRAPHIC_CONFIG.MILES_TO_KM
}

// Helper function to convert kilometers to miles
export const kmToMiles = (km: number): number => {
  return km / GEOGRAPHIC_CONFIG.MILES_TO_KM
}
