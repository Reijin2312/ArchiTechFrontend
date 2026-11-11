import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useI18n } from '@/shared/i18n/I18nProvider';

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

const TARGET_SIZE = 512;

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas context');

  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('failed to create blob'));
      resolve(blob);
    }, 'image/png');
  });
}

export function AvatarCropperDialog({ src, onClose, onCropped }: Props) {
  const { language } = useI18n();
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
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 [.at-secondary-skin_&]:border-[rgba(239,232,218,0.22)] bg-slate-950 [.at-secondary-skin_&]:bg-[rgba(25,27,24,0.85)] p-4 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-sky-300 [.at-secondary-skin_&]:text-[#d8bc91]">
          {language === 'ru' ? 'Обрезка аватара' : 'Crop avatar'}
        </h2>

        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-slate-900 [.at-secondary-skin_&]:bg-[rgba(33,35,31,0.91)]">
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
            className="rounded-xl border border-slate-700 [.at-secondary-skin_&]:border-[rgba(239,232,218,0.22)] px-3 py-1.5 text-sm hover:border-slate-500"
          >
            {language === 'ru' ? 'Отмена' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl border border-sky-700 [.at-secondary-skin_&]:border-[rgba(197,170,132,0.58)] px-3 py-1.5 text-sm text-sky-300 [.at-secondary-skin_&]:text-[#d8bc91] hover:border-sky-500 [.at-secondary-skin_&]:hover:border-[#cfb28c]"
          >
            {language === 'ru' ? 'Обрезать и сохранить' : 'Crop and save'}
          </button>
        </div>
      </div>
    </div>
  );
}
