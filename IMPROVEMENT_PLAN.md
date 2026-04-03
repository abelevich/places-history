# Places History - Improvement Plan

## Application Review Summary

**Places History** is a Next.js 15 app where users drop a marker on a Mapbox map and discover historical events nearby via Wikidata SPARQL queries. It uses Supabase for authentication and has a sidebar with event cards, radius/year controls, and sorting.

### Current Issues Identified

1. **~80% of results are town/settlement founding dates** - The SPARQL query uses `wdt:P571` (inception date), which matches every town, village, and city with a known founding year. These drown out actual historical events (battles, treaties, discoveries, etc.).

2. **Supabase free-tier DB pausing** - Supabase pauses inactive free-tier databases after ~1 week, making the app inaccessible. Currently Supabase is used *only* for authentication (email/password + Google OAuth). No database tables are actively used in the app.

3. **Limited engagement features** - No way to save, share, or categorize discoveries. No visual differentiation between event types. Limited mobile UX.

4. **No event categorization** - All events look the same on the map (red/blue pins) regardless of whether they're battles, buildings, births, or natural events.

5. **No shareable state** - Users can't share a specific location + radius + time range via URL.

---

## Implementation Tickets

### Ticket 1: Filter Out Settlements from Wikidata Results

**Priority:** High | **Effort:** Small

**Problem:** The SPARQL query in `src/lib/wikidata.ts` uses three date properties via UNION: `P585` (point in time), `P580` (start time), and `P571` (inception). The `P571` property matches the founding dates of every nearby settlement (cities, towns, villages), which constitutes ~80% of results and provides little historical value.

**Solution:**
Add a SPARQL `FILTER NOT EXISTS` clause to exclude entities that are instances of (`P31`) settlement types. Key Wikidata classes to exclude:
- `Q515` (city)
- `Q3957` (town)
- `Q532` (village)
- `Q5119` (capital city)
- `Q1549591` (big city)
- `Q486972` (human settlement)
- `Q56061` (administrative territorial entity)
- `Q3624078` (sovereign state)
- `Q6256` (country)

**Implementation:**
```sparql
# Add to the SPARQL query WHERE clause:
FILTER NOT EXISTS {
  ?item wdt:P31/wdt:P279* wd:Q486972 .  # human settlement (covers city, town, village via subclass)
}
```

Alternatively, add a UI toggle "Include settlement founding dates" (default: off) so users can opt-in.

**Files to modify:**
- `src/lib/wikidata.ts` - Add filter to SPARQL query
- `src/components/ControlPanel.tsx` - Add toggle (optional)
- `src/app/api/events/route.ts` - Pass filter parameter (optional)

---

### Ticket 2: Replace Supabase with NextAuth.js + SQLite

**Priority:** High | **Effort:** Large

**Problem:** Supabase free-tier pauses the database after inactivity, making the app completely inaccessible since auth depends on it. The app only uses Supabase for authentication - no database tables are actively queried.

**Solution:** Replace Supabase auth with **NextAuth.js (Auth.js v5)** backed by **SQLite** via `better-sqlite3`. This eliminates all external database dependencies and makes the app fully self-hosted.

**Why SQLite is sufficient:**
- The app is single-instance (no horizontal scaling needed)
- Auth data is small (users, sessions, accounts)
- SQLite handles concurrent reads well; writes are infrequent (only on login/signup)
- Zero operational overhead - just a file on disk
- Can later store favorites, search history, etc. in the same DB

**Tech choices:**
- `next-auth` (v5) - Auth framework with built-in OAuth support
- `better-sqlite3` - Fast, synchronous SQLite driver for Node.js
- `drizzle-orm` + `drizzle-kit` - Lightweight ORM with migration support (optional, can use raw SQL)

