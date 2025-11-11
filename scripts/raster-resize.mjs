import { promises as fs } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const SRC_DIR = 'public/images';
const OUT_DIR = 'public/images';
const SKIP_NAMES = /^(favicon|apple-touch-icon|ely-icon)(?:-|\.|$)/i;
const INPUT_EXTS = new Set(['.png', '.jpg', '.jpeg']);

const TARGET_WIDTHS = [320, 640, 960, 1280, 1600, 1920];
const AVIF_QUALITY = 45;
const WEBP_QUALITY = 80;

async function exists(p) { try { await fs.stat(p); return true; } catch { return false; } }
async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function toWeb(p) {
  const norm = p.replace(/\\/g, '/');
  return '/' + norm.replace(/^public\//i, '');
}

function makeBase(outDir, file) {
  const ext = extname(file);
  const base = basename(file, ext);
  return { ext, base, dir: outDir };
}
function buildOutPath(dir, base, w, fmt) {
  return join(dir, `${base}-${w}.${fmt}`);
}
function buildOriginalOut(dir, base, fmt) {
  return join(dir, `${base}.${fmt}`);
}

async function processImage(file) {
  const ext = extname(file).toLowerCase();
  const name = basename(file);
  if (!INPUT_EXTS.has(ext)) return null;
  if (SKIP_NAMES.test(name)) return null;

  const img = sharp(file, { limitInputPixels: false });
  const meta = await img.metadata();
  const { width: ow, height: oh, hasAlpha } = meta;
  if (!ow || !oh) return null;

  const widths = TARGET_WIDTHS.filter(w => w <= ow);
  if (widths.length === 0) widths.push(ow);

  const { base, dir } = makeBase(OUT_DIR, file);
  const variants = { avif: [], webp: [] };

  const origAvifFs = buildOriginalOut(dir, base, 'avif');
  const origWebpFs = buildOriginalOut(dir, base, 'webp');

  for (const w of widths) {
    const pipe = sharp(file).resize({ width: w, withoutEnlargement: true });

    const outAvifFs = buildOutPath(dir, base, w, 'avif');
    const outWebpFs = buildOutPath(dir, base, w, 'webp');

    if (!(await exists(outAvifFs))) {
      await pipe.clone().avif({
        quality: AVIF_QUALITY,
        effort: 4,
        chromaSubsampling: '4:2:0',
        lossless: false
      }).toFile(outAvifFs);
      console.log('avif', outAvifFs);
    }
    variants.avif.push({ w, path: toWeb(outAvifFs) });

    if (!(await exists(outWebpFs))) {
      await pipe.clone().webp({
        quality: WEBP_QUALITY,
        alphaQuality: hasAlpha ? 80 : 100,
        effort: 4
      }).toFile(outWebpFs);
      console.log('webp', outWebpFs);
    }
    variants.webp.push({ w, path: toWeb(outWebpFs) });
  }

  if (!(await exists(origAvifFs))) {
    await sharp(file).avif({ quality: AVIF_QUALITY, effort: 4 }).toFile(origAvifFs);
    console.log('avif', origAvifFs);
  }
  if (!(await exists(origWebpFs))) {
    await sharp(file).webp({ quality: WEBP_QUALITY, effort: 4 }).toFile(origWebpFs);
    console.log('webp', origWebpFs);
  }

  return {
    name,
    original: {
      w: ow, h: oh,
      png: toWeb(file),
      avif: toWeb(origAvifFs),
      webp: toWeb(origWebpFs)
    },
    variants
  };
}

async function main() {
  const list = [];
  for await (const p of walk(SRC_DIR)) {
    if (!INPUT_EXTS.has(extname(p).toLowerCase())) continue;
    const info = await processImage(p);
    if (info) list.push(info);
  }

  const manifest = {};
  for (const it of list) {
    manifest[it.name] = {
      original: it.original,
      avif: it.variants.avif,
      webp: it.variants.webp
    };
  }

  await fs.writeFile('public/images.manifest.json', JSON.stringify(manifest, null, 2));
  await fs.writeFile(
    'src/shared/images.manifest.ts',
    `// auto-generated
export type ImgVariant = { w:number; path:string };
export type ImgEntry = { original:{ w:number; h:number; png:string; avif:string; webp:string }; avif:ImgVariant[]; webp:ImgVariant[] };
export const IMAGES: Record<string, ImgEntry> = ${JSON.stringify(manifest, null, 2)} as const;
`
  );

  console.log('Done. Variants and manifest generated.');
}

main().catch(e => { console.error(e); process.exit(1); });
