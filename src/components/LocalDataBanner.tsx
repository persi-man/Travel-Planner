'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import styles from './LocalDataBanner.module.css';

export default function LocalDataBanner() {
  const { t } = useLanguage();

  return (
    <div className={styles.banner} role="status">
      <span className={styles.icon}>💾</span>
      <p>{t('home.localDataNotice')}</p>
    </div>
  );
}
