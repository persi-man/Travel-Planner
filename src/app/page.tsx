'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/i18n/LanguageContext';
import styles from './page.module.css';

// Helper function to extract text from PDF
const extractPDFText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  if (typeof window === 'undefined') return '';
  
  try {
    // Dynamically import pdfjs-dist for browser only
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (e) {
    console.error('PDF parsing error:', e);
    return '';
  }
};

interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  _count: {
    days: number;
  };
}

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const importFileRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();

  const fetchTrips = () => {
    fetch('/api/trips')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
            setTrips(data);
        } else {
            console.error("API returned non-array:", data);
            setTrips([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleImportTrip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        let tripData: any = null;
        
        if (fileName.endsWith('.json')) {
          // JSON format - handle exported format with days and activities
          const parsed = JSON.parse(content as string);
          tripData = {
            title: parsed.title || 'Imported Trip',
            destination: parsed.destination || '',
            startDate: parsed.startDate || new Date().toISOString(),
            endDate: parsed.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            budget: parsed.budget || 0,
            currency: parsed.currency || 'EUR',
            days: parsed.days || [] // Keep days with activities
          };
          
          // Also handle flat activities array if present
          if (parsed.activities && !parsed.days) {
            tripData.activities = parsed.activities;
          }
          
        } else if (fileName.endsWith('.txt')) {
          // Text format - parse structured text (matches our export format)
          const text = content as string;
          const lines = text.split('\n');
          tripData = { title: '', destination: '', budget: 0, activities: [] };
          
          let currentDayActivities: any[] = [];
          let currentActivity: any = null;
          
          for (const line of lines) {
            // Title is in the first lines with === separators
            if (line.includes('===') && !tripData.title) {
              continue; // Skip separator
            }
            if (!tripData.title && line.trim() && !line.includes('=') && !line.includes('─') && !line.includes('Destination:')) {
              tripData.title = line.trim().toUpperCase() === line.trim() ? line.trim() : line.trim();
            }
            
            if (line.includes('Destination:')) {
              tripData.destination = line.split('Destination:')[1].trim();
            }
            
            if (line.includes('Dates:')) {
              const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
              if (dateMatch) {
                // Parse DD/MM/YYYY format
                const [, start, end] = dateMatch;
                const [sd, sm, sy] = start.split('/');
                const [ed, em, ey] = end.split('/');
                tripData.startDate = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd)).toISOString();
                tripData.endDate = new Date(parseInt(ey), parseInt(em) - 1, parseInt(ed)).toISOString();
              }
            }
            
            if (line.includes('Budget:')) {
              const budgetMatch = line.match(/Budget:\s*(\d+)/);
              if (budgetMatch) {
                tripData.budget = parseFloat(budgetMatch[1]);
              }
            }
            
            // Parse activities: format is "  1. [08:45] Activity Title (type)"
            const activityMatch = line.match(/^\s*\d+\.\s*\[(\d{2}:\d{2})\]\s*(.+?)\s*\((\w+)\)/);
            if (activityMatch) {
              if (currentActivity) {
                currentDayActivities.push(currentActivity);
              }
              currentActivity = {
                title: activityMatch[2].trim(),
                type: activityMatch[3].trim(),
                startTime: activityMatch[1]
              };
            }
            
            if (currentActivity) {
              if (line.includes('Location:')) {
                currentActivity.location = line.split('Location:')[1].trim();
              }
              if (line.includes('Note:')) {
                currentActivity.description = line.split('Note:')[1].trim();
              }
              if (line.includes('Cost:')) {
                const costMatch = line.match(/Cost:\s*(\d+)/);
                if (costMatch) {
                  currentActivity.cost = parseFloat(costMatch[1]);
                }
              }
            }
          }
          
          if (currentActivity) {
            currentDayActivities.push(currentActivity);
          }
          tripData.activities = currentDayActivities;
          
        } else if (fileName.endsWith('.csv')) {
          // CSV format
          const text = content as string;
          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length > 1) {
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const firstRow = lines[1].split(',');
            tripData = { activities: [] };
            
            headers.forEach((h, i) => {
              const val = firstRow[i]?.trim();
              if (h.includes('title') && !h.includes('activity')) tripData.title = val;
              if (h.includes('destination')) tripData.destination = val;
              if (h.includes('start') && h.includes('date')) tripData.startDate = val;
              if (h.includes('end') && h.includes('date')) tripData.endDate = val;
              if (h.includes('budget')) tripData.budget = parseFloat(val) || 0;
            });
            
            // Parse all rows as activities if it looks like an activity export
            if (headers.includes('activity') || headers.includes('time')) {
              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const act: any = {};
                headers.forEach((h, idx) => {
                  const v = values[idx]?.trim();
                  if (h === 'activity' || h === 'title') act.title = v;
                  if (h === 'type') act.type = v;
                  if (h === 'time') act.startTime = v;
                  if (h === 'location') act.location = v;
                  if (h === 'description') act.description = v;
                  if (h === 'cost') act.cost = parseFloat(v) || 0;
                });
                if (act.title) tripData.activities.push(act);
              }
            }
          }
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          // Excel format - our Excel export has: Date, Day, Time, Type, Activity, Description, Location, Maps Link, Cost
          const arrayBuffer = content as ArrayBuffer;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          
          console.log('Excel data parsed:', jsonData); // Debug
          
          if (jsonData.length > 0) {
            const firstRow: any = jsonData[0];
            
            // Extract trip name from filename (e.g., "My_Trip.xlsx" -> "My Trip")
            const tripNameFromFile = file.name
              .replace(/\.(xlsx|xls)$/i, '')
              .replace(/_/g, ' ')
              .trim();
            
            // Try to get dates from the data (first and last row Date columns)
            const lastRow: any = jsonData[jsonData.length - 1];
            let startDate = new Date().toISOString();
            let endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            
            // Excel exports have Date column with localized date string
            if (firstRow.Date) {
              try {
                // Try parsing the date string
                const parsedStart = new Date(firstRow.Date);
                if (!isNaN(parsedStart.getTime())) {
                  startDate = parsedStart.toISOString();
                }
              } catch (e) { console.log('Could not parse start date'); }
            }
            
            if (lastRow.Date) {
              try {
                const parsedEnd = new Date(lastRow.Date);
                if (!isNaN(parsedEnd.getTime())) {
                  endDate = parsedEnd.toISOString();
                }
              } catch (e) { console.log('Could not parse end date'); }
            }
            
            tripData = {
              title: firstRow.Title || firstRow.title || firstRow['Trip Title'] || tripNameFromFile || 'Imported Trip',
              destination: firstRow.Destination || firstRow.destination || '',
              startDate: startDate,
              endDate: endDate,
              budget: parseFloat(firstRow.Budget || firstRow.budget) || 0,
              activities: []
            };
            
            // Parse activities from Excel - our export has Activity column
            if (firstRow.Activity || firstRow.activity || firstRow.Time !== undefined) {
              jsonData.forEach((row: any) => {
                // Parse cost - remove currency symbol if present
                let costVal = 0;
                if (row.Cost) {
                  const costMatch = String(row.Cost).match(/(\d+)/);
                  if (costMatch) costVal = parseFloat(costMatch[1]);
                }
                
                tripData.activities.push({
                  title: row.Activity || row.activity || row.Title || 'Activity',
                  type: row.Type || row.type || 'activity',
                  description: row.Description || row.description || '',
                  location: row.Location || row.location || '',
                  cost: costVal,
                  startTime: row.Time || row.time || ''
                });
              });
              console.log(`Parsed ${tripData.activities.length} activities from Excel`);
            }
          }
        } else if (fileName.endsWith('.pdf')) {
          // PDF format - extract text
          const arrayBuffer = content as ArrayBuffer;
          const fullText = await extractPDFText(arrayBuffer);
          
          // Parse similar to TXT format
          tripData = { title: 'Imported from PDF', destination: '', activities: [] };
          const lines = fullText.split('\n');
          
          for (const line of lines) {
            if (line.includes('Destination:')) {
              tripData.destination = line.split('Destination:')[1]?.trim() || '';
            }
            if (!tripData.title || tripData.title === 'Imported from PDF') {
              if (line.trim().length > 3 && !line.includes(':') && !line.includes('=')) {
                tripData.title = line.trim().substring(0, 100);
              }
            }
          }
        }
        
        if (!tripData || !tripData.title) {
          alert('Could not parse trip data from file. Please check the format.\n\nSupported formats:\n- JSON (exported from app)\n- TXT (exported from app)\n- CSV with columns: Title, Destination, Start Date, End Date\n- Excel with same columns');
          return;
        }
        
        console.log('Parsed trip data:', tripData); // Debug log
        
        // Create the trip via API
        const response = await fetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: tripData.title,
            destination: tripData.destination || 'Unknown',
            startDate: tripData.startDate || new Date().toISOString(),
            endDate: tripData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            budget: tripData.budget || 0,
            currency: tripData.currency || 'EUR'
          })
        });
        
        if (response.ok) {
          const newTrip = await response.json();
          let activitiesImported = 0;
          
          // Handle activities from days structure (JSON export format)
          if (tripData.days && Array.isArray(tripData.days)) {
            for (let i = 0; i < tripData.days.length && i < newTrip.days.length; i++) {
              const dayData = tripData.days[i];
              const targetDayId = newTrip.days[i]?.id;
              
              if (dayData.activities && targetDayId) {
                for (const act of dayData.activities) {
                  await fetch('/api/activities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      dayId: targetDayId,
                      title: act.title || 'Activity',
                      type: act.type || 'activity',
                      description: act.description || '',
                      location: act.location || '',
                      startTime: act.startTime || null,
                      cost: act.cost || 0,
                      currency: act.currency || 'EUR',
                      images: '[]'
                    })
                  });
                  activitiesImported++;
                }
              }
            }
          }
          
          // Handle flat activities array
          if (tripData.activities && Array.isArray(tripData.activities) && newTrip.days?.length > 0) {
            for (const act of tripData.activities) {
              await fetch('/api/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  dayId: newTrip.days[0].id,
                  title: act.title || 'Activity',
                  type: act.type || 'activity',
                  description: act.description || '',
                  location: act.location || '',
                  startTime: act.startTime || null,
                  cost: act.cost || 0,
                  currency: act.currency || 'EUR',
                  images: '[]'
                })
              });
              activitiesImported++;
            }
          }
          
          alert(`Trip "${tripData.title}" imported successfully!\n${activitiesImported > 0 ? `${activitiesImported} activities imported.` : ''}`);
          fetchTrips();
        } else {
          alert('Failed to import trip. Please try again.');
        }
      } catch (err) {
        alert('Error reading file. Please check the format and try again.');
        console.error(err);
      }
    };
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.pdf')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    
    e.target.value = ''; // Reset input
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={`${styles.title} gradient-text`}>{t('home.title')}</h1>
            <p className={styles.subtitle}>{t('home.subtitle')}</p>
          </div>
          <div style={{display:'flex', gap:'0.75rem'}}>
            <label className={styles.importButton} style={{cursor:'pointer'}}>
              <Upload size={18} /> {t('home.importTrip')}
              <input 
                type="file" 
                ref={importFileRef}
                accept=".json,.md,.txt,.csv,.xlsx,.xls,.pdf"
                style={{display:'none'}}
                onChange={handleImportTrip}
              />
            </label>
            <Link href="/trips/new" className={styles.newButton}>
              + {t('home.newTrip')}
            </Link>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'hsl(var(--text-dim))' }}>
            {t('common.loading')}
          </div>
        ) : trips.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>{t('home.noTrips')}</h3>
            <Link href="/trips/new" className={styles.emptyLink}>
              {t('home.newTrip')} &rarr;
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {trips.map((trip) => (
              <Link href={`/trips/${trip.id}`} key={trip.id} className={styles.card}>
                <div className={styles.cardImage}>
                  {trip.coverImage ? (
                    <img src={trip.coverImage} alt={trip.title} />
                  ) : (
                    <div className={styles.cardImagePlaceholder} />
                  )}
                  <div className={styles.dateBadge}>
                    {new Date(trip.startDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} - {new Date(trip.endDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{trip.title}</h3>
                  <div className={styles.cardMeta}>
                    <span style={{ marginRight: '1rem' }}>📍 {trip.destination}</span>
                    <span>📅 {Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))} {t('home.tripCard.days')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
