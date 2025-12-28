'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload } from 'lucide-react';
import LocationInput from '@/components/LocationInput';
import { useLanguage } from '@/i18n/LanguageContext';
import styles from './page.module.css';

export default function NewTripPage() {
  const router = useRouter();
  const endDateRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    currency: 'EUR',
    coverImage: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
          if (reader.result) {
              setForm(prev => ({ ...prev, coverImage: reader.result as string }));
          }
      };
      reader.readAsDataURL(file);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, startDate: e.target.value }));
      // Auto-focus logic: slightly delayed to ensure state update/render
      setTimeout(() => {
          endDateRef.current?.showPicker ? endDateRef.current.showPicker() : endDateRef.current?.focus();
      }, 100);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create trip');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
        console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={`${styles.title} gradient-text`}>{t('trip.createTitle')}</h1>
        
        <form onSubmit={handleSubmit} className={`${styles.formCard} glass-panel`}>
          <div className={styles.field}>
            <label className={styles.label}>{t('trip.title')}</label>
            <input 
              type="text" 
              name="title"
              required 
              placeholder={t('trip.titlePlaceholder')} 
              className={styles.input}
              value={form.title}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('trip.destination')}</label>
            <LocationInput
              value={form.destination}
              onChange={(value) => setForm({ ...form, destination: value })}
              placeholder={t('trip.destinationPlaceholder')}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="startDate">{t('trip.startDate')}</label>
              <input
                type="date"
                id="startDate"
                required
                className={styles.input}
                value={form.startDate}
                onChange={handleStartDateChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="endDate">{t('trip.endDate')}</label>
              <input
                ref={endDateRef}
                type="date"
                id="endDate"
                required
                min={form.startDate}
                className={styles.input}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="budget">{t('trip.budget')} ({t('common.optional')})</label>
            <div style={{display:'flex', gap:'0.5rem'}}>
                <input
                    type="number"
                    id="budget"
                    placeholder="0.00"
                    className={styles.input}
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    style={{flex:2}}
                />
                <select 
                    value={form.currency} 
                    onChange={e => setForm({...form, currency: e.target.value})}
                    style={{flex:1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0'}}
                >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="LKR">LKR</option>
                    <option value="THB">THB</option>
                    <option value="LAK">LAK</option>
                    <option value="PHP">PHP</option>
                </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t('trip.coverImage')} ({t('common.optional')})</label>
             <div className="flex gap-2 items-center mb-2">
                 <label className={styles.uploadLabel}>
                    <Upload size={20} />
                    <span>{t('trip.uploadFromDevice')}</span>
                    <input type="file" accept="image/*" className="hidden" style={{display:'none'}} onChange={handleImageUpload} />
                 </label>
            </div>
            {form.coverImage && (
                <div className={styles.previewContainer}>
                    <img src={form.coverImage} alt="Preview" className={styles.previewImage} />
                    <button type="button" onClick={() => setForm({...form, coverImage:''})} className={styles.removeButton}>{t('trip.removeImage')}</button>
                </div>
            )}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <Link href="/" className={styles.cancelButton}>
              {t('common.cancel')}
            </Link>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? t('trip.creating') : t('trip.createButton')}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
