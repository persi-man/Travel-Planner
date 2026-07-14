'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import AppFooter from '@/components/AppFooter';
import styles from './ClientProviders.module.css';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <div className={styles.shell}>
        {children}
        <AppFooter />
      </div>
    </LanguageProvider>
  );
}
