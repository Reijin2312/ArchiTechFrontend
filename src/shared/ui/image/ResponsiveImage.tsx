import { IMAGES } from '@/shared/images.manifest';

type Props = {
  name: keyof typeof IMAGES;
  alt: string;
  className?: string;
  sizes?: string;
  eager?: boolean;
  width?: number;
  height?: number;
};

export function ResponsiveImage({ name, alt, className, sizes, eager, width, height }: Props) {
  const entry = IMAGES[name as string];
  if (!entry) return null;

  const avifSet = entry.avif.map(v => `${v.path} ${v.w}w`).join(', ');
  const webpSet = entry.webp.map(v => `${v.path} ${v.w}w`).join(', ');

  const fallback = entry.webp.find(v => v.w >= 960)?.path ?? entry.original.webp ?? entry.original.png;

  return (
    <picture>
      <source type="image/avif" srcSet={avifSet} sizes={sizes} />
      <source type="image/webp" srcSet={webpSet} sizes={sizes} />
      <img
        src={fallback}
        alt={alt}
        width={width ?? entry.original.w}
        height={height ?? entry.original.h}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' as const : 'auto' as const}
        className={className}
      />
    </picture>
  );
}