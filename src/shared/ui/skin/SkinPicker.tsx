import { useRef } from 'react';
import { DragDropZone } from '@/shared/ui/form/DragDropZone';
import { ImageWithLoader } from '@/shared/ui/image';

export function SkinPicker(props: {
  value: string;
  busy?: boolean;
  loading?: boolean;
  onChange: (file: File) => void | Promise<void>;
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
      <DragDropZone onFile={handleFile} accept="image/*" maxSize={2 * 1024 * 1024}>
        <button
          type="button"
          onClick={handleClick}
          className="group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 [.at-secondary-skin_&]:border-[rgba(239,232,218,0.22)] bg-slate-900/60 [.at-secondary-skin_&]:bg-[rgba(33,35,31,0.91)] px-4 py-6 text-center hover:border-sky-600 [.at-secondary-skin_&]:hover:border-[#cfb28c] hover:bg-slate-900/80"
        >
          {props.value ? (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="h-32 w-32 overflow-hidden rounded-xl border border-slate-800 [.at-secondary-skin_&]:border-[rgba(239,232,218,0.22)] bg-slate-950 [.at-secondary-skin_&]:bg-[rgba(25,27,24,0.85)]">
                {props.loading ? (
                  <div className="h-full w-full animate-pulse bg-slate-800 [.at-secondary-skin_&]:bg-[#34362f]" />
                ) : (
                  <ImageWithLoader
                    src={props.value}
                    alt="Скин"
                    className="h-full w-full object-cover"
                    placeholderClassName="h-32 w-32"
                  />
                )}
              </div>
              <div className="text-xs text-slate-300 [.at-secondary-skin_&]:text-[#c9c3b8]">
                Нажмите, чтобы выбрать другой файл, или перетащите сюда изображение
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-200 [.at-secondary-skin_&]:text-[#c9c3b8]">
                👕
              </div>
              <div className="text-xs text-slate-300 [.at-secondary-skin_&]:text-[#c9c3b8]">
                Перетащите сюда изображение или нажмите для выбора файла
              </div>
              <div className="text-[11px] text-slate-500 [.at-secondary-skin_&]:text-[#938e83]">PNG/JPG до 2 МБ, 64×64 или 64×32</div>
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
    </div>
  );
}
