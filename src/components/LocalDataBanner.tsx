'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import styles from './LocalDataBanner.module.css';

export default function LocalDataBanner() {
  const { t } = useLanguage();

  return (
    <p className={styles.notice} role="status">
      <strong>{t('home.localDataTitle')}</strong>{' '}
      {t('home.localDataNotice')}
    </p>
  );
}
