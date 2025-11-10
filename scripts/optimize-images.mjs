import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const dir = 'public/images';
const exts = new Set(['.png', '.jpg', '.jpeg']);

for (const f of await readdir(dir)) {
  const ext = extname(f).toLowerCase();
  if (!exts.has(ext)) continue;
  const inPath = join(dir, f);
  const st = await stat(inPath);
  if (st.size <= 80_000) continue;
  const base = f.replace(/\.(png|jpe?g)$/i, '');
  await sharp(inPath).avif({ quality: 45 }).toFile(join(dir, base + '.avif'));
  await sharp(inPath).webp({ quality: 80 }).toFile(join(dir, base + '.webp'));
  console.log('converted', f);
}