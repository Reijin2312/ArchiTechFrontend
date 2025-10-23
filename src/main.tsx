import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { Providers } from '@/app/providers';
import { authStore } from '@/shared/store/auth';
import '@/index.css';
import '@/styles/legacy.css'


authStore.getState().loadFromStorage();


ReactDOM.createRoot(document.getElementById('root')!).render(
<React.StrictMode>
<Providers>
<RouterProvider router={router} />
</Providers>
</React.StrictMode>
);