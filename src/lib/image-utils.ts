/**
 * Utility functions for handling images from Wikidata and Wikipedia
 */

/**
 * Get the best available image URL for a Wikidata item
 * @param imageUrl - Direct image URL from Wikidata P18 property
 * @param wikipediaUrl - Wikipedia article URL (for fallback)
 * @returns Promise<string | null> - Best available image URL or null
 */
export async function getEventImageUrl(
  imageUrl?: string,
  wikipediaUrl?: string
): Promise<string | null> {
  // If we have a direct Wikidata image, use it
  if (imageUrl && imageUrl.startsWith('http')) {
    return imageUrl
  }

  // Fallback: Try to extract image from Wikipedia article
  if (wikipediaUrl) {
    try {
      const wikiImageUrl = await getWikipediaImageUrl(wikipediaUrl)
      if (wikiImageUrl) {
        return wikiImageUrl
      }
    } catch (error) {
      console.warn('Failed to get Wikipedia image:', error)
    }
  }

  return null
}

/**
 * Extract the main image from a Wikipedia article
 * @param wikipediaUrl - URL of the Wikipedia article
 * @returns Promise<string | null> - Image URL or null
 */
async function getWikipediaImageUrl(wikipediaUrl: string): Promise<string | null> {
  try {
    // Convert Wikipedia URL to API endpoint
    const title = wikipediaUrl.split('/wiki/')[1]
    if (!title) return null

    const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Places-History-App/1.0 (https://github.com/your-repo)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) return null

    const data = await response.json()
    
    // Check for thumbnail or original image
    if (data.thumbnail?.source) {
      return data.thumbnail.source
    }
    
    if (data.originalimage?.source) {
      return data.originalimage.source
    }

    return null
  } catch (error) {
    console.error('Error fetching Wikipedia image:', error)
    return null
  }
}

/**
 * Get optimized image URL with size parameters
 * @param imageUrl - Base image URL
 * @param width - Desired width in pixels
 * @param height - Desired height in pixels
 * @returns string - Optimized image URL
 */
export function getOptimizedImageUrl(
  imageUrl: string,
  width: number = 300,
  height: number = 200
): string {
  // For Wikimedia Commons images, we can optimize the URL
  if (imageUrl.includes('upload.wikimedia.org')) {
    // Wikimedia Commons supports URL parameters for resizing
    // Example: https://upload.wikimedia.org/wikipedia/commons/thumb/.../300px-...
    return imageUrl
  }

  // For other image sources, return as-is
  return imageUrl
}

/**
 * Get a placeholder image URL for events without images
 * @param label - Event label for alt text
 * @returns string - Placeholder image URL
 */
export function getPlaceholderImageUrl(label: string): string {
  // You can use services like:
  // 1. Placeholder.com
  // 2. Picsum Photos
  // 3. Your own placeholder images
  
  const encodedLabel = encodeURIComponent(label)
  return `https://via.placeholder.com/300x200/4a5568/ffffff?text=${encodedLabel}`
}

/**
 * Preload image for better performance
 * @param imageUrl - Image URL to preload
 * @returns Promise<void>
 */
export function preloadImage(imageUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`))
    img.src = imageUrl
  })
}
