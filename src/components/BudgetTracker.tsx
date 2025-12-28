'use client';

import { useEffect, useState } from 'react';
import { calculateTotalInCurrency } from '@/lib/currency';
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
    return null; // Don't show if no budget set
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
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className={styles.tracker}>
      <div className={styles.header}>
        <span className={styles.label}>💰 Budget</span>
        {loading && <span className={styles.loading}>⟳</span>}
      </div>
      
      <div className={styles.progressContainer}>
        <div 
          className={`${styles.progressBar} ${isOverBudget ? styles.over : isWarning ? styles.warning : ''}`}
          style={{ width: `${Math.min(percentageUsed, 100)}%` }}
        />
      </div>
      
      <div className={styles.details}>
        <div className={styles.spent}>
          <span className={styles.detailLabel}>Spent:</span>
          <span className={`${styles.amount} ${isOverBudget ? styles.overAmount : ''}`}>
            {formatCurrency(totalSpent)}
          </span>
        </div>
        <div className={styles.remaining}>
          <span className={styles.detailLabel}>Remaining:</span>
          <span className={`${styles.amount} ${isOverBudget ? styles.overAmount : isWarning ? styles.warningAmount : styles.okAmount}`}>
            {formatCurrency(remaining)}
          </span>
        </div>
        <div className={styles.total}>
          <span className={styles.detailLabel}>Budget:</span>
          <span className={styles.amount}>{formatCurrency(budget)}</span>
        </div>
      </div>
      
      {isOverBudget && (
        <div className={styles.alert}>
          ⚠️ Over budget by {formatCurrency(Math.abs(remaining))}
        </div>
      )}
      {isWarning && (
        <div className={styles.warningAlert}>
          ⚡ {Math.round(percentageUsed)}% of budget used
        </div>
      )}
    </div>
  );
}
