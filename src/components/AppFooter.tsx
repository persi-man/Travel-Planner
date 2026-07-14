import { EXPORT_WEBSITE, EXPORT_WEBSITE_LABEL, getExportCopyright } from '@/lib/exportBranding';
import styles from './AppFooter.module.css';

export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.text}>
        <span className={styles.copy}>{getExportCopyright()}</span>
        <span className={styles.bar} aria-hidden="true" />
        <a
          href={EXPORT_WEBSITE}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {EXPORT_WEBSITE_LABEL}
        </a>
      </p>
    </footer>
  );
}
