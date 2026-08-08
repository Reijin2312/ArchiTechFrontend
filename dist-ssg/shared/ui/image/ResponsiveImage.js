import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IMAGES } from '../../../shared/images.manifest.js';
export function ResponsiveImage({ name, alt, className, sizes, eager, width, height }) {
    const entry = IMAGES[name];
    if (!entry)
        return null;
    const avifSet = entry.avif.map(v => `${v.path} ${v.w}w`).join(', ');
    const webpSet = entry.webp.map(v => `${v.path} ${v.w}w`).join(', ');
    const fallback = entry.webp.find(v => v.w >= 960)?.path ?? entry.original.webp ?? entry.original.png;
    return (_jsxs("picture", { children: [_jsx("source", { type: "image/avif", srcSet: avifSet, sizes: sizes }), _jsx("source", { type: "image/webp", srcSet: webpSet, sizes: sizes }), _jsx("img", { src: fallback, alt: alt, width: width ?? entry.original.w, height: height ?? entry.original.h, loading: eager ? 'eager' : 'lazy', decoding: "async", fetchPriority: eager ? 'high' : 'auto', className: className })] }));
}
