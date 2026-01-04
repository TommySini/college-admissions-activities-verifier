'use client';

import { SessionProvider } from 'next-auth/react';
import { ColorProvider } from './context/ColorContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ColorProvider>{children}</ColorProvider>
    </SessionProvider>
  );
}
