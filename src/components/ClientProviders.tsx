'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <div style={{position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      {children}
    </LanguageProvider>
  );
}
