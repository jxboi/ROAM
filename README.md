# ROAM

[![CI](https://github.com/jxboi/ROAM/actions/workflows/ci.yml/badge.svg)](https://github.com/jxboi/ROAM/actions/workflows/ci.yml)

A mobile-first motorcycle trip planner. Discover eight curated rides across six
continents, filter by destination, season and riding style, save favourites,
compare three routes, and turn a ride into a personal plan.

No account, no backend, no third-party requests at runtime. Everything a visitor
saves stays in their own browser.

## Run it

```sh
npm install
npm run dev
```

Then open the URL Vite prints. To check a production build the way a host will
serve it:

```sh
npm run build
npm run serve      # http://127.0.0.1:4173, with the production headers
```

Requires Node 22 (see `.nvmrc`).

## What it does

- Responsive discovery, destination guides, suggested daily itineraries and
  seasonal recommendations.
- Search by destination or region, month, road style, duration, difficulty and
  daily budget; sort results and share the filtered URL.
- Saved rides and a three-way comparison.
- Multiple personal trips with dates, rider count, own or rental motorcycle,
  rest days, overnight stops and notes.
- An editable itemised USD budget: nights-aware lodging, fuel only on riding
  days, and a 10% contingency.
- A preparation checklist, Markdown itinerary export, calendar (ICS) export, and
  a copyable plan.
- A JSON backup of everything saved on the device, and a restore that adds those
  plans back alongside anything already there rather than replacing them.
- Installable, and readable with no signal: the app shell is precached and
  destination photography is cached as it is looked at, so a plan stays open on
  the road. A new build waits behind a prompt rather than swapping itself in.
- Keyboard focus management, accessible dialogs, reduced-motion support and
  responsive touch controls.

## How it is put together

| Path | What lives there |
| --- | --- |
| `src/data/rides.ts` | The eight routes: itineraries, costs, seasons and source references. |
| `src/lib/planning.ts` | Filtering, budget maths, dates and the Markdown/ICS exports. |
| `src/lib/persistence.ts` | Reads stored state back, repairing anything malformed. |
| `src/lib/backup.ts` | The backup file format, and merging a restore into what is already here. |
| `src/sw.ts` | The service worker: what is precached, what is cached as it is used, and how updates land. |
| `src/lib/store.tsx` | The React store: saved rides, comparisons, trips, and persistence. |
| `src/lib/meta.ts` | Per-route title, description, Open Graph tags and structured data. |
| `src/pages`, `src/components` | The routed pages and the shared UI. |
| `e2e/` | Playwright suites, run against the real build. |
| `deploy/`, `public/_headers`, `vercel.json` | Host configuration (see below). |

Stored plans are validated and clamped on the way in, so a partial write or an
older payload is repaired rather than thrown away, and a trip that no longer
points at a real route is dropped rather than crashing an export.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server. |
| `npm run build` | Typecheck and build to `dist/`. |
| `npm run serve` | Serve `dist/` with the production headers and SPA fallback. |
| `npm test` | Unit tests. `test:watch` and `test:coverage` too. |
| `npm run test:e2e` | Playwright end-to-end and accessibility suites. |
| `npm run typecheck` / `npm run lint` | Types and lint (lint fails on warnings). |
| `npm run check:size` | Fail if the gzipped first-load bundle exceeds its budget. |
| `npm run assets` | Regenerate share cards and PWA icons from the source imagery. |
| `npm run verify` | Everything except the end-to-end suite. |

## Validation

`npm run verify` runs the typecheck, lint, the unit tests behind coverage gates,
the production build, and the bundle budget.

`npm run test:e2e` runs the browser suites against the built app, served with the
deployed header and rewrite rules, across Chromium, Firefox and WebKit at desktop
and phone sizes:

- discovery, filtering, sorting and shareable filter URLs
- saving, the three-way comparison, and the whole planning flow including the
  Markdown and calendar exports
- backup and restore, including carrying a trip into a browser that has never
  seen it
- offline: the app, a deep link, a saved trip and its photography with the
  network switched off
- deep links, per-route metadata and the production security headers
- axe scans at WCAG 2.2 AA on every page and dialog, plus forced-colours mode

Both run in CI on every push and pull request, alongside an audit of production
dependencies.

Design references and the original implementation review are in `design/`.

## Deploying

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). In short: build with
`VITE_SITE_URL` set to the deployed origin, publish `dist/`, and make sure the
host returns `index.html` for unknown paths — configuration for Netlify,
Cloudflare Pages, Vercel, nginx and Docker is committed.

## Content and limits

These are sample planning itineraries, with approximate distances and editable
budget assumptions — not live quotes, bookings or verified turn-by-turn
navigation. Each destination links to an official tourism or park reference.
Check current road access, weather, rental terms and licence requirements before
travel. All photos are AI-generated illustrative travel imagery.

Plans are stored in the current browser and do not sync between devices. Take a
backup from the profile panel before clearing browser data or moving to another
device, and export a trip to keep or share a single plan. Pages and plans you
have already opened stay available offline; the app does not provide offline
maps or bookings.

Built with React, TypeScript, Vite, Lucide, Manrope and DM Sans.
