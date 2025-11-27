import React from 'react';
export function Card({children}:{children:React.ReactNode}){ return <div className="card backdrop-blur-md backdrop-saturate-150">{children}</div>; }