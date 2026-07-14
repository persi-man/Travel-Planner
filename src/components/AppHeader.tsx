'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import styles from './AppHeader.module.css';

export default function AppHeader() {
  return (
    <div className={styles.utilities}>
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  );
}
