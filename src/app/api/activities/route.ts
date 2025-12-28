import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { dayId, type, title, description, location, startTime, endTime, cost, currency, images, details } = body;

    // Date Auto-Correction Logic
    if (startTime) {
      const activityDate = new Date(startTime);
      activityDate.setHours(0, 0, 0, 0);

      // Fetch the current day to check its date
      const currentDay = await prisma.day.findUnique({
        where: { id: dayId },
        include: { trip: { include: { days: true } } }
      });

      if (currentDay) {
        const currentDayDate = new Date(currentDay.date);
        currentDayDate.setHours(0, 0, 0, 0);

        // If dates mismatch, find the correct day in the same trip
        if (activityDate.getTime() !== currentDayDate.getTime()) {
           const correctDay = currentDay.trip.days.find(d => {
             const dDate = new Date(d.date);
             dDate.setHours(0,0,0,0);
             return dDate.getTime() === activityDate.getTime();
           });
           
           if (correctDay) {
             dayId = correctDay.id;
           }
        }
      }
    }

    const activity = await prisma.activity.create({
      data: {
        dayId,
        type,
        title,
        description,
        location,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        cost: cost ? parseFloat(cost) : null,
        currency,
        images: images ? JSON.stringify(images) : null,
        details: details ? JSON.stringify(details) : null,
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    // We expect query param ?id=...
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        await prisma.activity.delete({
            where: { id },
        });
        return NextResponse.json({ success: true });
    } catch(error) {
        return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, dayId, type, title, description, location, startTime, cost, currency, images } = body;

        if (!id) {
            return NextResponse.json({ error: 'Activity ID required' }, { status: 400 });
        }

        const updateData: any = {};
        
        // Only update fields that are provided
        if (dayId !== undefined) updateData.dayId = dayId;
        if (type !== undefined) updateData.type = type;
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (location !== undefined) updateData.location = location;
        if (startTime !== undefined) updateData.startTime = startTime ? new Date(startTime) : null;
        if (cost !== undefined) updateData.cost = cost ? parseFloat(cost) : null;
        if (currency !== undefined) updateData.currency = currency;
        if (images !== undefined) updateData.images = Array.isArray(images) ? JSON.stringify(images) : images;

        const activity = await prisma.activity.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(activity);
    } catch (error) {
        console.error('PATCH activity error:', error);
        return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
    }
}

