import jsPDF from 'jspdf';
import type { Activity, Day, Trip } from '@/lib/db/types';
import { formatActivityDuration, formatActivityTimeRange } from '@/lib/activityTime';
import { calculateTotalInCurrency } from '@/lib/currency';
import { safeParseImageArray } from '@/lib/safeJson';
import {
  EXPORT_APP_NAME,
  EXPORT_WEBSITE,
  EXPORT_WEBSITE_LABEL,
  getAppLogoPngDataUrl,
  getExportCopyright,
} from '@/lib/exportBranding';

const STAMP: [number, number, number] = [149, 47, 36];
const PAPER: [number, number, number] = [247, 244, 239];
const INK: [number, number, number] = [35, 31, 28];
const MUTED: [number, number, number] = [100, 95, 88];
const RULE: [number, number, number] = [210, 205, 195];

const PAGE_LEFT = 14;
const PAGE_RIGHT = 196;
const PAGE_WIDTH = 182;
const SUMMARY_LABEL_WIDTH = 52;
const SUMMARY_VALUE_WIDTH = PAGE_WIDTH - SUMMARY_LABEL_WIDTH - 12;
const SUMMARY_VALUE_X = PAGE_LEFT + PAGE_WIDTH - 4;
const CONTENT_MAX_Y = 266;
const FOOTER_LINE_Y = 281;

type ExportLanguage = 'fr' | 'en';

function labels(language: ExportLanguage) {
  return language === 'fr'
    ? {
        summary: 'Résumé du voyage',
        itinerary: 'Itinéraire',
        budget: 'Budget',
        dates: 'Dates',
        duration: 'Durée',
        countries: 'Pays',
        activities: 'Activités',
        daysPlanned: 'Jours planifiés',
        spent: 'Dépensé',
        remaining: 'Restant',
        total: 'Budget total',
        dayTotal: 'Sous-total jour',
        noActivities: 'Aucune activité planifiée.',
        maps: 'Voir sur Maps',
        generated: 'Généré le',
        activitiesCount: (n: number) => `${n} activité${n > 1 ? 's' : ''}`,
        daysCount: (n: number) => `${n} jour${n > 1 ? 's' : ''}`,
        tripDays: (n: number) => `${n} jour${n > 1 ? 's' : ''} de voyage`,
        day: 'Jour',
      }
    : {
        summary: 'Trip summary',
        itinerary: 'Itinerary',
        budget: 'Budget',
        dates: 'Dates',
        duration: 'Duration',
        countries: 'Countries',
        activities: 'Activities',
        daysPlanned: 'Days with plans',
        spent: 'Spent',
        remaining: 'Remaining',
        total: 'Total budget',
        dayTotal: 'Day subtotal',
        noActivities: 'No activities planned yet.',
        maps: 'View on Maps',
        generated: 'Generated on',
        activitiesCount: (n: number) => `${n} activit${n === 1 ? 'y' : 'ies'}`,
        daysCount: (n: number) => `${n} day${n === 1 ? '' : 's'}`,
        tripDays: (n: number) => `${n} day${n === 1 ? '' : 's'} trip`,
        day: 'Day',
      };
}

function locale(language: ExportLanguage) {
  return language === 'fr' ? 'fr-FR' : 'en-US';
}

function pdfSafeText(text: string): string {
  return text
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[\u2013\u2014\u2192]/g, '-')
    .replace(/\u00b7/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function measureLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const lines = doc.splitTextToSize(pdfSafeText(text), maxWidth);
  return Array.isArray(lines) ? lines : [lines];
}

