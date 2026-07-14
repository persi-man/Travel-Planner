export interface TripCountry {
  code: string;
  name: string;
}

export interface Activity {
  id: string;
  dayId: string;
  type: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  cost?: number | null;
  currency?: string | null;
  images?: string | null;
  details?: string | null;
  order: number;
}

export interface Day {
  id: string;
  date: string;
  tripId: string;
  note?: string | null;
  index: number;
  activities: Activity[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  countries?: TripCountry[];
  startDate: string;
  endDate: string;
  budget?: number | null;
  currency?: string | null;
  coverImage?: string | null;
  createdAt: string;
  updatedAt: string;
  days: Day[];
}

export interface TripListItem {
  id: string;
  title: string;
  destination: string;
  countries?: TripCountry[];
  startDate: string;
  endDate: string;
  coverImage?: string | null;
  _count: { days: number };
}

export interface CreateTripInput {
  title: string;
  destination?: string;
  countries?: TripCountry[];
  startDate: string;
  endDate: string;
  budget?: string | number | null;
  currency?: string | null;
  coverImage?: string | null;
}

export interface UpdateTripInput {
  title?: string;
  destination?: string;
  countries?: TripCountry[];
  startDate?: string;
  endDate?: string;
  budget?: string | number | null;
  coverImage?: string | null;
}

export interface CreateActivityInput {
  dayId: string;
  type: string;
  title: string;
  description?: string;
  location?: string;
  startTime?: string | null;
  endTime?: string | null;
  cost?: number | string | null;
  currency?: string | null;
  images?: string[] | string;
  details?: unknown;
}

export interface UpdateActivityInput {
  id: string;
  dayId?: string;
  type?: string;
  title?: string;
  description?: string;
  location?: string;
  startTime?: string | null;
  endTime?: string | null;
  cost?: number | string | null;
  currency?: string | null;
  images?: string[] | string;
}
