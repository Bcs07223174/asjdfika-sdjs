import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get("doctorId")
    const date = searchParams.get("date")

    if (!doctorId || !date) {
      return NextResponse.json({ error: "Doctor ID and date are required" }, { status: 400 })
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(doctorId)) {
      return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
    }

    console.log(`Looking for booked appointment requests for doctor ${doctorId} on ${date}`)

    const db = await connectToDatabase()

    // Create date range for the day
    const startDate = new Date(date)
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 1)

    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Find all pending appointment requests for this doctor on this date
    const appointmentRequests = await db
      .collection("_appointment")
      .find({
        doctorId: new ObjectId(doctorId),
        date: date,
        status: "pending"
      })
      .toArray()

    console.log(`Found ${appointmentRequests.length} pending appointment requests:`, appointmentRequests)

    // Format the booked slots as time_slot strings
    const bookedSlots = appointmentRequests.map((request: any) => `${date}_${request.time}`)

    console.log("Booked slots formatted:", bookedSlots)

    return NextResponse.json({ bookedSlots })
  } catch (error) {
    console.error("Error fetching booked appointment request slots:", error)
    return NextResponse.json({ error: "Failed to fetch booked slots" }, { status: 500 })
  }
}