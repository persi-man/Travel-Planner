'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import styles from './LocationInput.module.css';

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
  address?: {
    country_code?: string;
  };
}

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  language?: string;
  countryCodes?: string[];
}

function formatSuggestion(displayName: string) {
  const parts = displayName.split(',').map((part) => part.trim()).filter(Boolean);
  return {
    primary: parts[0] || displayName,
    secondary: parts.slice(1).join(', '),
  };
}

export default function LocationInput({
  value,
  onChange,
  placeholder = 'Enter location...',
  required = false,
  className = '',
  language = 'en',
  countryCodes,
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const codes = countryCodes?.map((c) => c.toLowerCase()).filter(Boolean);
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`;
      if (codes?.length) {
        url += `&countrycodes=${codes.join(',')}`;
      }

      const response = await fetch(url, {
          headers: {
            'Accept-Language': language === 'fr' ? 'fr' : 'en',
            'User-Agent': 'TravelPlannerApp/1.0',
          },
        }
      );

      if (response.ok) {
        const data: LocationSuggestion[] = await response.json();
        const filtered =
          codes?.length
            ? data.filter((item) => {
                const code = item.address?.country_code?.toLowerCase();
                return code && codes.includes(code);
              })
            : data;
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    const parts = suggestion.display_name.split(',').map((part) => part.trim()).filter(Boolean);
    const cleanName = parts.length > 1
      ? `${parts[0]}, ${parts[1]}`
      : parts[0] || suggestion.display_name;
    onChange(cleanName);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const isOpen = showSuggestions && suggestions.length > 0;

  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${isOpen ? styles.wrapperOpen : ''}`}
      data-suggestions-open={isOpen ? 'true' : undefined}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        className={`${styles.input} ${className}`}
        autoComplete="off"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      />

      {isLoading && (
        <div className={styles.loadingIndicator}>
          <span className={styles.spinner}></span>
        </div>
      )}

      {isOpen && (
        <ul className={styles.suggestions} role="listbox">
          {suggestions.map((suggestion) => {
            const { primary, secondary } = formatSuggestion(suggestion.display_name);
            return (
              <li
                key={suggestion.place_id}
                onClick={() => handleSuggestionClick(suggestion)}
                className={styles.suggestionItem}
                role="option"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSuggestionClick(suggestion);
                  }
                }}
              >
                <MapPin size={14} strokeWidth={1.75} className={styles.suggestionIcon} />
                <div className={styles.suggestionContent}>
                  <span className={styles.suggestionPrimary}>{primary}</span>
                  {secondary && (
                    <span className={styles.suggestionSecondary}>{secondary}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
