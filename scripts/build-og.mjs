import sharp from 'sharp';
import { promises as fs } from 'node:fs';

const SRC = 'public/images/screen1.png';
const LOGO = 'public/images/favicon-192.png';
const OUT = 'public/og/home.jpg';

const W = 1200, H = 630;

async function main() {
  await fs.mkdir('public/og', { recursive: true });

  let base = sharp(SRC)
    .resize(W, H, { fit: 'cover', position: 'centre' });

  const overlay = Buffer.alloc(W * H * 4, 0);
  
  const overlayImg = await sharp({
    create: { width: W, height: H, channels: 4, background: '#00000099' }
  }).png().toBuffer();

  const logoBuf = await sharp(LOGO).resize({ width: 140 }).png().toBuffer();

  const composed = await base
    .composite([
      { input: overlayImg, top: 0, left: 0 },
      { input: logoBuf, top: 40, left: 40 }
    ])
    .jpeg({ quality: 80, progressive: true, chromaSubsampling: '4:2:0' })
    .toFile(OUT);

  console.log('OG saved:', OUT, composed);
}

main().catch(e => { console.error(e); process.exit(1); });