**Implementation steps:**
1. Install dependencies: `next-auth@beta better-sqlite3 @auth/drizzle-adapter drizzle-orm`
2. Create SQLite schema (users, accounts, sessions, verification_tokens)
3. Configure NextAuth with Credentials provider (email/password) and Google OAuth
4. Replace `AuthContext.tsx` with NextAuth's `SessionProvider`
5. Replace `middleware.ts` with NextAuth's built-in middleware
6. Remove all `@supabase/*` packages
7. Update environment variables (remove `NEXT_PUBLIC_SUPABASE_*`, add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
8. Migrate login/signup forms to use NextAuth's `signIn()`/`signOut()`
9. Add `.gitignore` entry for the SQLite database file

**Files to modify/create:**
- `src/lib/supabase.ts` → **Delete**
- `src/lib/db.ts` → **Create** (SQLite connection)
- `src/lib/auth.ts` → **Create** (NextAuth config)
- `src/app/api/auth/[...nextauth]/route.ts` → **Create**
- `src/contexts/AuthContext.tsx` → **Rewrite** (use NextAuth session)
- `src/middleware.ts` → **Rewrite** (use NextAuth middleware)
- `src/components/auth/LoginForm.tsx` → **Update**
- `src/components/auth/SignUpForm.tsx` → **Update**
- `src/components/auth/ProtectedRoute.tsx` → **Update**
- `src/components/auth/UserProfile.tsx` → **Update**
- `src/app/auth/callback/route.ts` → **Delete** (NextAuth handles this)
- `package.json` → Update dependencies

---

### Ticket 3: Add Event Type Categorization

**Priority:** Medium | **Effort:** Medium

**Problem:** All events appear identical on the map and in the sidebar. Users can't distinguish battles from building inaugurations from births at a glance.

**Solution:** Query the Wikidata `P31` (instance of) property for each result and map it to a human-readable category with a distinct color/icon.

**Category mapping:**
| Wikidata Class | Category | Color | Icon |
|---|---|---|---|
| Q178561 (battle) | Battle/Conflict | Red | Swords |
| Q41176 (building) | Architecture | Brown | Building |
| Q5 (human) | Person | Purple | Person |
| Q35127 (website), Q11424 (film) | Cultural | Teal | Star |
| Q8502 (mountain), Q4022 (river) | Natural Feature | Green | Mountain |
| Q1190554 (occurrence/event) | Event | Orange | Calendar |
| Other | Other | Gray | Pin |

**Implementation:**
1. Add `?itemType ?itemTypeLabel` to the SPARQL SELECT clause
2. Add `OPTIONAL { ?item wdt:P31 ?itemType }` to the query
3. Create a `categorizeEvent(typeUri: string): EventCategory` utility
4. Add `category` and `categoryColor` to `HistoricalEvent.properties`
5. Use category colors for map markers instead of red/blue
6. Add category badges to `EventCard`
7. Add category filter chips to the sidebar

**Files to modify:**
- `src/lib/wikidata.ts` - Extend SPARQL query
- `src/types/events.ts` - Add category types
- `src/lib/categories.ts` → **Create** (category mapping logic)
- `src/components/MapComponent.tsx` - Color-coded markers
- `src/components/EventCard.tsx` - Category badge
- `src/components/EventsDrawer.tsx` - Category filter chips

---

### Ticket 4: Add Shareable URL State

**Priority:** Medium | **Effort:** Small

**Problem:** Users can't share a specific view (location + radius + year range) with others. Every visit starts from scratch.

**Solution:** Sync the app state to URL search parameters. When a user selects a location, the URL updates to include `?lat=...&lng=...&r=...&from=...&to=...`. On page load, read these params and restore the state.

**Implementation:**
1. Use `useSearchParams()` from Next.js to read initial state
2. Use `router.replace()` to update URL without navigation on state change
3. On mount, if URL has params, auto-fetch events for that location

**Files to modify:**
- `src/app/page.tsx` - Read/write URL params, restore state on mount

---

### Ticket 5: Improve Mobile Responsiveness

**Priority:** Medium | **Effort:** Medium

**Problem:** The sidebar takes fixed width on desktop and 50vh on mobile. The map+sidebar layout doesn't work well on small screens. The control panel takes significant space.

**Solution:**
1. Make the sidebar a bottom sheet on mobile (slide up/down) instead of a fixed panel
2. Collapse the control panel into a floating action button that opens a modal
3. Make the map fullscreen on mobile with floating controls overlay
4. Add touch-friendly tap targets (minimum 44px)

**Files to modify:**
- `src/app/page.tsx` - Responsive layout restructure
- `src/components/ControlPanel.tsx` - Collapsible/modal variant
- `src/components/EventsDrawer.tsx` - Bottom sheet behavior
- `src/app/globals.css` - Mobile-specific styles

---

### Ticket 6: Add Event Clustering on Map

**Priority:** Low | **Effort:** Small

**Problem:** When many events are nearby, markers overlap and become unreadable.

**Solution:** Use Mapbox GL JS's built-in clustering via GeoJSON source with `cluster: true`. Show cluster counts and expand on click.

**Files to modify:**
- `src/components/MapComponent.tsx` - Add clustering configuration to the GeoJSON source

---

### Ticket 7: Add Favorites / Save Locations

**Priority:** Low | **Effort:** Medium

**Problem:** No way for users to save interesting discoveries. Every session starts fresh.

**Solution:** After Ticket 2 (SQLite), add a `favorites` table. Users can bookmark events and save location searches. Show a "Saved" tab in the sidebar.

**Depends on:** Ticket 2 (SQLite database)

**Implementation:**
1. Create `favorites` and `saved_searches` SQLite tables
2. Add bookmark button to `EventCard`
3. Add a "Saved" tab in the sidebar
4. API routes: `POST/DELETE /api/favorites`, `GET /api/favorites`

---

### Ticket 8: Add Timeline Visualization

**Priority:** Low | **Effort:** Medium

**Problem:** The year range inputs are basic number fields. There's no visual sense of how events distribute across time.

**Solution:** Add a draggable timeline range slider below the map or in the control panel. Show event density as a histogram on the slider track.

**Implementation:**
- Use a dual-handle range slider component
- Show mini histogram of event dates on the slider background
- Dragging the handles filters events in real-time

---

## Recommended Implementation Order

```
Phase 1 (Quick wins - high impact):
  1. Ticket 1: Filter settlements (fixes 80% noise problem)
  4. Ticket 4: Shareable URLs (small effort, big usability win)

Phase 2 (Infrastructure):
  2. Ticket 2: Replace Supabase with NextAuth + SQLite

Phase 3 (Engagement & polish):
  3. Ticket 3: Event categorization
  5. Ticket 5: Mobile responsiveness
  6. Ticket 6: Map clustering

Phase 4 (Nice-to-haves):
  7. Ticket 7: Favorites (depends on Phase 2)
  8. Ticket 8: Timeline visualization
```
