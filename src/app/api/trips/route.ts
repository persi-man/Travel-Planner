import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const trips = await prisma.trip.findMany({
      orderBy: { startDate: 'asc' },
      include: {
        _count: {
          select: { days: true },
        },
      },
    });
    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, destination, startDate, endDate, budget, currency, coverImage } = body;
    
    // Basic validation
    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate days between start and end
    const daysToCreate = [];
    let currentDate = new Date(start);
    let index = 0;

    while (currentDate <= end) {
      daysToCreate.push({
        date: new Date(currentDate),
        index: index,
      });
      currentDate.setDate(currentDate.getDate() + 1);
      index++;
    }

    const trip = await prisma.trip.create({
      data: {
        title,
        destination,
        startDate: start,
        endDate: end,
        budget: budget ? parseFloat(budget) : null,
        currency,
        coverImage,
        days: {
          create: daysToCreate,
        },
      },
      include: {
        days: true,
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create trip', details: error }, { status: 500 });
  }
}