function formatDateRange(trip: Trip, language: ExportLanguage) {
  const monthsFr = [
    'jan.', 'fev.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.',
  ];
  const monthsEn = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const months = language === 'fr' ? monthsFr : monthsEn;

  const format = (iso: string) => {
    const date = new Date(iso);
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const start = format(trip.startDate);
  const end = format(trip.endDate);
  return language === 'fr' ? `${start} au ${end}` : `${start} to ${end}`;
}

function measureSummaryValueLines(doc: jsPDF, value: string, bold = false): string[] {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(9);
  return measureLines(doc, value, SUMMARY_VALUE_WIDTH);
}

function drawSummaryRow(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  valueBold = false,
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(label, PAGE_LEFT + 4, y);

  doc.setFont('helvetica', valueBold ? 'bold' : 'normal');
  doc.setTextColor(...INK);
  const lines = measureSummaryValueLines(doc, pdfSafeText(value), valueBold);
  lines.forEach((line, index) => {
    doc.text(line, SUMMARY_VALUE_X, y + index * 4.5, { align: 'right' });
  });

  return y + Math.max(6, lines.length * 4.5);
}

function tripLengthDays(trip: Trip) {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function sortActivities(day: Day) {
  return [...day.activities].sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
}

function formatMoney(amount: number, currency: string, language: ExportLanguage) {
  const code = currency || 'EUR';
  const formatted = new Intl.NumberFormat(locale(language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

  return pdfSafeText(`${formatted} ${code}`);
}

function measureActivityCardHeight(
  doc: jsPDF,
  act: Activity,
  language: ExportLanguage,
): number {
  let height = 14;
  height += 7;

  if (act.location) height += 6;

  if (act.description) {
    doc.setFontSize(8);
    height += measureLines(doc, act.description, PAGE_WIDTH - 12).length * 4.2;
  }

  if (act.cost) height += 6;

  const images = act.images ? safeParseImageArray(act.images as unknown as string) : [];
  if (images.length > 0) height += 28;

  return height + 6;
}

function ensureSpace(doc: jsPDF, yPos: number, needed: number) {
  if (yPos + needed > CONTENT_MAX_Y) {
    doc.addPage();
    return 22;
  }
  return yPos;
}

function drawCoverScrim(doc: jsPDF, y: number, height: number) {
  doc.saveGraphicsState();
  doc.setGState(doc.GState({ opacity: 0.68 }));
  doc.setFillColor(20, 12, 10);
  doc.rect(0, y, 210, height, 'F');
  doc.restoreGraphicsState();
}

function drawCoverSection(
  doc: jsPDF,
  trip: Trip,
  logoPng: string | null,
): number {
  const coverHeight = 56;
  const overlayHeight = 30;
  const hasCoverImage = trip.coverImage?.startsWith('data:image');

  if (hasCoverImage) {
    try {
      doc.addImage(trip.coverImage!, 'JPEG', 0, 0, 210, coverHeight);
      drawCoverScrim(doc, coverHeight - overlayHeight, overlayHeight);
    } catch {
      doc.setFillColor(...STAMP);
      doc.rect(0, 0, 210, coverHeight, 'F');
    }
  } else {
    doc.setFillColor(...STAMP);
    doc.rect(0, 0, 210, coverHeight, 'F');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const titleLines = measureLines(doc, trip.title, PAGE_WIDTH - 4).slice(0, 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const destinationLines = measureLines(doc, trip.destination, PAGE_WIDTH - 4).slice(0, 1);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const titleBlockHeight = titleLines.length === 2 ? 18 : 10;
  const titleStartY = coverHeight - overlayHeight + (overlayHeight - titleBlockHeight - 8) / 2 + 6;
  doc.text(titleLines, PAGE_LEFT + 2, titleStartY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(destinationLines[0], PAGE_LEFT + 2, coverHeight - 6);

  drawBrandingStrip(doc, coverHeight, logoPng);
  return coverHeight;
}

function drawBrandingStrip(doc: jsPDF, y: number, logoPng: string | null) {
  doc.setFillColor(...PAPER);
  doc.rect(0, y, 210, 14, 'F');
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.line(PAGE_LEFT, y + 14, PAGE_RIGHT, y + 14);

  if (logoPng) {
    doc.addImage(logoPng, 'PNG', PAGE_LEFT, y + 2.5, 9, 9);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(EXPORT_APP_NAME, logoPng ? 26 : PAGE_LEFT, y + 9.5);
}

function drawPageFooter(
  doc: jsPDF,
  pageIndex: number,
  pageCount: number,
  logoPng: string | null,
  language: ExportLanguage,
) {
  const loc = locale(language);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.line(PAGE_LEFT, FOOTER_LINE_Y, PAGE_RIGHT, FOOTER_LINE_Y);

  if (logoPng) {
    doc.addImage(logoPng, 'PNG', PAGE_LEFT, 282.5, 7, 7);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK);
  doc.text(EXPORT_APP_NAME, logoPng ? 22.5 : PAGE_LEFT, 287.5);

  const copyright = getExportCopyright();
  const separator = ' | ';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  const copyrightWidth = doc.getTextWidth(copyright);
  const separatorWidth = doc.getTextWidth(separator);
  const siteWidth = doc.getTextWidth(EXPORT_WEBSITE_LABEL);
  const footerStartX = 105 - (copyrightWidth + separatorWidth + siteWidth) / 2;

  doc.text(copyright, footerStartX, 287.5);
  doc.text(separator, footerStartX + copyrightWidth, 287.5);
  doc.setTextColor(...STAMP);
  doc.textWithLink(EXPORT_WEBSITE_LABEL, footerStartX + copyrightWidth + separatorWidth, 287.5, {
    url: EXPORT_WEBSITE,
  });

  doc.setTextColor(...MUTED);
  doc.text(
    `Page ${pageIndex}/${pageCount}`,
    PAGE_RIGHT,
    287.5,
    { align: 'right' },
  );
}

function drawSectionTitle(doc: jsPDF, y: number, title: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...STAMP);
  doc.text(title.toUpperCase(), PAGE_LEFT, y);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.4);
  doc.line(PAGE_LEFT, y + 2.5, PAGE_RIGHT, y + 2.5);
  return y + 10;
}

function computeSummaryBoxHeight(
  doc: jsPDF,
  trip: Trip,
  language: ExportLanguage,
  totalActivities: number,
  daysWithActivities: number,
  totalSpent: number | null,
) {
  const L = labels(language);
  const currency = trip.currency || 'EUR';
  const rows: string[] = [
    formatDateRange(trip, language),
    L.tripDays(tripLengthDays(trip)),
    trip.destination || '-',
    L.daysCount(daysWithActivities),
    L.activitiesCount(totalActivities),
  ];

  if (trip.budget && totalSpent !== null) {
    rows.push(
      formatMoney(totalSpent, currency, language),
      formatMoney(trip.budget - totalSpent, currency, language),
      formatMoney(trip.budget, currency, language),
    );
  }

  let height = 14;
  const rowHeights = rows.map((value, index) => {
    const isBudgetRow = Boolean(
      trip.budget && totalSpent !== null && index >= rows.length - 3,
    );
    const lineCount = measureSummaryValueLines(doc, value, isBudgetRow).length;
    return Math.max(6, lineCount * 4.5);
  });

  for (const rowHeight of rowHeights) {
    height += rowHeight;
  }

  if (trip.budget && totalSpent !== null) {
    height += 4;
  }

  return height;
}

function drawSummaryBox(
  doc: jsPDF,
  y: number,
  trip: Trip,
  language: ExportLanguage,
  totalActivities: number,
  daysWithActivities: number,
  totalSpent: number | null,
) {
  const L = labels(language);
  const currency = trip.currency || 'EUR';
  const boxHeight = computeSummaryBoxHeight(
    doc,
    trip,
    language,
    totalActivities,
    daysWithActivities,
    totalSpent,
  );

  doc.setFillColor(...PAPER);
  doc.roundedRect(PAGE_LEFT, y - 4, PAGE_WIDTH, boxHeight, 2, 2, 'F');
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE_LEFT, y - 4, PAGE_WIDTH, boxHeight, 2, 2, 'S');

  let rowY = y + 2;
  rowY = drawSummaryRow(doc, rowY, L.dates, formatDateRange(trip, language));
  rowY = drawSummaryRow(doc, rowY, L.duration, L.tripDays(tripLengthDays(trip)));
  rowY = drawSummaryRow(doc, rowY, L.countries, trip.destination || '-');
  rowY = drawSummaryRow(doc, rowY, L.daysPlanned, L.daysCount(daysWithActivities));
  rowY = drawSummaryRow(doc, rowY, L.activities, L.activitiesCount(totalActivities), true);

  if (trip.budget && totalSpent !== null) {
    rowY += 2;
    doc.setDrawColor(...RULE);
    doc.line(PAGE_LEFT + 4, rowY - 2, SUMMARY_VALUE_X, rowY - 2);
    rowY = drawSummaryRow(
      doc,
      rowY + 2,
      L.spent,
      formatMoney(totalSpent, currency, language),
      true,
    );
    rowY = drawSummaryRow(
      doc,
      rowY,
      L.remaining,
      formatMoney(trip.budget - totalSpent, currency, language),
      true,
    );
    drawSummaryRow(
      doc,
      rowY,
      L.total,
      formatMoney(trip.budget, currency, language),
    );
  }

  return y + boxHeight + 8;
}

function drawActivityCard(
  doc: jsPDF,
  y: number,
  act: Activity,
  language: ExportLanguage,
) {
  const cardHeight = measureActivityCardHeight(doc, act, language);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.roundedRect(PAGE_LEFT, y, PAGE_WIDTH, cardHeight, 2, 2, 'FD');

  let innerY = y + 7;
  const timeStr = pdfSafeText(formatActivityTimeRange(act));
  const duration = formatActivityDuration(act, language);
  let titleX = PAGE_LEFT + 4;

  if (timeStr !== '--:--') {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    const timeLabel = duration ? `${timeStr} - ${duration}` : timeStr;
    const badgeWidth = Math.min(Math.max(doc.getTextWidth(timeLabel) + 8, 22), 58);
    doc.setFillColor(...STAMP);
    doc.roundedRect(PAGE_LEFT + 4, innerY - 4.5, badgeWidth, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(timeLabel, PAGE_LEFT + 4 + badgeWidth / 2, innerY, { align: 'center' });
    titleX = PAGE_LEFT + 4 + badgeWidth + 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  const titleLines = measureLines(doc, act.title, PAGE_RIGHT - titleX - 34);
  doc.text(titleLines[0], titleX, innerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(pdfSafeText(act.type).toUpperCase(), PAGE_RIGHT - 4, innerY, { align: 'right' });

  innerY += 7;

  if (act.location) {
    doc.setFontSize(8.5);
    doc.setTextColor(...STAMP);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location)}`;
    doc.textWithLink(`> ${pdfSafeText(act.location)}`, PAGE_LEFT + 4, innerY, { url: mapsUrl });
    innerY += 6;
  }

  if (act.description) {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const descLines = measureLines(doc, act.description, PAGE_WIDTH - 12);
    doc.text(descLines, PAGE_LEFT + 4, innerY);
    innerY += descLines.length * 4.2;
  }

  if (act.cost) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...STAMP);
    doc.text(formatMoney(act.cost, act.currency || 'EUR', language), PAGE_LEFT + 4, innerY);
    innerY += 6;
  }

  if (act.images) {
    const images = safeParseImageArray(act.images as unknown as string);
    if (images.length > 0) {
      let imgX = PAGE_LEFT + 4;
      images.slice(0, 4).forEach((src) => {
        if (src.startsWith('data:image')) {
          try {
            doc.addImage(src, 'JPEG', imgX, innerY, 28, 20);
            imgX += 32;
          } catch {
            // skip invalid image
          }
        }
      });
    }
  }

  return y + cardHeight + 5;
}

export async function generateTripPdf(trip: Trip, language: ExportLanguage): Promise<void> {
  const doc = new jsPDF();
  const L = labels(language);
  const loc = locale(language);

  let logoPng: string | null = null;
  try {
    logoPng = await getAppLogoPngDataUrl(128);
  } catch {
    logoPng = null;
  }

  const coverHeight = drawCoverSection(doc, trip, logoPng);

  const allActivities = trip.days.flatMap((day) => day.activities);
  const daysWithActivities = trip.days.filter((day) => day.activities.length > 0);
  const currency = trip.currency || 'EUR';
  let totalSpent: number | null = null;
  if (trip.budget && allActivities.length > 0) {
    try {
      totalSpent = await calculateTotalInCurrency(allActivities, currency);
    } catch {
      totalSpent = allActivities.reduce((sum, act) => sum + (act.cost || 0), 0);
    }
  }

  let yPos = coverHeight + 22;
  yPos = drawSectionTitle(doc, yPos, L.summary);
  yPos = drawSummaryBox(doc, yPos, trip, language, allActivities.length, daysWithActivities.length, totalSpent);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    pdfSafeText(`${L.generated} ${new Date().toLocaleDateString(loc)}`),
    PAGE_LEFT,
    yPos,
  );
  yPos += 10;

  yPos = drawSectionTitle(doc, yPos, L.itinerary);

  if (daysWithActivities.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(L.noActivities, PAGE_LEFT, yPos);
  }

  for (const day of daysWithActivities) {
    const sorted = sortActivities(day);
    const dayDate = pdfSafeText(
      new Date(day.date).toLocaleDateString(loc, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    );
    const dayCost = sorted.reduce((sum, act) => sum + (act.cost || 0), 0);

    yPos = ensureSpace(doc, yPos, 20);
    doc.setFillColor(...STAMP);
    doc.rect(PAGE_LEFT, yPos - 5, PAGE_WIDTH, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const dayLabel = `${L.day} ${day.index + 1} - ${dayDate}`;
    const dayLabelWidth = dayCost > 0 ? PAGE_WIDTH - 58 : PAGE_WIDTH - 8;
    const dayLines = measureLines(doc, dayLabel, dayLabelWidth);
    doc.text(dayLines[0], PAGE_LEFT + 4, yPos + 2);

    if (dayCost > 0) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${L.dayTotal}: ${formatMoney(dayCost, currency, language)}`,
        SUMMARY_VALUE_X,
        yPos + 2,
        { align: 'right' },
      );
    }

    yPos += 12;

    for (const act of sorted) {
      const cardHeight = measureActivityCardHeight(doc, act, language);
      yPos = ensureSpace(doc, yPos, cardHeight);
      yPos = drawActivityCard(doc, yPos, act, language);
    }

    yPos += 4;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawPageFooter(doc, i, pageCount, logoPng, language);
  }

  doc.save(`${trip.title.replace(/\s+/g, '_')}_itinerary.pdf`);
}
