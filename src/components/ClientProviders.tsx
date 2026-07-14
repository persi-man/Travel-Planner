'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/i18n/LanguageContext';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
