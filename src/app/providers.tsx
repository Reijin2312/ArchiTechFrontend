import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/shared/i18n/I18nProvider';

const qc = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <QueryClientProvider client={qc}>
        <Toaster richColors />
        {children}
      </QueryClientProvider>
    </I18nProvider>
  );
}
