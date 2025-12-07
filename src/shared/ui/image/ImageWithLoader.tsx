import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageWithLoaderProps {
  src?: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
  showSpinner?: boolean;
}

/**
 * Компонент изображения с индикатором загрузки и плавным появлением
 */
export function ImageWithLoader({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  onClick,
  onLoad,
  onError,
  showSpinner = true,
}: ImageWithLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(src);

  useEffect(() => {
    if (src !== imageSrc) {
      setLoading(true);
      setError(false);
      setImageSrc(src);
    }
  }, [src]);

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError?.();
  };

  if (!imageSrc) {
    return (
      <div className={`bg-slate-800/50 flex items-center justify-center ${placeholderClassName || className}`}>
        <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="wait">
        {loading && showSpinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-slate-800/50 backdrop-blur-sm z-10"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <div className={`bg-slate-800/50 flex flex-col items-center justify-center gap-2 ${placeholderClassName || className}`}>
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-red-400">Не удалось загрузить</span>
        </div>
      ) : (
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: loading ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          src={imageSrc}
          alt={alt}
          className={className}
          onClick={onClick}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}
