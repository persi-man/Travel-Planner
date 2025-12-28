'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Trash2, Edit2, Upload, X, GripVertical } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import LocationInput from '@/components/LocationInput';
import BudgetTracker from '@/components/BudgetTracker';
import { useLanguage } from '@/i18n/LanguageContext';
import styles from './page.module.css';

// Helper function to extract text from PDF
const extractPDFText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  if (typeof window === 'undefined') return '';
  
  try {
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

interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  cost?: number;
  currency?: string;
  location?: string;
  images?: string; // JSON string
}

interface Day {
  id: string;
  date: string;
  index: number;
  note?: string;
  activities: Activity[];
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency?: string;
  coverImage?: string;
  days: Day[];
}

// Draggable Activity Component
function DraggableActivity({ activityId, children }: { activityId: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: activityId,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  } : undefined;

  return (
    <div ref={setNodeRef} style={style as any} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

// Droppable Day Component
function DroppableDay({ dayId, children }: { dayId: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: dayId,
  });

  const style = {
    background: isOver ? 'rgba(59, 130, 246, 0.1)' : undefined,
    transition: 'background 0.2s',
    borderRadius: '0.5rem',
    minHeight: '50px',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
}

export default function TripDetailsClient({ id }: { id: string }) {
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [viewActivity, setViewActivity] = useState<Activity | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();

  // Form State
  const [form, setForm] = useState({
    id: '', // For edits
    type: 'activity', 
    customType: '',
    title: '',
    description: '',
    // startTime is now calculated from day + time
    dayId: '', 
    time: '',
    cost: '',
    currency: 'EUR',
    location: '',
    images: ''
  });

  const [tripForm, setTripForm] = useState({
      title: '',
      destination: '',
      startDate: '',
      endDate: '',
      budget: '',
      coverImage: ''
  });

  const fetchTrip = useCallback(async () => {
    console.log(`[Client] Fetching trip params ID: ${id}`);
    try {
      const res = await fetch(`/api/trips/${id}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTrip(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayId) return;

    try {
      // Logic to handle custom type
      const finalType = form.type === 'custom' ? form.customType : form.type;
      
      // Handle image splitting (pipe separated because base64 contains commas)
      const imageArray = form.images ? form.images.split('|').map(s => s.trim()).filter(Boolean) : [];

      // Calculate startTime from selected Day and Time
      let startDateTime = null;
      if (form.dayId) {
          const day = trip?.days.find(d => d.id === form.dayId);
          if (day) {
              const dateBase = new Date(day.date);
              if (form.time) {
                  const [hours, minutes] = form.time.split(':').map(Number);
                  dateBase.setHours(hours, minutes);
              } else {
                  // Default to noon or keep time? If time is optional, maybe just date is enough.
                  // But our DB stores DateTime.
                  // Let's set it to 00:00 or what logic dictates.
                  // If optional time and user didn't provide, we might just store date with 00:00
                  dateBase.setHours(0,0,0,0);
              }
              startDateTime = dateBase.toISOString();
          }
      }

      await fetch('/api/activities', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // id and dayId are spread from ...form
          ...form,
          type: finalType,
          cost: form.cost ? parseFloat(form.cost) : 0,
          startTime: startDateTime,
          images: imageArray
        })
      });
      setShowAddModal(false);
      // Reset form
      setForm({ id: '', type: 'activity', customType: '', title: '', description: '', dayId: '', time: '', cost: '', currency: 'EUR', location: '', images: '' });
      fetchTrip();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditTrip = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!trip) return;
      
      try {
        await fetch(`/api/trips/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tripForm)
        });
        setShowEditTripModal(false);
        fetchTrip();
      } catch (err) {
        console.error(err);
      }
  };

  const openEditTrip = () => {
      if(!trip) return;
      setTripForm({
          title: trip.title,
          destination: trip.destination || '',
          startDate: trip.startDate ? new Date(trip.startDate).toISOString().split('T')[0] : '',
          endDate: trip.endDate ? new Date(trip.endDate).toISOString().split('T')[0] : '',
          budget: trip.budget ? trip.budget.toString() : '',
          coverImage: trip.coverImage || ''
      });
      setShowEditTripModal(true);
  };

  const handleEditActivityClick = (act: Activity, dayId: string) => {
      let timeStr = '';
      if (act.startTime) {
          const d = new Date(act.startTime);
          timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
      }

      setForm({
          id: act.id,
          type: act.type,
          customType: '',
          title: act.title,
          description: act.description || '',
          dayId: dayId,
          time: timeStr,
          cost: act.cost ? act.cost.toString() : '',
          currency: act.currency || 'EUR',
          location: act.location || '',
          images: act.images ? JSON.parse(act.images as unknown as string).join('|') : ''
      });
      setShowAddModal(true);
  };

  const handleTripImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
          if (reader.result) {
              setTripForm(prev => ({ ...prev, coverImage: reader.result as string }));
          }
      };
      reader.readAsDataURL(file);
  };

  const handleDeleteTrip = async () => {
    if (!confirm('Are you sure you want to delete this trip? This cannot be undone.')) return;
    try {
        await fetch(`/api/trips/${id}`, { method: 'DELETE' });
        router.push('/');
    } catch (err) {
        console.error(err);
        alert('Failed to delete trip');
    }
  };

  const handleDeleteActivity = async (actId: string) => {
    if(!confirm('Delete this activity?')) return;
    try {
        await fetch(`/api/activities?id=${actId}`, { method: 'DELETE' });
        fetchTrip();
    } catch (err) {
        console.error(err);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !trip) return;

    const activityId = active.id as string;
    const newDayId = over.id as string;

    // Find the activity's current day
    let currentDayId: string | null = null;
    for (const day of trip.days) {
      if (day.activities.find(a => a.id === activityId)) {
        currentDayId = day.id;
        break;
      }
    }

    // Only update if dropped on a different day
    if (currentDayId && newDayId !== currentDayId) {
      try {
        await fetch('/api/activities', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activityId, dayId: newDayId })
        });
        fetchTrip();
      } catch (err) {
        console.error('Drag failed:', err);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
              if (reader.result) {
                  const currentImages = form.images ? form.images.split('|').filter(Boolean) : [];
                  currentImages.push(reader.result as string);
                  setForm(prev => ({ ...prev, images: currentImages.join('|') }));
              }
          };
          reader.readAsDataURL(file);
      });
  };

  const exportPDF = () => {
    if (!trip) return;
    const doc = new jsPDF();
    
    let yPos = 0;
    
    // Hero Header with cover image or gradient
    if (trip.coverImage && trip.coverImage.startsWith('data:image')) {
      try {
        // Full width cover image as hero
        doc.addImage(trip.coverImage, 'JPEG', 0, 0, 210, 60);
        // Draw semi-transparent overlay manually
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 40, 210, 20, 'F');
      } catch (e) {
        // Fallback to gradient
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, 210, 60, 'F');
      }
    } else {
      // Default blue header
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 60, 'F');
    }
    
    // Title overlay on hero
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(trip.title, 14, 25);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(trip.destination, 14, 38);
    
    doc.setFontSize(11);
    doc.text(`${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`, 14, 50);
    
    if (trip.budget) {
      doc.text(`Budget: ${trip.budget} ${trip.currency || 'EUR'}`, 180, 50, { align: 'right' });
    }

    yPos = 70;

    // Filter days with activities
    const daysWithActivities = trip.days.filter(day => day.activities.length > 0);
    
    if (daysWithActivities.length === 0) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(14);
      doc.text('No activities planned yet.', 14, yPos);
    }
    
    daysWithActivities.forEach((day) => {
      // Check for page break before day header
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      // Day Header - styled bar
      doc.setFillColor(41, 128, 185);
      doc.rect(14, yPos - 5, 182, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Day ${day.index + 1} - ${new Date(day.date).toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long'})}`, 18, yPos + 3);
      yPos += 16;

      // Sort activities by time
      const sortedActivities = [...day.activities].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

      sortedActivities.forEach((act) => {
        // Check for page break
        if (yPos > 255) {
          doc.addPage();
          yPos = 20;
        }

        // Activity card background
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(14, yPos - 3, 182, act.images ? 38 : 22, 2, 2, 'F');
        
        // Time badge
        const timeStr = act.startTime ? new Date(act.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
        if (timeStr) {
          doc.setFillColor(41, 128, 185);
          doc.roundedRect(16, yPos - 1, 18, 6, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text(timeStr, 25, yPos + 3, { align: 'center' });
        }
        
        // Activity title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text(act.title, timeStr ? 38 : 18, yPos + 3);
        
        // Type badge
        doc.setFillColor(230, 230, 230);
        doc.roundedRect(165, yPos - 1, 28, 6, 1, 1, 'F');
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(act.type.toUpperCase(), 179, yPos + 3, { align: 'center' });
        
        yPos += 8;

        // Location with link (no emoji, use text)
        if (act.location) {
          doc.setFontSize(9);
          doc.setTextColor(41, 128, 185);
          doc.setFont("helvetica", "normal");
          doc.textWithLink(`> ${act.location} (View on Maps)`, 18, yPos, {
            url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location)}`
          });
          yPos += 5;
        }

        // Description (full text with proper line wrapping)
        if (act.description) {
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          const descLines = doc.splitTextToSize(act.description, 175);
          doc.text(descLines, 18, yPos);
          yPos += descLines.length * 4;
        }

        // Cost
        if (act.cost) {
          doc.setFontSize(9);
          doc.setTextColor(34, 139, 34);
          doc.setFont("helvetica", "bold");
          doc.text(`${act.cost} ${act.currency || 'EUR'}`, 18, yPos);
          yPos += 4;
        }

        // Activity images (max 3, side by side)
        if (act.images) {
          try {
            const imgArray = JSON.parse(act.images as unknown as string);
            if (imgArray.length > 0) {
              let imgX = 18;
              imgArray.slice(0, 4).forEach((imgSrc: string) => {
                if (imgSrc && imgSrc.startsWith('data:image')) {
                  try {
                    doc.addImage(imgSrc, 'JPEG', imgX, yPos, 30, 22);
                    imgX += 34;
                  } catch (e) {
                    // Skip
                  }
                }
              });
              yPos += 26;
            }
          } catch (e) {
            // Images not parseable
          }
        }

        yPos += 8;
      });

      yPos += 6;
    });

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Travel Planner', 14, 288);
        doc.text(`Page ${i}/${pageCount}`, 196, 288, { align: 'right' });
    }

    doc.save(`${trip.title.replace(/\s+/g, '_')}_itinerary.pdf`);
  };

  const exportExcel = () => {
      if(!trip) return;
      
      const data: any[] = [];
      trip.days.forEach(day => {
          // Skip empty days
          if (day.activities.length === 0) return;
          
          day.activities.forEach(act => {
              const mapsLink = act.location 
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location)}`
                : '';
              data.push({
                  Date: new Date(day.date).toLocaleDateString(),
                  Day: `Day ${day.index + 1}`,
                  Time: act.startTime ? new Date(act.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '',
                  Type: act.type,
                  Activity: act.title,
                  Description: act.description || '',
                  Location: act.location || '',
                  'Maps Link': mapsLink,
                  Cost: act.cost ? `${act.cost} ${act.currency || 'EUR'}` : ''
              });
          });
      });

      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 8 },  // Day
        { wch: 8 },  // Time
        { wch: 10 }, // Type
        { wch: 25 }, // Activity
        { wch: 30 }, // Description
        { wch: 25 }, // Location
        { wch: 50 }, // Maps Link
        { wch: 12 }, // Cost
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Itinerary");
      XLSX.writeFile(wb, `${trip.title.replace(/\s+/g, '_')}.xlsx`);
  };

  const exportText = () => {
    if (!trip) return;
    
    let content = `${'='.repeat(60)}\n`;
    content += `${trip.title.toUpperCase()}\n`;
    content += `${'='.repeat(60)}\n\n`;
    content += `Destination: ${trip.destination}\n`;
    content += `Dates: ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}\n`;
    if (trip.budget) {
      content += `Budget: ${trip.budget} ${trip.currency || 'EUR'}\n`;
    }
    content += `\n${'─'.repeat(60)}\n\n`;
    
    const daysWithActivities = trip.days.filter(d => d.activities.length > 0);
    
    if (daysWithActivities.length === 0) {
      content += 'No activities planned yet.\n';
    }
    
    daysWithActivities.forEach(day => {
      content += `\n## DAY ${day.index + 1} - ${new Date(day.date).toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long', year:'numeric'})}\n`;
      content += `${'─'.repeat(40)}\n\n`;
      
      const sortedActivities = [...day.activities].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
      
      sortedActivities.forEach((act, idx) => {
        const timeStr = act.startTime ? new Date(act.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '??:??';
        content += `  ${idx + 1}. [${timeStr}] ${act.title} (${act.type})\n`;
        
        if (act.location) {
          content += `     Location: ${act.location}\n`;
          content += `     Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location)}\n`;
        }
        
        if (act.description) {
          content += `     Note: ${act.description}\n`;
        }
        
        if (act.cost) {
          content += `     Cost: ${act.cost} ${act.currency || 'EUR'}\n`;
        }
        
    content += '\n';
      });
    });
    
    content += `\n${'='.repeat(60)}\n`;
    content += `Generated by Travel Planner - ${new Date().toLocaleDateString()}\n`;
    
    // Download as .txt file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.title.replace(/\s+/g, '_')}_itinerary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!trip) return;
    
    const exportData = {
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      budget: trip.budget,
      currency: trip.currency,
      days: trip.days.map(day => ({
        date: day.date,
        dayIndex: day.index,
        activities: day.activities.map(act => ({
          title: act.title,
          type: act.type,
          description: act.description,
          location: act.location,
          startTime: act.startTime,
          cost: act.cost,
          currency: act.currency
        }))
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.title.replace(/\s+/g, '_')}_trip.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    if (!trip) return;
    
    let md = `# ${trip.title}\n\n`;
    md += `> **Destination:** ${trip.destination}\n`;
    md += `> **Dates:** ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}\n`;
    if (trip.budget) {
      md += `> **Budget:** ${trip.budget} ${trip.currency || 'EUR'}\n`;
    }
    md += `\n---\n\n`;
    
    const daysWithActivities = trip.days.filter(d => d.activities.length > 0);
    
    if (daysWithActivities.length === 0) {
      md += `*No activities planned yet.*\n`;
    }
    
    daysWithActivities.forEach(day => {
      md += `## Day ${day.index + 1} - ${new Date(day.date).toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long', year:'numeric'})}\n\n`;
      
      const sortedActivities = [...day.activities].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
      
      sortedActivities.forEach((act, idx) => {
        const timeStr = act.startTime ? new Date(act.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
        
        md += `### ${idx + 1}. ${act.title}\n\n`;
        md += `- **Type:** ${act.type}\n`;
        if (timeStr) md += `- **Time:** ${timeStr}\n`;
        if (act.location) {
          md += `- **Location:** [${act.location}](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location)})\n`;
        }
        if (act.cost) md += `- **Cost:** ${act.cost} ${act.currency || 'EUR'}\n`;
        if (act.description) {
          md += `\n${act.description}\n`;
        }
        md += `\n`;
      });
      
      md += `---\n\n`;
    });
    
    md += `\n*Generated by Travel Planner - ${new Date().toLocaleDateString()}*\n`;
    
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.title.replace(/\s+/g, '_')}_itinerary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateMapsItinerary = () => {
    if (!trip) return;
    
    // Collect all locations from activities across all days
    const waypoints: string[] = [];
    
    trip.days.forEach(day => {
      // Sort activities by time for logical route order
      const sortedActivities = [...day.activities].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
      
      sortedActivities.forEach(act => {
        if (act.location) {
          waypoints.push(act.location);
        }
      });
    });
    
    if (waypoints.length === 0) {
      alert('No locations found in activities!');
      return;
    }
    
    // Google Maps Directions URL format
    // /dir/origin/waypoint1/waypoint2/.../destination
    const origin = encodeURIComponent(waypoints[0]);
    const destination = encodeURIComponent(waypoints[waypoints.length - 1]);
    const waypointsParam = waypoints.slice(1, -1).map(w => encodeURIComponent(w)).join('/');
    
    let mapsUrl = `https://www.google.com/maps/dir/${origin}`;
    if (waypointsParam) {
      mapsUrl += `/${waypointsParam}`;
    }
    if (waypoints.length > 1) {
      mapsUrl += `/${destination}`;
    }
    
    window.open(mapsUrl, '_blank');
  };

  // Generate ICS file for calendar import
  const exportToCalendar = () => {
    if (!trip) return;
    
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Travel Planner//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${trip.title}
`;

    trip.days.forEach(day => {
      day.activities.forEach(act => {
        const startDate = new Date(day.date);
        let startTime = new Date(day.date);
        let endTime = new Date(day.date);
        
        if (act.startTime) {
          startTime = new Date(act.startTime);
          endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration
        } else {
          // All-day event if no time specified
          startTime.setHours(9, 0, 0, 0);
          endTime.setHours(10, 0, 0, 0);
        }
        
        const formatDate = (d: Date) => {
          return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        const escapeICS = (str: string) => {
          return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
        };
        
        icsContent += `BEGIN:VEVENT
DTSTART:${formatDate(startTime)}
DTEND:${formatDate(endTime)}
SUMMARY:${escapeICS(act.title)}
DESCRIPTION:${escapeICS((act.description || '') + (act.cost ? `\\nCost: ${act.cost} ${act.currency || 'EUR'}` : ''))}
LOCATION:${escapeICS(act.location || trip.destination)}
CATEGORIES:${act.type.toUpperCase()}
STATUS:CONFIRMED
END:VEVENT
`;
      });
    });
    
    icsContent += 'END:VCALENDAR';
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open Google Calendar to add trip
  const addToGoogleCalendar = () => {
    if (!trip) return;
    
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    
    // Format dates as YYYYMMDD
    const formatDate = (d: Date) => {
      return d.toISOString().split('T')[0].replace(/-/g, '');
    };
    
    const title = encodeURIComponent(trip.title);
    const details = encodeURIComponent(`Trip to ${trip.destination}\n\nBudget: ${trip.budget || 'Not set'} ${trip.currency || 'EUR'}`);
    const location = encodeURIComponent(trip.destination);
    const dates = `${formatDate(startDate)}/${formatDate(new Date(endDate.getTime() + 24*60*60*1000))}`; // Add 1 day for Google Calendar all-day event
    
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    
    window.open(googleCalUrl, '_blank');
  };

  const openActivityDetail = (act: Activity) => {
    setViewActivity(act);
    setShowActivityDetail(true);
  };

  const handleImportActivities = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trip) return;
    
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        const activities: any[] = [];
        
        if (fileName.endsWith('.json')) {
          // JSON format
          const data = JSON.parse(content as string);
          if (Array.isArray(data)) {
            activities.push(...data);
          } else if (data.activities) {
            activities.push(...data.activities);
          } else if (data.days) {
            data.days.forEach((day: any) => {
              if (day.activities) activities.push(...day.activities);
            });
          }
        } else if (fileName.endsWith('.txt')) {
          // Parse text format
          const lines = (content as string).split('\n');
          let currentActivity: any = {};
          
          lines.forEach(line => {
            const timeMatch = line.match(/\[(\d{2}:\d{2})\]\s+(.+?)\s+\((\w+)\)/);
            if (timeMatch) {
              if (currentActivity.title) activities.push(currentActivity);
              currentActivity = {
                title: timeMatch[2],
                type: timeMatch[3],
                startTime: timeMatch[1]
              };
            }
            if (line.includes('Location:')) {
              currentActivity.location = line.split('Location:')[1].trim();
            }
            if (line.includes('Note:')) {
              currentActivity.description = line.split('Note:')[1].trim();
            }
            if (line.includes('Cost:')) {
              const costMatch = line.split('Cost:')[1].trim().match(/(\d+)/);
              if (costMatch) currentActivity.cost = parseFloat(costMatch[1]);
            }
          });
          if (currentActivity.title) activities.push(currentActivity);
        } else if (fileName.endsWith('.csv')) {
          // CSV format
          const text = content as string;
          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length > 1) {
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',');
              const act: any = {};
              headers.forEach((h, idx) => {
                if (h.includes('title') || h.includes('activity')) act.title = values[idx]?.trim();
                if (h.includes('type')) act.type = values[idx]?.trim();
                if (h.includes('time')) act.startTime = values[idx]?.trim();
                if (h.includes('location')) act.location = values[idx]?.trim();
                if (h.includes('description') || h.includes('details')) act.description = values[idx]?.trim();
                if (h.includes('cost')) act.cost = parseFloat(values[idx]) || 0;
              });
              if (act.title) activities.push(act);
            }
          }
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          // Excel format
          const arrayBuffer = content as ArrayBuffer;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          
          jsonData.forEach((row: any) => {
            activities.push({
              title: row.Activity || row.Title || row.title || row.activity || 'Activity',
              type: row.Type || row.type || 'activity',
              description: row.Description || row.description || row.Details || '',
              location: row.Location || row.location || '',
              cost: parseFloat(row.Cost || row.cost) || 0,
              startTime: row.Time || row.time || ''
            });
          });
        } else if (fileName.endsWith('.pdf')) {
          // PDF format - extract text and parse activities
          const arrayBuffer = content as ArrayBuffer;
          const fullText = await extractPDFText(arrayBuffer);
          
          // Parse the extracted text for activities
          const lines = fullText.split('\n');
          let currentActivity: any = {};
          
          lines.forEach(line => {
            // Try to find time patterns like "08:00" or "[08:00]"
            const timeMatch = line.match(/\[?(\d{2}:\d{2})\]?\s*[-–]?\s*(.+)/);
            if (timeMatch && timeMatch[2].length > 2) {
              if (currentActivity.title) activities.push(currentActivity);
              currentActivity = {
                title: timeMatch[2].trim().substring(0, 100),
                startTime: timeMatch[1],
                type: 'activity'
              };
            }
            if (line.includes('Location:') || line.includes('📍')) {
              currentActivity.location = line.replace('Location:', '').replace('📍', '').trim();
            }
            if (line.includes('Cost:') || line.includes('💰')) {
              const costMatch = line.match(/(\d+)/);
              if (costMatch) currentActivity.cost = parseFloat(costMatch[1]);
            }
          });
          if (currentActivity.title) activities.push(currentActivity);
        }
        
        // Create activities via API
        let importedCount = 0;
        for (const act of activities) {
          const dayId = selectedDayId || trip.days[0]?.id;
          if (!dayId) continue;
          
          await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dayId,
              title: act.title || act.Activity || 'Imported Activity',
              type: act.type || act.Type || 'activity',
              description: act.description || act.Description || act.Details || '',
              location: act.location || act.Location || '',
              cost: act.cost || act.Cost || 0,
              currency: act.currency || 'EUR',
              images: '[]'
            })
          });
          importedCount++;
        }
        
        alert(`${importedCount} activities imported!`);
        fetchTrip();
      } catch (err) {
        alert('Error importing file. Please check the format.');
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

  if (loading) return <div className={styles.main} style={{padding:'2rem'}}>{t('common.loading')}</div>;
  if (!trip) return <div className={styles.main}>Trip not found</div>;

  return (
    <main className={styles.main}>
      {/* 1. Navigation */}
      <nav className={styles.navBar}>
         <Link href="/" className={styles.homeLink}>
            ⬅ {t('common.backToDashboard')}
         </Link>
         {/* Theme toggle is in layout, but we could add branding here */}
      </nav>

      {/* 2. Hero Section */}
      <div className={styles.hero}>
        {trip.coverImage && <img src={trip.coverImage} className={styles.heroImage} alt="Cover" />}
        <div className={styles.heroOverlay} />
        
        <div className={styles.heroContent}>
            <h1 className={styles.title}>{trip.title}</h1>
            <div className={styles.destination}>
                <span>📍 {trip.destination}</span>
            </div>
            
            <div className={styles.statsBar}>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>{t('trip.dates')}</span>
                    <span className={styles.statValue}>{new Date(trip.startDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} - {new Date(trip.endDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>{t('trip.duration')}</span>
                    <span className={styles.statValue}>{Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 3600 * 24))} {t('trip.days')}</span>
                </div>
                {trip.budget > 0 && (
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>{t('trip.budget')}</span>
                        <span className={styles.statValue}>{trip.currency || '$'} {trip.budget}</span>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Budget Tracker */}
      <BudgetTracker 
        budget={trip.budget}
        currency={trip.currency || 'EUR'}
        activities={trip.days.flatMap(day => day.activities.map(a => ({ cost: a.cost, currency: a.currency })))}
      />

      {/* 3. Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionGroup}>
             <button onClick={() => { setSelectedDayId(null); setForm({...form, id:'', dayId: trip.days[0]?.id || '' }); setShowAddModal(true); }} className={`${styles.actionButton} ${styles.primaryBtn}`}>
                <span style={{fontSize:'1.2rem'}}>+</span> {t('common.add')} {t('activity.title')}
             </button>
        </div>
        
        <div className={styles.actionGroup}>
             <button onClick={openEditTrip} className={styles.actionButton}>
                <Edit2 size={16} /> {t('common.edit')}
             </button>
             <button onClick={handleDeleteTrip} className={styles.actionButton} style={{color: '#e53e3e', borderColor:'#e53e3e'}}>
                <Trash2 size={16} /> {t('common.delete')}
             </button>
             <div style={{width:'1px', background:'hsl(var(--border))', margin:'0 0.5rem'}}></div>
             
             {/* Export Dropdown */}
             <div style={{position:'relative'}}>
               <button 
                 onClick={() => setShowExportMenu(!showExportMenu)} 
                 className={styles.actionButton}
                 style={{display:'flex', alignItems:'center', gap:'0.25rem'}}
               >
                 {t('export.title')} ▼
               </button>
                {showExportMenu && (
                 <div style={{
                   position:'absolute',
                   top:'100%',
                   right:0,
                   marginTop:'0.25rem',
                   background:'hsl(var(--card))',
                   border:'1px solid hsl(var(--border))',
                   borderRadius:'0.5rem',
                   boxShadow:'0 4px 12px rgba(0,0,0,0.15)',
                   zIndex:100,
                   minWidth:'140px',
                   overflow:'hidden'
                 }}>
                   <button onClick={() => { exportJSON(); setShowExportMenu(false); }} style={{width:'100%', padding:'0.75rem 1rem', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', color:'hsl(var(--text))'}}>
                     📋 JSON (reimportable)
                   </button>
                   <button onClick={() => { exportMarkdown(); setShowExportMenu(false); }} style={{width:'100%', padding:'0.75rem 1rem', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', color:'hsl(var(--text))', borderTop:'1px solid hsl(var(--border))'}}>
                     📝 Markdown
                   </button>
                   <button onClick={() => { exportPDF(); setShowExportMenu(false); }} style={{width:'100%', padding:'0.75rem 1rem', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', color:'hsl(var(--text))', borderTop:'1px solid hsl(var(--border))'}}>
                     📄 PDF
                   </button>
                   <button onClick={() => { exportExcel(); setShowExportMenu(false); }} style={{width:'100%', padding:'0.75rem 1rem', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', color:'hsl(var(--text))', borderTop:'1px solid hsl(var(--border))'}}>
                     📊 Excel
                   </button>
                   <button onClick={() => { exportText(); setShowExportMenu(false); }} style={{width:'100%', padding:'0.75rem 1rem', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', color:'hsl(var(--text))', borderTop:'1px solid hsl(var(--border))'}}>
                     📝 Text
                   </button>
                   <button onClick={() => { generateMapsItinerary(); setShowExportMenu(false); }} style={{width:'100%', padding:'0.75rem 1rem', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', color:'hsl(var(--text))', borderTop:'1px solid hsl(var(--border))'}}>
                     🗺️ Maps Route
                   </button>
                   <button onClick={() => { exportToCalendar(); setShowExportMenu(false); }} style={{width:'100%', padding:'0.75rem 1rem', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', color:'hsl(var(--text))', borderTop:'1px solid hsl(var(--border))'}}>
                     📅 Calendar (.ics)
                   </button>
                   <button onClick={() => { addToGoogleCalendar(); setShowExportMenu(false); }} style={{width:'100%', padding:'0.75rem 1rem', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', color:'hsl(var(--text))', borderTop:'1px solid hsl(var(--border))'}}>
                     📆 Google Calendar
                   </button>
                 </div>
               )}
             </div>
             
             {/* Import Button */}
             <label className={styles.actionButton} style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'0.25rem'}}>
               <Upload size={14} /> {t('common.import')}
               <input 
                 type="file" 
                 ref={importFileRef}
                 accept=".json,.md,.txt,.csv,.xlsx,.xls,.pdf"
                 style={{display:'none'}}
                 onChange={handleImportActivities}
               />
             </label>
        </div>
      </div>

      <div className={styles.container}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>

        {trip.days.map((day) => (
          <div key={day.id} className={styles.dayCard}>
            <div className={styles.dayHeader}>
              <span className={styles.dayDate}>{t('trip.day')} {day.index + 1} - {new Date(day.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {weekday:'long', month:'short', day:'numeric'})}</span>
            </div>
            <DroppableDay dayId={day.id}>
            <div className={styles.activitiesList}>
              {day.activities.length === 0 ? (
                 <div style={{color:'hsl(var(--text-dim))', fontStyle:'italic', padding:'0.5rem'}}>{t('activity.noActivities')}</div>
              ) : (
                [...day.activities]
                  .sort((a, b) => {
                    if (!a.startTime && !b.startTime) return 0;
                    if (!a.startTime) return 1;
                    if (!b.startTime) return -1;
                    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                  })
                  .map(act => (
                  <DraggableActivity key={act.id} activityId={act.id}>
                    <div className={styles.activityItem} onClick={() => openActivityDetail(act)} style={{cursor:'pointer'}}>
                      <div className={styles.dragHandle} onClick={e => e.stopPropagation()}><GripVertical size={16} /></div>
                      <div className={styles.time}>{act.startTime ? new Date(act.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div>
                      <div className={styles.activityContent}>
                        <h4>{act.title} <span style={{fontSize:'0.75rem', fontWeight:'normal', opacity:0.7}}>({act.type})</span></h4>
                        {act.location && (
                          <p onClick={e => e.stopPropagation()}>
                            📍 <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location)}`} target="_blank" rel="noopener noreferrer" style={{color:'hsl(var(--primary))', textDecoration:'underline'}}>
                              {act.location}
                            </a>
                          </p>
                        )}
                        {act.description && <p style={{opacity:0.8, fontSize:'0.9rem'}}>{act.description.substring(0, 100)}{act.description.length > 100 ? '...' : ''}</p>}
                        {act.images && (
                          <div style={{display:'flex', gap:'0.5rem', marginTop:'0.5rem', overflowX:'auto', paddingBottom:'0.25rem'}}>
                              {JSON.parse(act.images as unknown as string).slice(0, 3).map((img: string, idx: number) => (
                                  <img key={idx} src={img} alt={`Activity ${idx+1}`} style={{width:'48px', height:'48px', objectFit:'cover', borderRadius:'0.375rem', border:'1px solid hsl(var(--border))', flexShrink:0}} />
                              ))}
                              {JSON.parse(act.images as unknown as string).length > 3 && (
                                <div style={{width:'48px', height:'48px', display:'flex', alignItems:'center', justifyContent:'center', background:'hsl(var(--surface))', borderRadius:'0.375rem', fontSize:'0.8rem', color:'hsl(var(--text-dim))'}}>
                                  +{JSON.parse(act.images as unknown as string).length - 3}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                      <div className={styles.cost} onClick={e => e.stopPropagation()}>
                          {act.cost ? `${act.cost} ${act.currency || ''}` : ''}
                          <button onClick={() => { handleEditActivityClick(act, day.id); }} style={{marginLeft:'1rem', color:'#3b82f6', padding:'0.25rem'}}>
                              <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteActivity(act.id)} style={{marginLeft:'0.5rem', color:'#ef4444', padding:'0.25rem'}}>
                              <Trash2 size={16} />
                          </button>
                      </div>
                    </div>
                  </DraggableActivity>
                ))
              )}
              <button 
                className={styles.addActivityBtn}
                onClick={() => { setSelectedDayId(day.id); setForm(prev => ({...prev, dayId: day.id, time:''})); setShowAddModal(true); }}
              >
                + {t('activity.addTitle')}
              </button>
            </div>
            </DroppableDay>
          </div>
        ))}
        </DndContext>
      </div>

      {showAddModal && (
        <div className={styles.formOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.formCard} onClick={e => e.stopPropagation()} style={{maxHeight:'90vh', overflowY:'auto'}}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={styles.formTitle}>{form.id ? t('activity.editTitle') : t('activity.addTitle')}</h3>
                <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateActivity}>
              <div className={styles.formField}>
                <label>{t('activity.day')} ({t('common.required')})</label>
                <select required value={form.dayId} onChange={e => setForm({...form, dayId: e.target.value})}>
                    <option value="">{t('activity.selectDay')}</option>
                    {trip?.days.map((day) => (
                        <option key={day.id} value={day.id}>{t('trip.day')} {day.index + 1} - {new Date(day.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}</option>
                    ))}
                </select>
              </div>
              <div className={styles.formField}>
                 <label>{t('activity.time')} ({t('common.optional')})</label>
                 <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
              </div>
              <div className={styles.formField}>
                <label>{t('activity.type')}</label>
                <select 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})}
                    style={{marginBottom: '0.5rem'}}
                >
                    <option value="activity">{t('activity.types.activity')}</option>
                    <option value="food">{t('activity.types.food')}</option>
                    <option value="travel">{t('activity.types.travel')}</option>
                    <option value="lodging">{t('activity.types.lodging')}</option>
                    <option value="custom">{t('activity.types.custom')}</option>
                </select>
                {form.type === 'custom' && (
                    <input 
                        placeholder="Enter custom type"
                        value={form.customType}
                        onChange={e => setForm({...form, customType: e.target.value})}
                    />
                )}
              </div>
              <div className={styles.formField}>
                <label>{t('activity.title')}</label>
                <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className={styles.formField}>
                <label>{t('activity.location')} ({t('common.optional')})</label>
                <LocationInput 
                  value={form.location} 
                  onChange={(value) => setForm({...form, location: value})}
                  placeholder={t('activity.locationPlaceholder')}
                />
              </div>
              <div className={styles.formField}>
                <label>{t('activity.costAndCurrency')}</label>
                <div style={{display:'flex', gap:'0.5rem'}}>
                    <input type="number" placeholder={t('activity.cost')} value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} style={{flex:2}} />
                    <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} style={{flex:1}}>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="JPY">JPY</option>
                        <option value="LKR">LKR (Sri Lanka)</option>
                        <option value="THB">THB (Thailand)</option>
                        <option value="LAK">LAK (Laos)</option>
                        <option value="PHP">PHP (Philippines)</option>
                    </select>
                </div>
              </div>
              <div className={styles.formField}>
                <label>{t('activity.images')}</label>
                <div style={{display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.5rem'}}>
                    <label style={{cursor:'pointer', padding:'0.5rem 1rem', background:'hsl(var(--surface))', border:'1px dashed hsl(var(--border))', borderRadius:'0.5rem', display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.9rem'}}>
                        <Upload size={16} /> {t('activity.uploadImages')}
                        <input type="file" multiple accept="image/*" style={{display:'none'}} onChange={handleImageUpload} />
                    </label>
                </div>
                {form.images && (
                    <div style={{display:'flex', gap:'0.5rem', marginTop:'0.5rem', overflowX:'auto', padding:'0.5rem', background:'hsl(var(--surface))', borderRadius:'0.5rem'}}>
                        {form.images.split('|').filter(Boolean).map((img, i) => (
                             <div key={i} style={{position:'relative', flexShrink:0}}>
                                <img src={img} style={{width:'64px', height:'64px', objectFit:'cover', borderRadius:'0.375rem', border:'1px solid hsl(var(--border))', display:'block'}} alt="" />
                                <button type="button" onClick={() => {
                                    const newImages = form.images.split('|').filter((_, idx) => idx !== i).join('|');
                                    setForm({...form, images: newImages});
                                }} style={{position:'absolute', top:'-4px', right:'-4px', background:'#e53e3e', color:'white', borderRadius:'50%', width:'18px', height:'18px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', border:'none', cursor:'pointer'}}>×</button>
                             </div>
                        ))}
                    </div>
                )}
              </div>
              <div className={styles.formField}>
                <label>{t('activity.description')} ({t('common.optional')})</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className={styles.saveBtn}>{t('activity.saveActivity')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditTripModal && (
        <div className={styles.formOverlay} onClick={() => setShowEditTripModal(false)}>
            <div className={styles.formCard} onClick={e => e.stopPropagation()} style={{maxHeight:'90vh', overflowY:'auto'}}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={styles.formTitle}>Edit Trip Details</h3>
                    <button onClick={() => setShowEditTripModal(false)} style={{background:'transparent', border:'none', cursor:'pointer', color:'hsl(var(--text-main))'}}><X size={24} /></button>
                </div>
                <form onSubmit={handleEditTrip}>
                    <div className={styles.formField}>
                        <label>Trip Title</label>
                        <input required value={tripForm.title} onChange={e => setTripForm({...tripForm, title: e.target.value})} />
                    </div>
                    <div className={styles.formField}>
                        <label>Destination</label>
                        <LocationInput 
                          value={tripForm.destination} 
                          onChange={(value) => setTripForm({...tripForm, destination: value})}
                          placeholder="Enter destination..."
                        />
                    </div>
                    <div style={{display:'flex', gap:'1rem'}}>
                        <div className={styles.formField} style={{flex:1}}>
                            <label>Start Date</label>
                            <input type="date" value={tripForm.startDate} onChange={e => setTripForm({...tripForm, startDate: e.target.value})} />
                        </div>
                        <div className={styles.formField} style={{flex:1}}>
                            <label>End Date</label>
                            <input type="date" min={tripForm.startDate} value={tripForm.endDate} onChange={e => setTripForm({...tripForm, endDate: e.target.value})} />
                        </div>
                    </div>
                    <div className={styles.formField}>
                        <label>Budget</label>
                        <input type="number" placeholder="0.00" value={tripForm.budget} onChange={e => setTripForm({...tripForm, budget: e.target.value})} />
                    </div>
                    <div className={styles.formField}>
                        <label>Cover Image</label>
                        <div style={{display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.5rem'}}>
                             <label style={{cursor:'pointer', padding:'0.5rem 1rem', background:'hsl(var(--surface))', border:'1px dashed hsl(var(--border))', borderRadius:'0.5rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                                <Upload size={16} /> Upload New Cover
                                <input type="file" accept="image/*" style={{display:'none'}} onChange={handleTripImageUpload} />
                             </label>
                             {tripForm.coverImage && (
                                 <button type="button" onClick={() => setTripForm({...tripForm, coverImage: ''})} style={{color:'#e53e3e', fontSize:'0.8rem'}}>Remove</button>
                             )}
                        </div>
                        {tripForm.coverImage && (
                            <div style={{position:'relative', maxHeight:'150px', overflow:'hidden', borderRadius:'0.5rem', border:'1px solid hsl(var(--border))'}}>
                                <img src={tripForm.coverImage} style={{width:'100%', maxHeight:'150px', objectFit:'cover'}} alt="Cover preview" />
                            </div>
                        )}
                    </div>
                    <div className={styles.formActions}>
                        <button type="button" className={styles.cancelBtn} onClick={() => setShowEditTripModal(false)}>Cancel</button>
                        <button type="submit" className={styles.saveBtn}>Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {showActivityDetail && viewActivity && (
        <div className={styles.formOverlay} onClick={() => setShowActivityDetail(false)}>
          <div className={styles.formCard} onClick={e => e.stopPropagation()} style={{maxHeight:'90vh', overflowY:'auto', maxWidth:'600px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
              <h3 className={styles.formTitle}>{viewActivity.title}</h3>
              <button onClick={() => setShowActivityDetail(false)} style={{background:'transparent', border:'none', cursor:'pointer', color:'hsl(var(--text-main))'}}><X size={24} /></button>
            </div>
            
            <div style={{display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap'}}>
              <span style={{padding:'0.25rem 0.75rem', background:'hsl(var(--primary))', color:'white', borderRadius:'999px', fontSize:'0.8rem'}}>{viewActivity.type}</span>
              {viewActivity.startTime && (
                <span style={{padding:'0.25rem 0.75rem', background:'hsl(var(--surface))', borderRadius:'999px', fontSize:'0.8rem'}}>
                  ⏰ {new Date(viewActivity.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </span>
              )}
              {viewActivity.cost && (
                <span style={{padding:'0.25rem 0.75rem', background:'hsl(var(--surface))', borderRadius:'999px', fontSize:'0.8rem'}}>
                  💰 {viewActivity.cost} {viewActivity.currency || ''}
                </span>
              )}
            </div>

            {viewActivity.location && (
              <div style={{marginBottom:'1rem', padding:'0.75rem', background:'hsl(var(--surface))', borderRadius:'0.5rem'}}>
                <strong>📍 Location</strong>
                <p style={{marginTop:'0.25rem'}}>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewActivity.location)}`} target="_blank" rel="noopener noreferrer" style={{color:'hsl(var(--primary))', textDecoration:'underline'}}>
                    {viewActivity.location}
                  </a>
                </p>
              </div>
            )}

            {viewActivity.description && (
              <div style={{marginBottom:'1rem'}}>
                <strong>Description</strong>
                <p style={{marginTop:'0.25rem', lineHeight:1.6, whiteSpace:'pre-wrap'}}>{viewActivity.description}</p>
              </div>
            )}

            {viewActivity.images && (
              <div style={{marginBottom:'1rem'}}>
                <strong>Photos</strong>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'0.5rem', marginTop:'0.5rem'}}>
                  {JSON.parse(viewActivity.images as unknown as string).map((img: string, idx: number) => (
                    <img key={idx} src={img} alt={`Photo ${idx+1}`} style={{width:'100%', height:'100px', objectFit:'cover', borderRadius:'0.5rem', cursor:'pointer'}} onClick={(e) => { e.stopPropagation(); window.open(img, '_blank'); }} />
                  ))}
                </div>
              </div>
            )}

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowActivityDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
