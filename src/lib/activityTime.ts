export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480] as const;

export function timeStringFromIso(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function buildDateTimeForDay(dayDate: string, timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const dateBase = new Date(dayDate);
  dateBase.setHours(hours, minutes, 0, 0);
  return dateBase.toISOString();
}

export function computeActivityTimes(
  dayDate: string,
  startTimeStr: string,
  durationMinutes: string,
): { startTime: string | null; endTime: string | null } {
  if (!startTimeStr) {
    return { startTime: null, endTime: null };
  }

  const startTime = buildDateTimeForDay(dayDate, startTimeStr);
  const minutes = parseInt(durationMinutes, 10);

  if (!durationMinutes || Number.isNaN(minutes) || minutes <= 0) {
    return { startTime, endTime: null };
  }

  const endTime = new Date(new Date(startTime).getTime() + minutes * 60 * 1000).toISOString();
  return { startTime, endTime };
}

export function durationMinutesFromActivity(activity: {
  startTime?: string | null;
  endTime?: string | null;
}): string {
  if (!activity.startTime || !activity.endTime) return '';
  const diffMs = new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime();
  if (diffMs <= 0) return '';
  return String(Math.round(diffMs / 60_000));
}

export function formatActivityTimeRange(activity: {
  startTime?: string | null;
  endTime?: string | null;
}): string {
  const start = timeStringFromIso(activity.startTime);
  const end = timeStringFromIso(activity.endTime);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return '--:--';
}

export function formatDurationLabel(minutes: number, language: 'fr' | 'en'): string {
  if (minutes < 60) {
    return language === 'fr' ? `${minutes} min` : `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (language === 'fr') {
    if (rest === 0) return `${hours} h`;
    return `${hours} h ${rest} min`;
  }
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function formatActivityDuration(
  activity: { startTime?: string | null; endTime?: string | null },
  language: 'fr' | 'en',
): string | null {
  const minutes = parseInt(durationMinutesFromActivity(activity), 10);
  if (!minutes) return null;
  return formatDurationLabel(minutes, language);
}
