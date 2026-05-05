import { Booking, Event } from "@/database";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await connectToDatabase();

    const { slug } = await params;

    if (!slug || slug.trim().length === 0) {
      return NextResponse.json({ message: "Invalid slug" }, { status: 400 });
    }

    const event = await Event.findOne({ slug: slug.trim().toLowerCase() }).lean();

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    const bookings = await Booking.countDocuments({ eventId: event._id });

    return NextResponse.json({ message: "Bookings fetched successfully", bookings }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ message: "Bookings fetching failed", error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
