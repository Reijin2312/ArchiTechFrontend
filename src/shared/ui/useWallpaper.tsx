import { useEffect } from 'react';

export function useWallpaper(url: string = '/images/bg.png') {
  useEffect(() => {
    const b = document.body;
    const prev = b.style.getPropertyValue('--bg-url');

    b.classList.add('has-wallpaper');
    b.style.setProperty('--bg-url', `url("${url}")`);

    return () => {
      b.classList.remove('has-wallpaper');
      if (prev) b.style.setProperty('--bg-url', prev);
      else b.style.removeProperty('--bg-url');
    };
  }, [url]);
}