# Radius Configuration Guide

This document explains how to easily change the search radius for historical events in the Places History application.

## Current Configuration

The default search radius is currently set to **10 miles** (16.09 kilometers).

## How to Change the Radius

### Option 1: Modify the Configuration File (Recommended)

1. Open `src/lib/config.ts`
2. Change the `DEFAULT_RADIUS_MILES` value:

```typescript
export const GEOGRAPHIC_CONFIG = {
  // Default search radius in miles
  DEFAULT_RADIUS_MILES: 25, // Change this value to your desired radius
  // ... other config
} as const
```

3. The application will automatically use the new radius in kilometers (calculated as `miles * 1.60934`)

### Option 2: Override via API Parameter

You can also override the default radius by passing the `r` parameter in API calls:

```
GET /api/events?lat=40.7128&lng=-74.0060&r=50
```

This would search within a 50km radius regardless of the default setting.

## What Gets Updated Automatically

When you change the `DEFAULT_RADIUS_MILES` in the config file, the following are automatically updated:

- ✅ Main page default radius
- ✅ API route default radius  
- ✅ All radius-related calculations
- ✅ Map component radius display

## Radius Limits

- **Minimum**: 1 mile (1.61 km)
- **Maximum**: 311 miles (500 km) - enforced by the API
- **Recommended**: 5-50 miles for optimal performance and relevance

## Examples

| Miles | Kilometers | Use Case |
|-------|------------|----------|
| 5     | 8.05       | Very local neighborhood search |
| 10    | 16.09      | **Current default** - City district search |
| 25    | 40.23      | Metropolitan area search |
| 50    | 80.47      | Regional search |
| 100   | 160.93     | State/province level search |

## Performance Considerations

- **Smaller radius** (5-25 miles): Faster queries, more relevant results
- **Larger radius** (50+ miles): Slower queries, broader coverage, may include less relevant events

## Troubleshooting

If you change the radius and experience issues:

1. **Check the browser console** for any errors
2. **Verify the config file** syntax is correct
3. **Restart the development server** if changes don't take effect
4. **Check API responses** to ensure the new radius is being used

## File Locations

- **Configuration**: `src/lib/config.ts`
- **Main page**: `src/app/page.tsx`
- **API route**: `src/app/api/events/route.ts`
- **Documentation**: `README.md` and this file
