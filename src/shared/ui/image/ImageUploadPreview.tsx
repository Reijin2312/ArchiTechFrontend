import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadProgress } from './UploadProgress';

interface ImageUploadPreviewProps {
  file: File;
  progress: number;
  onCancel?: () => void;
  error?: string;
  className?: string;
}

/**
 * Компонент предпросмотра загружаемого изображения с индикатором прогресса
 */
export function ImageUploadPreview({
  file,
  progress,
  onCancel,
  error,
  className = '',
}: ImageUploadPreviewProps) {
  const [preview, setPreview] = useState<string>('');

  // Создаем превью изображения
  useState(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  });

  return (
    <div className={`relative rounded-2xl overflow-hidden border-2 border-slate-700 ${className}`}>
      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="w-full h-full object-cover blur-sm"
        />
      )}
      
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-red-400 text-center max-w-xs">{error}</span>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="mt-2 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Закрыть
                </button>
              )}
            </motion.div>
          ) : progress < 100 ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-3"
            >
              <UploadProgress
                progress={progress}
                onCancel={onCancel}
                size="lg"
              />
              <span className="text-sm text-slate-300">Загрузка изображения...</span>
              <span className="text-xs text-slate-500">{file.name}</span>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-green-400">Загружено!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
