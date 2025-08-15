# Image Features for Historical Events

This document explains how the Places History app now supports thumbnail images for historical events, sourced from Wikidata and Wikipedia.

## Overview

The app now automatically fetches and displays images for historical events using multiple data sources:

1. **Primary Source**: Wikidata P18 property (direct image links)
2. **Fallback Source**: Wikipedia article thumbnails
3. **Placeholder**: Custom placeholder images when no image is available

## How It Works

### 1. Wikidata Image Fetching

The SPARQL queries now include the `P18` property to fetch direct image URLs:

```sparql
# Get image URL from Wikidata P18 property
OPTIONAL { ?item wdt:P18 ?imageFile }
OPTIONAL { 
  ?imageFile wdt:P18 ?imageUrl .
  FILTER(STRSTARTS(STR(?imageUrl), "http"))
}
```

### 2. Wikipedia Fallback

If no direct Wikidata image is available, the app attempts to extract images from Wikipedia articles using the Wikipedia REST API:

```typescript
const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
```

### 3. Image Processing

Images are automatically optimized and resized for better performance:

- **Thumbnail size**: 300x200 pixels (default)
- **Format**: Automatic format detection
- **Caching**: Images are cached for better performance

## API Response

The events API now includes an `imageUrl` field in each event:

```json
{
  "type": "Feature",
  "geometry": { ... },
  "properties": {
    "id": "Q12345",
    "label": "Battle of Hastings",
    "description": "Norman conquest of England",
    "date": "1066-10-14",
    "distance": 25.5,
    "wikipediaUrl": "https://en.wikipedia.org/wiki/Battle_of_Hastings",
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/..."
  }
}
```

## Components

### 1. Enhanced Map Popups

Map markers now show enhanced popups with images:

- **With Image**: Blue markers with enhanced shadows
- **Without Image**: Red markers (standard)
- **Popup Content**: Image + event details + Wikipedia link

### 2. EventCard Component

A new `EventCard` component provides a rich card view:

```tsx
import { EventCard } from '@/components/EventCard'

<EventCard 
  event={eventData} 
  onClose={() => setSelectedEvent(null)} 
/>
```

Features:
- Responsive image display
- Loading states
- Error handling with fallbacks
- Formatted dates
- Distance information
- Wikipedia links

## Image Utilities

The `src/lib/image-utils.ts` file provides helper functions:

### `getEventImageUrl(imageUrl?, wikipediaUrl?)`
Gets the best available image URL, with fallback logic.

### `getWikipediaImageUrl(wikipediaUrl)`
Extracts images from Wikipedia articles.

### `getOptimizedImageUrl(imageUrl, width, height)`
Optimizes image URLs for specific dimensions.

### `getPlaceholderImageUrl(label)`
Generates placeholder images with event labels.

### `preloadImage(imageUrl)`
Preloads images for better performance.

## Usage Examples

### Basic Image Display

```tsx
{event.properties.imageUrl ? (
  <img 
    src={event.properties.imageUrl} 
    alt={event.properties.label}
    className="w-full h-32 object-cover rounded-lg"
  />
) : (
  <div className="bg-gray-100 h-32 flex items-center justify-center">
    <span className="text-gray-500">No image available</span>
  </div>
)}
```

### With Error Handling

```tsx
const [imageError, setImageError] = useState(false)

<img
  src={event.properties.imageUrl || getPlaceholderImageUrl(event.properties.label)}
  alt={event.properties.label}
  onError={() => setImageError(true)}
  className={imageError ? 'hidden' : 'block'}
/>
```

## Performance Considerations

1. **Lazy Loading**: Images are loaded only when needed
2. **Caching**: API responses are cached for 1 hour
3. **Optimization**: Images are automatically resized
4. **Fallbacks**: Graceful degradation when images fail to load

## Troubleshooting

### Common Issues

1. **No Images Appearing**
   - Check browser console for CORS errors
   - Verify Wikidata P18 property has valid URLs
   - Check Wikipedia API rate limits

2. **Slow Image Loading**
   - Images are fetched on-demand
   - Consider implementing image preloading for important events
   - Use placeholder images for better UX

3. **Image Quality Issues**
   - Adjust dimensions in `getOptimizedImageUrl()`
   - Check original image resolution on Wikimedia Commons

### Debug Mode

Enable debug logging by checking the browser console for:
- Wikidata query URLs
- Image processing steps
- Fallback attempts

## Future Enhancements

1. **Image Caching**: Implement local image caching
2. **Multiple Images**: Support for multiple images per event
3. **Image Categories**: Filter images by type (portraits, buildings, etc.)
4. **Custom Placeholders**: User-uploaded placeholder images
5. **Image Search**: Search for additional images on Wikimedia Commons

## API Rate Limits

- **Wikidata**: No strict limits, but be respectful
- **Wikipedia**: 200 requests per minute per IP
- **Wikimedia Commons**: No strict limits for image URLs

## Contributing

To add new image sources or improve image handling:

1. Update the SPARQL queries in `src/app/api/events/route.ts`
2. Enhance the image utilities in `src/lib/image-utils.ts`
3. Update the UI components to handle new image formats
4. Add tests for new functionality
5. Update this documentation
