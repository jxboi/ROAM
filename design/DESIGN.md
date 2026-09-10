# ROAM design specification

Primary references: discovery-concept.png and mobile-concept.png. The desktop concept governs discovery; the mobile concept governs responsive navigation and trip detail anatomy.

## Visual system
- Background #FAFAF7 (warm white), surface #FFFFFF, forest #183B32, deeper ink #10332E, muted #717975, line #E0E4DE, sage #E8EDE3, orange #ED661B.
- Manrope 700–800 headings and wordmark; DM Sans 400–600 body and controls. Desktop hero 62/1.04, mobile 39/1.08; section 32/1.2, mobile 27/1.2; card title 23; body 15–16, small 12–13. No browser-default control typography.
- Max width 1240, desktop gutters 48, mobile gutters 20. Spacing 4, 8, 12, 16, 24, 32, 48, 64, 80.
- Image radius 10, panels 16, pills 999. Minimal shadows confined to overlapping search, floating actions and dialogs.
- Lucide line icons, 1.7 stroke, 18–22px; custom winding-road brand. Orange arrows express forward movement. Filled heart indicates saved.
- Full-bleed cinematic hero, native overlay copy, natural dark left of image; small neutral gradient only if contrast requires it. Destination images use no color tint. Generated destination imagery is illustrative and disclosed in the app.
- Open cards with images and unboxed text, pill filters, horizontal separators, sage seasonal band. Mobile single column plus bottom navigation. Desktop three columns.

## Exact first-screen copy
ROAM; Explore; Saved rides; My trips; Life’s better around the bend.; Find your next great ride. We’ll help with the rest.; Explore the possibilities; Where; Anywhere; When; Any month; Ride style; All roads; Find my ride; Where will the road take you?; Extraordinary places. Even better rides.; View all destinations; All rides; Mountain passes; Coastal roads; Off the beaten path; Weekend escapes.

## Functional extensions required by the user
Discovery filters by text/region, month, style, duration, difficulty and budget with shareable URL state. Save routes, compare up to three, read route details and day plans. Create multiple personal trips, set date and pace, estimate itemized budget, add rest days, save notes and checklist, export a plan. Persistence is local to this browser. No booking claims or fake live pricing. Destination routes and costs are editorial planning estimates; exact road navigation links are separate.

Intentional factual deviations: concept prices are replaced with distinct transparent estimated daily costs; Ha Giang duration becomes a 4-day sample; distances are explicitly approximate. A signed-out local profile replaces fake personal initials. Missing required planner states extend the same visual system.

## Architecture
React/Vite/TypeScript. App composition, shell/navigation, shared cards and dialogs, route data, pure filtering/budget/date helpers, persisted state provider, discover/detail/saved/compare/trips/planner pages. Responsive at 640/900/1200px. Dialogs have focus management; reduced motion and keyboard use supported.
