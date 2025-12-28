import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  console.log(`[API] Fetching trip with ID: ${params.id}`);
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: params.id },
      include: {
        days: {
          orderBy: { date: 'asc' },
          include: {
            activities: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await prisma.trip.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 });
  }
}

// PATCH used to update trip details AND regenerate days if dates change
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const body = await request.json();
        const { title, destination, startDate, endDate, budget, coverImage } = body;
        
        // Get current trip to check if dates changed
        const currentTrip = await prisma.trip.findUnique({
            where: { id: params.id },
            include: { days: { include: { activities: true } } }
        });
        
        if (!currentTrip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }
        
        // Check if dates are changing
        const newStart = startDate ? new Date(startDate) : currentTrip.startDate;
        const newEnd = endDate ? new Date(endDate) : currentTrip.endDate;
        const oldStart = currentTrip.startDate;
        const oldEnd = currentTrip.endDate;
        
        const datesChanged = (startDate && newStart.getTime() !== oldStart.getTime()) || 
                            (endDate && newEnd.getTime() !== oldEnd.getTime());
        
        // Update trip basic info first
        const updatedTrip = await prisma.trip.update({
            where: { id: params.id },
            data: {
                title: title || undefined,
                destination: destination || undefined,
                startDate: newStart,
                endDate: newEnd,
                budget: budget ? parseFloat(budget) : undefined,
                coverImage: coverImage !== undefined ? coverImage : undefined
            }
        });
        
        // If dates changed, regenerate days
        if (datesChanged) {
            // Create a map of existing days by date string
            const existingDaysByDate: Record<string, typeof currentTrip.days[0]> = {};
            for (const day of currentTrip.days) {
                const dateKey = new Date(day.date).toISOString().split('T')[0];
                existingDaysByDate[dateKey] = day;
            }
            
            // Generate new date range
            const newDates: Date[] = [];
            const current = new Date(newStart);
            while (current <= newEnd) {
                newDates.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
            
            // Delete days that are outside new range
            for (const day of currentTrip.days) {
                const dayDate = new Date(day.date);
                if (dayDate < newStart || dayDate > newEnd) {
                    await prisma.day.delete({ where: { id: day.id } });
                }
            }
            
            // Create new days that don't exist yet
            for (let i = 0; i < newDates.length; i++) {
                const dateKey = newDates[i].toISOString().split('T')[0];
                if (!existingDaysByDate[dateKey]) {
                    await prisma.day.create({
                        data: {
                            tripId: params.id,
                            date: newDates[i],
                            index: i
                        }
                    });
                } else {
                    // Update index for existing day
                    await prisma.day.update({
                        where: { id: existingDaysByDate[dateKey].id },
                        data: { index: i }
                    });
                }
            }
        }
        
        return NextResponse.json(updatedTrip);
    } catch (error) {
        console.error('PATCH trip error:', error);
        return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
    }
}
