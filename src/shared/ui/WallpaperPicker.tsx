import { useRef } from 'react';
import { DragDropZone } from '@/shared/ui/DragDropZone';

export function WallpaperPicker(props: {
  value: string;
  busy?: boolean;
  onChange: (file: File) => void | Promise<void>;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handleClick = () => {
    if (props.busy) return;
    inputRef.current?.click();
  };

  const handleFile = (file: File) => {
    props.onChange(file);
  };

  return (
    <div className="space-y-3">
      <DragDropZone onFile={handleFile} accept="image/*" maxSize={5 * 1024 * 1024}>
        <button
          type="button"
          onClick={handleClick}
          className="group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-6 text-center hover:border-sky-600 hover:bg-slate-900/80"
        >
          {props.value ? (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="h-32 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={props.value}
                  alt="Обои профиля"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="text-xs text-slate-300">
                Нажмите, чтобы выбрать другой файл, или перетащите сюда изображение
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-200">
                🖼️
              </div>
              <div className="text-xs text-slate-300">
                Перетащите сюда изображение или нажмите для выбора файла
              </div>
              <div className="text-[11px] text-slate-500">PNG/JPG до 5 МБ, желательно 1920×1080 или шире</div>
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            handleFile(file);
            e.target.value = '';
          }}
        />
      </DragDropZone>

      {props.value && (
        <div className="flex justify-between text-xs text-slate-400">
          <span>Текущие обои установлены</span>
          {props.onClear && (
            <button
              type="button"
              onClick={props.onClear}
              className="text-[11px] text-slate-400 hover:text-red-300"
            >
              Убрать обои
            </button>
          )}
        </div>
      )}
    </div>
  );
}
