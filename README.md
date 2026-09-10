# ROAM

A mobile-first motorcycle trip planner. Discover eight curated rides across six continents, filter by destination, season and riding style, save favourites, compare three routes, and turn a ride into a personal plan.

## Run

```sh
npm install
npm run dev -- --port 5188 --strictPort
```

Open http://localhost:5188. Production: `npm run build`, then `npm run preview`.

## Included

- Responsive discovery, destination guides, suggested daily itineraries and seasonal recommendations.
- Search by destination/region, month, road style, duration, difficulty and daily budget; sort and share filtered URLs.
- Saved rides and three-way comparison.
- Multiple personal trips with dates, rider count, own/rental motorcycle, rest days, overnight stops and notes.
- Editable itemized USD budget, nights-aware lodging, fuel only on riding days, and 10% contingency.
- Preparation checklist, Markdown itinerary export, calendar export, and copyable plans.
- Local storage persistence; no login, backend or provider credentials required.
- Keyboard focus, accessible dialogs, reduced motion and responsive touch controls.

## Content and limits

These are sample planning itineraries, with approximate distances and editable budget assumptions, not live quotes, bookings or verified turn-by-turn navigation. Each destination links to an official tourism or park reference. Check current road access, weather, rental terms and licence requirements before travel. All photos are AI-generated illustrative travel imagery. Final optimized assets are in `public/images`.

Plans are stored in the current browser and do not sync between devices. Export a copy to retain or share a plan. Clearing browser storage removes local saved data. The app does not provide offline maps or bookings.

## Validation

`npm test` runs the filtering, budget, date, export and route-data consistency tests. `npm run lint` and `npm run build` check code quality and production compilation. Browser checks cover discovery, filtering, saving, comparison, planning, reload persistence, exports and responsive layouts. Design references and the implementation review are in `design`.

Built with React, TypeScript, Vite, Lucide, Manrope and DM Sans.
