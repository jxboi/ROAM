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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), seoFiles(env.VITE_SITE_URL ?? '')],
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
