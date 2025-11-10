import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderToString } from 'react-dom/server';
import React from 'react';
const __dirname = dirname(fileURLToPath(import.meta.url));

const pagesMod = await import(pathToFileURL(join(process.cwd(), 'dist-ssg/pages.js')).href);
const metaMod  = await import(pathToFileURL(join(process.cwd(), 'dist-ssg/routesMeta.js')).href);
const routesMeta = metaMod.routesMeta;
const pages = pagesMod.pages;

const template = await readFile('dist/index.html', 'utf-8');

async function writeRoute(pathname) {
  const render = pages[pathname];
  if (!render) return;

  const appHtml = renderToString(React.createElement(render));
  const meta = routesMeta[pathname] || {};
  const head = [
    `<title>${meta.title || 'ArchiTech'}</title>`,
    meta.description ? `<meta name="description" content="${meta.description}">` : '',
    meta.canonical ? `<link rel="canonical" href="${meta.canonical}">` : '',
    meta.robots ? `<meta name="robots" content="${meta.robots}">` : '',
    `<meta property="og:title" content="${meta.title || 'ArchiTech'}">`,
    meta.description ? `<meta property="og:description" content="${meta.description}">` : '',
    meta.og?.url ? `<meta property="og:url" content="${meta.og.url}">` : '',
    `<meta property="og:type" content="${meta.og?.type || 'website'}">`,
    meta.og?.image ? `<meta property="og:image" content="${meta.og.image}">` : '',
    `<meta name="twitter:card" content="${meta.twitterCard || 'summary_large_image'}">`,
    ...(meta.jsonLd || []).map(b => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
  ].filter(Boolean).join('\n');

  let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
  html = html.replace('<!-- ssr-head -->', head);

  const out = pathname === '/' ? 'dist/index.html' : `dist${pathname}/index.html`;
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html, 'utf-8');
  console.log('prerendered', pathname, '→', out);
}

for (const pathname of Object.keys(pages)) await writeRoute(pathname);
