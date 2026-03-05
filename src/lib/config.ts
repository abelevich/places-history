/**
 * Application configuration constants.
 */

export const GEOGRAPHIC_CONFIG = {
  DEFAULT_RADIUS_MILES: 5,
  MILES_TO_KM: 1.60934,
  MAX_RADIUS_KM: 500,
} as const

export const DEFAULT_RADIUS_KM = GEOGRAPHIC_CONFIG.DEFAULT_RADIUS_MILES * GEOGRAPHIC_CONFIG.MILES_TO_KM

export const DEFAULT_START_YEAR = 1500
export const DEFAULT_END_YEAR = new Date().getFullYear()

export const milesToKm = (miles: number): number => miles * GEOGRAPHIC_CONFIG.MILES_TO_KM
export const kmToMiles = (km: number): number => km / GEOGRAPHIC_CONFIG.MILES_TO_KM
