import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { rides } from './src/data/rides';

/**
 * robots.txt and sitemap.xml are generated from the ride data so a new route
 * cannot be forgotten. A sitemap needs absolute URLs, so it is only written
 * when VITE_SITE_URL names the deployed origin.
 */
function seoFiles(siteUrl: string): Plugin {
  const origin = siteUrl.trim().replace(/\/+$/, '');
  return {
    name: 'roam:seo-files',
    apply: 'build',
    generateBundle() {
      const privateRoutes = ['/saved', '/compare', '/trips'];
      const robots = [
        'User-agent: *',
        'Allow: /',
        ...privateRoutes.map(route => `Disallow: ${route}`),
        '',
        ...(origin ? [`Sitemap: ${origin}/sitemap.xml`, ''] : []),
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });

      if (!origin) {
        this.warn('VITE_SITE_URL is not set, so sitemap.xml was skipped. Set it to the deployed origin.');
        return;
      }
      const lastmod = new Date().toISOString().slice(0, 10);
      const urls = [
        { loc: '/', priority: '1.0', changefreq: 'weekly' },
        ...rides.map(ride => ({ loc: `/ride/${ride.id}`, priority: '0.8', changefreq: 'monthly' })),
      ];
      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map(({ loc, priority, changefreq }) =>
          `  <url><loc>${origin}${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`),
        '</urlset>',
        '',
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
  };
}

/** Files the worker precaches: the shell only. Destination photography is
 *  cached as it is actually viewed, rather than making a first visit download
 *  every image. */
const SHELL_PATTERN = /\.(js|css|html|woff2)$/;
const EXTRA_SHELL_FILES = ['favicon.svg', 'manifest.webmanifest'];
const EXTRA_SHELL_FOLDERS = ['icons'];

const revision = (contents: string | Uint8Array) =>
  createHash('sha256').update(contents).digest('hex').slice(0, 16);

function publicShellFiles(publicDir: string) {
  const entries: { url: string; revision: string }[] = [];
  const add = (relative: string) => {
    const full = path.join(publicDir, relative);
    if (!statSync(full).isFile()) return;
    entries.push({ url: `/${relative.split(path.sep).join('/')}`, revision: revision(readFileSync(full)) });
  };
  for (const file of EXTRA_SHELL_FILES) add(file);
  for (const folder of EXTRA_SHELL_FOLDERS) {
    for (const file of readdirSync(path.join(publicDir, folder))) add(path.join(folder, file));
  }
  return entries;
}

/**
 * Builds src/sw.ts as a second entry at a stable /sw.js, and replaces its
 * __ROAM_SHELL__ placeholder with the real shell file list. This is the whole
 * job a PWA plugin would do here — the caching policy is hand-written in
 * src/sw.ts — so it is done inline rather than pulling in the toolchain.
 */
function serviceWorker(): Plugin {
  let publicDir = '';
  return {
    name: 'roam:service-worker',
    apply: 'build',
    // Vite emits index.html during generateBundle, so this has to run after it
    // or the document — the one file every navigation needs — is left out.
    enforce: 'post',
    config: () => ({
      build: {
        rollupOptions: {
          input: { main: 'index.html', sw: 'src/sw.ts' },
          output: {
            // The worker's scope is its own path, so it cannot be hashed.
            entryFileNames: (chunk: { name: string }) =>
              chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js',
          },
        },
      },
    }),
    configResolved(resolved) { publicDir = resolved.publicDir; },
    generateBundle(_options, bundle) {
      const worker = bundle['sw.js'];
      if (!worker || worker.type !== 'chunk') {
        this.error('sw.js was not emitted; the service worker entry is misconfigured');
        return;
      }
      const shell = Object.values(bundle)
        .filter(output => output.fileName !== 'sw.js' && SHELL_PATTERN.test(output.fileName))
        .map(output => ({
          url: `/${output.fileName}`,
          revision: revision(output.type === 'chunk' ? output.code : (output.source as string | Uint8Array)),
        }));
      const manifest = [...shell, ...publicShellFiles(publicDir)].sort((a, b) => a.url.localeCompare(b.url));
      if (!manifest.some(entry => entry.url === '/index.html')) {
        this.error('the precache manifest has no /index.html, so the app could not open offline');
        return;
      }
      if (!worker.code.includes('self.__ROAM_SHELL__')) {
        this.error('src/sw.ts no longer references self.__ROAM_SHELL__');
        return;
      }
      worker.code = worker.code
        .replace('self.__ROAM_SHELL__', JSON.stringify(manifest))
        // The substitution invalidates the offsets, so ship no map rather than
        // a misleading one. The worker is a few kilobytes of readable code.
        .replace(/\n?\/\/# sourceMappingURL=sw\.js\.map\s*$/, '\n');
      delete bundle['sw.js.map'];
      this.info(`service worker precaches ${manifest.length} shell files`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      seoFiles(env.VITE_SITE_URL ?? ''),
      serviceWorker(),
    ],
    build: {
      target: 'es2022',
      sourcemap: true,
      reportCompressedSize: true,
      rollupOptions: {
        output: {
          // React and the router change far less often than the app does, so
          // keep them in their own long-lived chunk across deploys.
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          },
        },
      },
    },
  };
});
