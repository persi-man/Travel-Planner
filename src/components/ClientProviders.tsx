'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import styles from './ClientProviders.module.css';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <div className={styles.chrome}>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      {children}
    </LanguageProvider>
  );
}
