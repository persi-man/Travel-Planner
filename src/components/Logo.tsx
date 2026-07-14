import Link from 'next/link';
import styles from './Logo.module.css';

type LogoProps = {
  variant?: 'full' | 'compact' | 'mark';
  wordmark?: string;
  className?: string;
  href?: string;
  linked?: boolean;
};

function Mark({ size }: { size: number }) {
  return (
    <svg
      className={styles.mark}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20 5.5C16 5.5 12.8 8.5 12.8 12.2C12.8 16.8 20 24 20 24C20 24 27.2 16.8 27.2 12.2C27.2 8.5 24 5.5 20 5.5Z"
        className={styles.pin}
      />
      <circle cx="20" cy="11.5" r="3.25" className={styles.pinHole} />
      <path
        d="M15.5 28.5V26.8C15.5 25.2 24.5 25.2 24.5 26.8V28.5"
        className={styles.handle}
      />
      <rect
        x="13.5"
        y="28.5"
        width="13"
        height="8.5"
        rx="1.75"
        className={styles.suitcase}
      />
      <line x1="20" y1="29.5" x2="20" y2="31" className={styles.clasp} />
    </svg>
  );
}

export default function Logo({
  variant = 'full',
  wordmark,
  className,
  href = '/',
  linked = true,
}: LogoProps) {
  const size = variant === 'full' ? 44 : variant === 'compact' ? 28 : 32;
  const rootClass = [styles.logo, styles[variant], className]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <Mark size={size} />
      {wordmark && variant !== 'mark' && (
        <span className={styles.wordmark}>{wordmark}</span>
      )}
    </>
  );

  if (variant === 'mark' || !linked) {
    return (
      <span className={rootClass} aria-label={wordmark}>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={rootClass} aria-label={wordmark}>
      {content}
    </Link>
  );
}
