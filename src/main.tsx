import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { Providers } from '@/app/providers';
import { bootstrapAuth } from '@/shared/auth/bootstrap';
import ErrorBoundary from '@/shared/ui/utils/ErrorBoundary';
import './index.css';

bootstrapAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <Providers>
          <RouterProvider router={router} />
        </Providers>
      </ErrorBoundary>
    </React.StrictMode>
  );
});
