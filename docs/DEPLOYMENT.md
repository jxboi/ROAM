# Deploying ROAM

ROAM builds to a directory of static files. Any host that can serve them, and
send unknown paths to `index.html`, will do.

## Build

```sh
npm ci
VITE_SITE_URL=https://your-domain.example npm run build
```

`VITE_SITE_URL` is the origin the site will be served from, without a trailing
slash. It is used for canonical links, Open Graph URLs and `sitemap.xml`. Leave
it unset and the app falls back to whatever origin the browser loaded it from —
correct at runtime, but the build then skips `sitemap.xml`, which needs absolute
URLs.

The output lands in `dist/`. There is no server component and no runtime
configuration: everything is decided at build time.

## The one requirement: single-page fallback

ROAM uses real URLs (`/ride/dolomites`, `/trips/<id>`). A host that only serves
files will return 404 for all of them, including a plain refresh. Every path
that is not a file must return `index.html` with a 200.

Configuration for the common hosts is committed:

| Host | File | Notes |
| --- | --- | --- |
| Netlify, Cloudflare Pages | `public/_redirects`, `public/_headers` | Copied into `dist/` by the build. |
| Vercel | `vercel.json` | Rewrites and headers. |
| nginx, containers | `deploy/nginx.conf`, `deploy/security-headers.conf` | Used by the `Dockerfile`. |

A test (`src/test/deploy.test.ts`) asserts these three stay in agreement about
the fallback and the security headers.

## Headers

Each host config sets the same headers:

- A content security policy allowing no inline or third-party scripts, no
  framing and no cross-origin connections. The app loads nothing from another
  origin, so this can stay strict. `style-src` allows `unsafe-inline` because
  markup style attributes need it; scripts do not.
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and HSTS where TLS is
  terminated by the host.
- Hashed `/assets` are immutable for a year. Hand-named imagery under
  `/images`, `/social` and `/icons` revalidates daily and serves stale while it
  does. HTML always revalidates, so a deploy is picked up on the next visit.

## Docker

```sh
docker build --build-arg VITE_SITE_URL=https://your-domain.example -t roam .
docker run --rm -p 8080:8080 roam
```

The image builds the bundle on `node:22-alpine` and serves it from nginx on port
8080, with the config above.

## Checking a build locally

```sh
npm run build
npm run serve        # http://127.0.0.1:4173
```

`npm run serve` serves `dist/` with the same header rules and single-page
fallback as the hosts, by reading `dist/_headers`. It is what the end-to-end
suites run against, in Chromium, Firefox and WebKit, so a broken policy or a 404
on a deep link fails in CI rather than in production. `npm run preview` is Vite's own preview server and
does not apply those rules.

## After deploying

- Confirm a deep link loads directly: `curl -sI https://your-domain.example/ride/dolomites`
  should return 200 and HTML.
- Confirm `robots.txt` and `sitemap.xml` are served, and that the sitemap's URLs
  use the right origin.
- Paste a ride URL into a link preview tool; it should show that ride's title,
  description and share card rather than the home page's.

## Regenerating imagery

Share cards, responsive image widths and icons are all derived from the source
photography and the mark:

```sh
npm run assets
```

Run it after changing a destination photo, adding a ride, or changing
`public/favicon.svg`, and commit the results. The width ladder lives in that
script and is mirrored in `src/lib/images.ts`; a test fails if the two disagree
about which files exist.

## The service worker

`dist/sw.js` is generated at build time from `src/sw.ts` with the list of shell
files injected. It precaches the shell (about 570 KB: HTML, JS, CSS, fonts and
icons) and caches destination photography as it is actually viewed, so a first
visit does not download every image.

Two things must hold for updates to land:

- `sw.js` must be served with a short cache lifetime. The committed header rules
  give it `max-age=0, must-revalidate` along with the rest of the HTML-shaped
  responses; do not move it under a long-lived rule.
- The content security policy must allow `worker-src 'self'`. It does, in all
  three host configs.

A new build does not take over a running tab: the new worker installs and waits,
the app shows a "newer version is ready" prompt, and only then does the page
reload onto it. Routes are code-split, so swapping builds under a live tab is
how you get a failed chunk request mid-plan.

Nothing here breaks a browser without service worker support: registration
failure is caught and the site works as an ordinary web app.
