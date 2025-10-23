import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

export default function Footer() {
  const host = useMemo(() => document.createElement('div'), []);

  useEffect(() => {
    document.body.appendChild(host);
    return () => { document.body.removeChild(host); };
  }, [host]);

  const style: React.CSSProperties = {
    position: 'fixed',
    right: '12px',
    bottom: '8px',
    zIndex: 9999,
    fontSize: '0.875rem',
    color: 'rgba(148,163,184,1)',
    pointerEvents: 'auto'
  };

  const linkStyle: React.CSSProperties = { color: 'rgba(148,163,184,1)', textDecoration: 'underline' };

  const node = (
    <footer className="site-footer" style={style}>
      ArchiTech. 2024-2026. Все права защищены. | <a style={linkStyle} href="https://t.me/Raijin2312">Тех. поддержка</a>
    </footer>
  );

  return createPortal(node, host);
}
