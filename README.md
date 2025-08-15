# Places History

A Next.js 15+ application that allows users to explore historical events that occurred near any location on Earth. Users can drop a marker on an interactive map and discover historical events within 80km of that point.

## Features

- **Interactive Map**: Full-screen Mapbox GL JS map with draggable markers
- **Historical Events**: Query Wikidata for events with coordinates and temporal data
- **Real-time Results**: Right-hand drawer displays events ordered by distance
- **Responsive Design**: Clean, modern UI built with Tailwind CSS
- **Performance Optimized**: Debounced API calls and 1-hour caching
- **User Authentication**: Secure login/signup with Supabase, including Google OAuth
- **Protected Routes**: Application is secured behind authentication

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Maps**: Mapbox GL JS
- **Data Source**: Wikidata SPARQL API
- **Caching**: Next.js unstable_cache
- **Authentication**: Supabase Auth with OAuth providers
- **Database**: Supabase PostgreSQL (optional)

## Quick Start

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase authentication**:
   Follow the detailed setup guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   
   Quick setup:
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create `.env.local` with your credentials

3. **Set up environment variables**:
   ```bash
   npm run setup
   ```
   
   This will create a `.env.local` file. Edit it and add your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
   ```
   
   Get a free Mapbox token from [mapbox.com](https://account.mapbox.com/access-tokens/)

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)
   You'll be redirected to `/auth` to create an account or sign in

## Authentication Features

- **User Registration**: Create accounts with username, email, and password
- **User Login**: Sign in with email/password
- **Google OAuth**: One-click sign-in with Google accounts
- **Protected Routes**: All application features require authentication
- **Session Management**: Automatic session handling and refresh
- **User Profiles**: Display username and email in the top-right corner

## Usage

1. **Sign up or log in** at the authentication page
2. **Click anywhere on the map** to place a draggable marker
3. **Drag the marker** to a new location to update results
4. **View historical events** in the right-hand drawer
5. **Click on event pins** on the map for detailed popups
6. **Sign out** using the button in the top-right corner

## API Endpoints

### GET /api/events

Query historical events near a location.

**Parameters**:
- `lat` (number): Latitude of the center point
- `lng` (number): Longitude of the center point  
- `r` (number): Search radius in kilometers (default: 80, max: 500)
- `coordinates` (boolean): If `true`, returns only coordinates; if `false` or omitted, returns full event details

**Response**: GeoJSON FeatureCollection with historical events

**Examples**:

**Full response with all properties**:
```
GET /api/events?lat=40.7128&lng=-74.0060&r=80
```

**Coordinates-only response**:
```
GET /api/events?lat=40.7128&lng=-74.0060&r=80&coordinates=true
```

**Response formats**:

*Full response* includes: `id`, `label`, `description`, `date`, `distance`, `wikipediaUrl`, `imageUrl`
*Coordinates-only response* includes: only `coordinates` in properties

## Architecture

### Frontend Components

- **MapComponent**: Handles Mapbox GL JS integration and marker management
- **EventsDrawer**: Displays historical events in a responsive sidebar
- **Dynamic Imports**: Mapbox loaded client-side to avoid SSR issues

### Backend API

- **SPARQL Queries**: Uses Wikidata's `wikibase:around` service for geographic filtering
- **Caching**: 1-hour cache with `unstable_cache` for identical queries
- **Error Handling**: Comprehensive error states and validation
- **GeoJSON**: Standard format for geographic data exchange

### Data Flow

1. User clicks/drags marker on map
2. Frontend calls `/api/events` with coordinates
3. API queries Wikidata SPARQL endpoint
4. Results cached and returned as GeoJSON
5. Frontend renders events as pins and list items

## Troubleshooting

### Map Not Loading

If the map doesn't appear, check:

1. **Mapbox Token**: Ensure your `.env.local` file contains a valid Mapbox token
2. **Token Format**: The token should start with `pk.`
3. **Server Restart**: Restart the development server after adding the token
4. **Browser Console**: Check for error messages in the browser console

### Common Issues

- **"Mapbox Token Missing"**: Run `npm run setup` and add your token to `.env.local`
- **"Style not loaded"**: This usually resolves automatically, but try refreshing the page
- **Container dimensions undefined**: The map will retry initialization automatically

## Future Enhancements

### Database Integration
- **PostGIS**: Store and query historical events locally
- **Spatial Indexing**: Optimize geographic queries
- **Full-text Search**: Search events by description/keywords

### Advanced Features
- **Timeline Filter**: Filter events by date range
- **Event Clustering**: Group nearby events on map
- **Event Categories**: Filter by event type (battles, births, etc.)
- **User Accounts**: Save favorite locations and events
- **Export**: Download event data as CSV/GeoJSON

### Performance Improvements
- **CDN Caching**: Cache static assets globally
- **Database Indexing**: Optimize spatial queries
- **Lazy Loading**: Load events as user scrolls
- **Service Worker**: Offline support for cached data

### UI/UX Enhancements
- **Dark Mode**: Toggle between light/dark themes
- **Mobile Optimization**: Touch-friendly interactions
- **Accessibility**: Screen reader support and keyboard navigation
- **Internationalization**: Multi-language support

## Development

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details 