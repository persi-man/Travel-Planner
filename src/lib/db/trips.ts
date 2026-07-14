import { deleteTripRecord, getAllTrips, getTrip, saveTrip } from './store';
import type {
  CreateTripInput,
  Day,
  Trip,
  TripListItem,
  UpdateTripInput,
} from './types';
import { sanitizeCoverImage, validateTripInput } from '../validation';

function newId(): string {
  return crypto.randomUUID();
}

function buildDays(start: Date, end: Date, tripId: string): Day[] {
  const days: Day[] = [];
  const current = new Date(start);
  let index = 0;
  while (current <= end) {
    days.push({
      id: newId(),
      date: new Date(current).toISOString(),
      tripId,
      index,
      activities: [],
    });
    current.setDate(current.getDate() + 1);
    index++;
  }
  return days;
}

export async function listTrips(): Promise<TripListItem[]> {
  const trips = await getAllTrips();
  return trips
    .map((trip) => ({
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      coverImage: trip.coverImage,
      _count: { days: trip.days.length },
    }))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export async function getTripById(id: string): Promise<Trip | null> {
  const trip = await getTrip(id);
  if (!trip) return null;
  return {
    ...trip,
    days: [...trip.days]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((day) => ({
        ...day,
        activities: [...day.activities].sort((a, b) => a.order - b.order),
      })),
  };
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const validation = validateTripInput(input);
  if (!validation.ok) throw new Error(validation.error);

  const now = new Date().toISOString();
  const id = newId();
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);

  const trip: Trip = {
    id,
    title: input.title.trim(),
    destination: (input.destination ?? '').trim(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    budget: input.budget != null && input.budget !== '' ? parseFloat(String(input.budget)) : null,
    currency: input.currency ?? 'EUR',
    coverImage: sanitizeCoverImage(input.coverImage),
    createdAt: now,
    updatedAt: now,
    days: buildDays(start, end, id),
  };

  await saveTrip(trip);
  return trip;
}

export async function updateTrip(id: string, input: UpdateTripInput): Promise<Trip> {
  const current = await getTrip(id);
  if (!current) throw new Error('Trip not found');

  const validation = validateTripInput({
    title: input.title ?? current.title,
    destination: input.destination ?? current.destination,
    startDate: input.startDate ?? current.startDate,
    endDate: input.endDate ?? current.endDate,
    budget: input.budget ?? current.budget,
    coverImage: input.coverImage !== undefined ? input.coverImage : current.coverImage,
  });
  if (!validation.ok) throw new Error(validation.error);

  const newStart = input.startDate ? new Date(input.startDate) : new Date(current.startDate);
  const newEnd = input.endDate ? new Date(input.endDate) : new Date(current.endDate);
  const datesChanged =
    (input.startDate && newStart.getTime() !== new Date(current.startDate).getTime()) ||
    (input.endDate && newEnd.getTime() !== new Date(current.endDate).getTime());

  let days = [...current.days];

  if (datesChanged) {
    const existingByDate: Record<string, Day> = {};
    for (const day of days) {
      const key = new Date(day.date).toISOString().split('T')[0];
      existingByDate[key] = day;
    }

    const newDates: Date[] = [];
    const cursor = new Date(newStart);
    while (cursor <= newEnd) {
      newDates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    days = days.filter((day) => {
      const d = new Date(day.date);
      return d >= newStart && d <= newEnd;
    });

    const rebuilt: Day[] = [];
    for (let i = 0; i < newDates.length; i++) {
      const key = newDates[i].toISOString().split('T')[0];
      const existing = existingByDate[key];
      if (existing) {
        rebuilt.push({ ...existing, index: i });
      } else {
        rebuilt.push({
          id: newId(),
          date: newDates[i].toISOString(),
          tripId: id,
          index: i,
          activities: [],
        });
      }
    }
    days = rebuilt;
  }

  const updated: Trip = {
    ...current,
    title: input.title?.trim() ?? current.title,
    destination: input.destination?.trim() ?? current.destination,
    startDate: newStart.toISOString(),
    endDate: newEnd.toISOString(),
    budget:
      input.budget !== undefined
        ? input.budget != null && input.budget !== ''
          ? parseFloat(String(input.budget))
          : null
        : current.budget,
    coverImage:
      input.coverImage !== undefined ? sanitizeCoverImage(input.coverImage) : current.coverImage,
    updatedAt: new Date().toISOString(),
    days,
  };

  await saveTrip(updated);
  return updated;
}

export async function deleteTrip(id: string): Promise<void> {
  const existing = await getTrip(id);
  if (!existing) throw new Error('Trip not found');
  await deleteTripRecord(id);
}
