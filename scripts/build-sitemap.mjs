import { writeFileSync } from 'node:fs';
const ORIGIN = 'https://architech-mc.ru';
const routes = ['/', '/rules', '/shop', '/wiki', '/terms', '/privacy'];
const now = new Date().toISOString();

const urls = routes.map(p => `
  <url>
    <loc>${ORIGIN}${p === '/' ? '' : p}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p==='/' ? '1.0' : '0.8'}</priority>
  </url>`).join('');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
writeFileSync('public/sitemap.xml', xml);
console.log('sitemap.xml written');
