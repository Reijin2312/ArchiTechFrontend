import fs from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import React from 'react'

const cwd = process.cwd()
const exists = p => fs.existsSync(p)
const first = arr => arr.find(exists) ?? null

const pagesFile = first([
  resolve(cwd, 'dist-ssg/ssg/pages.js'),
  resolve(cwd, 'dist-ssg/pages.js'),
  resolve(cwd, 'dist-ssg/ssg/pages.mjs'),
  resolve(cwd, 'dist-ssg/pages.mjs')
])
if (!pagesFile) throw new Error('Не найден pages.(mjs|js) в dist-ssg')

const routesMetaFile = first([
  resolve(cwd, 'dist-ssg/shared/seo/routesMeta.js'),
  resolve(cwd, 'dist-ssg/routesMeta.js')
])
if (!routesMetaFile) throw new Error('Не найден routesMeta.js в dist-ssg')

const { pages } = await import(pathToFileURL(pagesFile).href)
const { routesMeta } = await import(pathToFileURL(routesMetaFile).href)

const template = await readFile('dist/index.html', 'utf-8')

async function writeRoute(pathname) {
  const Render = pages[pathname]
  if (!Render) return

  const appHtml = renderToString(
    React.createElement(
      StaticRouter,
      { location: pathname },
      React.createElement(Render)
    )
  )

  const meta = routesMeta[pathname] || {}
  const keywords = Array.isArray(meta.keywords) ? meta.keywords.join(', ') : meta.keywords

  const ogImage = (meta.og && meta.og.image) || meta.twitterImage;

  const head = [
    `<title>${meta.title || 'ArchiTech'}</title>`,
    meta.description ? `<meta name="description" content="${meta.description}">` : '',
    keywords ? `<meta name="keywords" content="${keywords}">` : '',
    meta.canonical ? `<link rel="canonical" href="${meta.canonical}">` : '',
    meta.robots ? `<meta name="robots" content="${meta.robots}">` : '',
    `<meta property="og:title" content="${meta.title || 'ArchiTech'}">`,
    meta.description ? `<meta property="og:description" content="${meta.description}">` : '',
    meta.og?.url ? `<meta property="og:url" content="${meta.og.url}">` : '',
    `<meta property="og:type" content="${meta.og?.type || 'website'}">`,
    ogImage ? `<meta property="og:image" content="${ogImage}">` : '',
    `<meta name="twitter:card" content="${meta.twitterCard || 'summary_large_image'}">`,
    ogImage ? `<meta name="twitter:image" content="${ogImage}">` : '',
    ...(meta.jsonLd || []).map(b => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
  ].filter(Boolean).join('\n');

  let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
  html = html.replace('<!-- ssr-head -->', head)

  const out = pathname === '/' ? 'dist/index.html' : `dist${pathname}/index.html`
  await mkdir(resolve(out, '..'), { recursive: true })
  await writeFile(out, html, 'utf-8')
  console.log('prerendered', pathname, '→', out)
}

for (const pathname of Object.keys(pages)) {
  try { await writeRoute(pathname) }
  catch (e) { console.error('SSG fail at', pathname, e) }
}
