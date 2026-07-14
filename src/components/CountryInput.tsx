'use client';

import { useState, useEffect, useRef } from 'react';
import type { TripCountry } from '@/lib/db/types';
import { searchCountryCatalog } from '@/lib/countryCatalog';
import styles from './CountryInput.module.css';

interface CountryInputProps {
  value: TripCountry[];
  onChange: (countries: TripCountry[]) => void;
  placeholder?: string;
  language?: string;
  className?: string;
}

export default function CountryInput({
  value,
  onChange,
  placeholder = 'Ajouter un pays…',
  language = 'en',
  className = '',
}: CountryInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TripCountry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchCountries = (text: string) => {
    if (text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const selected = value.map((c) => c.code);
    const results = searchCountryCatalog(text, language, selected);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  };

  const addCountry = (country: TripCountry) => {
    if (value.some((c) => c.code === country.code)) return;

    onChange([...value, country]);
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const removeCountry = (code: string) => {
    onChange(value.filter((c) => c.code !== code));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCountries(text), 120);
  };

  const isOpen = showSuggestions && suggestions.length > 0;

  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${isOpen ? styles.wrapperOpen : ''}`}
      data-suggestions-open={isOpen ? 'true' : undefined}
    >
      {value.length > 0 && (
        <ul className={styles.chips} aria-label="Pays sélectionnés">
          {value.map((country) => (
            <li key={country.code} className={styles.chip}>
              <span>{country.name}</span>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeCountry(country.code)}
                aria-label={`Retirer ${country.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => query.length >= 2 && searchCountries(query)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setShowSuggestions(false);
          if (e.key === 'Enter' && suggestions[0]) {
            e.preventDefault();
            addCountry(suggestions[0]);
          }
        }}
        placeholder={placeholder}
        className={`${styles.input} ${className}`}
        autoComplete="off"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      />

      {isOpen && (
        <ul className={styles.suggestions} role="listbox">
          {suggestions.map((country) => (
            <li
              key={country.code}
              className={styles.suggestionItem}
              role="option"
              tabIndex={0}
              onClick={() => addCountry(country)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  addCountry(country);
                }
              }}
            >
              {country.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
