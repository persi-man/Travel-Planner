import { getAllTrips, saveTrip } from './store';
import type { Activity, CreateActivityInput, Trip, UpdateActivityInput } from './types';
import { serializeImages } from '../safeJson';
import { validateActivityInput } from '../validation';

function newId(): string {
  return crypto.randomUUID();
}

function findActivityTrip(trip: Trip, activityId: string): { trip: Trip; dayIndex: number; activityIndex: number } | null {
  for (let di = 0; di < trip.days.length; di++) {
    const ai = trip.days[di].activities.findIndex((a) => a.id === activityId);
    if (ai !== -1) return { trip, dayIndex: di, activityIndex: ai };
  }
  return null;
}

function resolveDayId(trip: Trip, dayId: string, startTime?: string | null): string {
  if (!startTime) return dayId;

  const activityDate = new Date(startTime);
  activityDate.setHours(0, 0, 0, 0);

  const currentDay = trip.days.find((d) => d.id === dayId);
  if (!currentDay) return dayId;

  const currentDayDate = new Date(currentDay.date);
  currentDayDate.setHours(0, 0, 0, 0);

  if (activityDate.getTime() === currentDayDate.getTime()) return dayId;

  const correctDay = trip.days.find((d) => {
    const dDate = new Date(d.date);
    dDate.setHours(0, 0, 0, 0);
    return dDate.getTime() === activityDate.getTime();
  });

  return correctDay?.id ?? dayId;
}

export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  let trip: Trip | null = null;

  for (const t of await getAllTrips()) {
    if (t.days.some((d) => d.id === input.dayId)) {
      trip = t;
      break;
    }
  }

  if (!trip) throw new Error('Day not found');

  const imageArray = Array.isArray(input.images)
    ? input.images
    : typeof input.images === 'string'
      ? input.images.split('|').filter(Boolean)
      : [];

  const validation = validateActivityInput({
    title: input.title,
    description: input.description,
    images: imageArray,
  });
  if (!validation.ok) throw new Error(validation.error);

  const dayId = resolveDayId(trip, input.dayId, input.startTime);
  const dayIndex = trip.days.findIndex((d) => d.id === dayId);
  if (dayIndex === -1) throw new Error('Day not found');

  const activity: Activity = {
    id: newId(),
    dayId,
    type: input.type,
    title: input.title.trim(),
    description: input.description ?? null,
    location: input.location ?? null,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    cost: input.cost != null && input.cost !== '' ? parseFloat(String(input.cost)) : null,
    currency: input.currency ?? 'EUR',
    images: serializeImages(imageArray),
    details: input.details ? JSON.stringify(input.details) : null,
    order: trip.days[dayIndex].activities.length,
  };

  trip.days[dayIndex].activities.push(activity);
  trip.updatedAt = new Date().toISOString();
  await saveTrip(trip);
  return activity;
}

export async function updateActivity(input: UpdateActivityInput): Promise<Activity> {
  const trips = await getAllTrips();
  let located: ReturnType<typeof findActivityTrip> = null;

  for (const t of trips) {
    located = findActivityTrip(t, input.id);
    if (located) break;
  }

  if (!located) throw new Error('Activity not found');

  const { trip, dayIndex, activityIndex } = located;
  const current = trip.days[dayIndex].activities[activityIndex];

  if (input.dayId && input.dayId !== current.dayId) {
    const targetDay = trip.days.find((d) => d.id === input.dayId);
    if (!targetDay) throw new Error('Invalid day assignment');
    if (targetDay.tripId !== trip.id) throw new Error('Invalid day assignment');
  }

  const imageArray =
    input.images !== undefined
      ? Array.isArray(input.images)
        ? input.images
        : input.images.split('|').filter(Boolean)
      : undefined;

  const validation = validateActivityInput({
    title: input.title ?? current.title,
    description: input.description ?? current.description ?? undefined,
    images: imageArray,
  });
  if (!validation.ok) throw new Error(validation.error);

  const updated: Activity = {
    ...current,
    dayId: input.dayId ?? current.dayId,
    type: input.type ?? current.type,
    title: input.title?.trim() ?? current.title,
    description: input.description !== undefined ? input.description : current.description,
    location: input.location !== undefined ? input.location : current.location,
    startTime: input.startTime !== undefined ? input.startTime : current.startTime,
    endTime: input.endTime !== undefined ? input.endTime : current.endTime,
    cost:
      input.cost !== undefined
        ? input.cost != null && input.cost !== ''
          ? parseFloat(String(input.cost))
          : null
        : current.cost,
    currency: input.currency !== undefined ? input.currency : current.currency,
    images: imageArray !== undefined ? serializeImages(imageArray) : current.images,
  };

  if (input.dayId && input.dayId !== current.dayId) {
    trip.days[dayIndex].activities.splice(activityIndex, 1);
    const newDayIndex = trip.days.findIndex((d) => d.id === input.dayId);
    updated.order = trip.days[newDayIndex].activities.length;
    trip.days[newDayIndex].activities.push(updated);
  } else {
    trip.days[dayIndex].activities[activityIndex] = updated;
  }

  trip.updatedAt = new Date().toISOString();
  await saveTrip(trip);
  return updated;
}

export async function deleteActivity(id: string): Promise<void> {
  const trips = await getAllTrips();

  for (const trip of trips) {
    for (let di = 0; di < trip.days.length; di++) {
      const ai = trip.days[di].activities.findIndex((a) => a.id === id);
      if (ai !== -1) {
        trip.days[di].activities.splice(ai, 1);
        trip.updatedAt = new Date().toISOString();
        await saveTrip(trip);
        return;
      }
    }
  }

  throw new Error('Activity not found');
}
