'use client';

import { useEffect, useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { calculateTotalInCurrency } from '@/lib/currency';
import { useLanguage } from '@/i18n/LanguageContext';
import styles from './BudgetTracker.module.css';

interface Activity {
  cost?: number | null;
  currency?: string | null;
}

interface BudgetTrackerProps {
  budget: number | null | undefined;
  currency: string;
  activities: Activity[];
}

export default function BudgetTracker({ budget, currency, activities }: BudgetTrackerProps) {
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;

    async function calculateTotal() {
      setLoading(true);
      const total = await calculateTotalInCurrency(activities, currency);
      if (isMounted) {
        setTotalSpent(total);
        setLoading(false);
      }
    }

    calculateTotal();

    return () => { isMounted = false; };
  }, [activities, currency]);

  if (!budget || budget <= 0) {
    return null;
  }

  const remaining = budget - totalSpent;
  const percentageUsed = Math.min((totalSpent / budget) * 100, 100);
  const isOverBudget = remaining < 0;
  const isWarning = !isOverBudget && percentageUsed >= 80;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className={styles.tracker}>
      <div className={styles.header}>
        <span className={styles.label}>
          <Wallet size={15} strokeWidth={1.75} />
          {t('budget.title')}
        </span>
        {loading && <Loader2 size={14} className={styles.loading} strokeWidth={2} />}
      </div>

      <div className={styles.progressContainer}>
        <div
          className={`${styles.progressBar} ${isOverBudget ? styles.over : isWarning ? styles.warning : ''}`}
          style={{ width: `${Math.min(percentageUsed, 100)}%` }}
        />
      </div>

      <div className={styles.details}>
        <div className={styles.spent}>
          <span className={styles.detailLabel}>{t('budget.spent')}</span>
          <span className={`${styles.amount} ${isOverBudget ? styles.overAmount : ''}`}>
            {formatCurrency(totalSpent)}
          </span>
        </div>
        <div className={styles.remaining}>
          <span className={styles.detailLabel}>{t('budget.remaining')}</span>
          <span className={`${styles.amount} ${isOverBudget ? styles.overAmount : isWarning ? styles.warningAmount : styles.okAmount}`}>
            {formatCurrency(remaining)}
          </span>
        </div>
        <div className={styles.total}>
          <span className={styles.detailLabel}>{t('budget.title')}</span>
          <span className={styles.amount}>{formatCurrency(budget)}</span>
        </div>
      </div>

      {isOverBudget && (
        <div className={styles.alert}>
          {t('budget.overBudget')} {formatCurrency(Math.abs(remaining))}
        </div>
      )}
      {isWarning && (
        <div className={styles.warningAlert}>
          {Math.round(percentageUsed)}% {t('budget.used')}
        </div>
      )}
    </div>
  );
}
