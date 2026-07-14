'use client';

import { HardDrive } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import styles from './LocalDataBanner.module.css';

export default function LocalDataBanner() {
  const { t } = useLanguage();

  return (
    <div className={styles.banner} role="status">
      <HardDrive size={15} strokeWidth={1.75} className={styles.icon} />
      <p>{t('home.localDataNotice')}</p>
    </div>
  );
}
