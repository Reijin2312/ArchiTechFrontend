import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

type Props = {
  src: string;
  onClose: () => void;
  onCropped: (blob: Blob) => void;
};

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas context');

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('failed to create blob'));
      resolve(blob);
    }, 'image/png');
  });
}

export function AvatarCropperDialog({ src, onClose, onCropped }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleCropComplete = (_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  };

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImg(src, croppedAreaPixels);
    onCropped(blob);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-sky-300">
          Обрезка аватара
        </h2>

        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-slate-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}              // реальная зона — квадрат
            cropShape="round"       // визуально — круг
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="mt-4">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl border border-sky-700 px-3 py-1.5 text-sm text-sky-300 hover:border-sky-500"
          >
            Обрезать и сохранить
          </button>
        </div>
      </div>
    </div>
  );
}