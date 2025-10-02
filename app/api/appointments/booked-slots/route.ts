import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get("doctorId")
    const date = searchParams.get("date")

    if (!doctorId || !date) {
      return NextResponse.json({ error: "Doctor ID and date required" }, { status: 400 })
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(doctorId)) {
      console.log(`Invalid doctor ObjectId format: ${doctorId}`)
      return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
    }

    const db = await connectToDatabase()
    
    // Find all confirmed appointments for this doctor on the specified date
    const startOfDay = new Date(date)
    const endOfDay = new Date(date)
    endOfDay.setDate(endOfDay.getDate() + 1)

    console.log(`Looking for booked slots for doctor ${doctorId} on ${date}`)
    console.log(`Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`)

    // Search using both possible field names in your database
    const bookedAppointments = await db
      .collection("appointments")
      .find({
        $and: [
          {
            $or: [
              { doctorId: new ObjectId(doctorId) },
              { doctor_id: new ObjectId(doctorId) }
            ]
          },
          {
            date: {
              $gte: startOfDay,
              $lt: endOfDay
            }
          },
          {
            status: { $in: ["confirmed", "pending"] } // Don't show cancelled appointments as booked
          }
        ]
      })
      .toArray()

    console.log(`Found ${bookedAppointments.length} booked appointments:`, bookedAppointments)

    // Extract booked time slots
    const bookedSlots = bookedAppointments.map(appointment => {
      // Handle both possible time field formats
      const time = appointment.sessionStartTime || appointment.time || "00:00"
      const appointmentDate = new Date(appointment.date).toISOString().split('T')[0]
      return `${appointmentDate}_${time}`
    })

    console.log("Booked slots formatted:", bookedSlots)

    return NextResponse.json({
      bookedSlots,
      appointmentCount: bookedAppointments.length,
      appointments: bookedAppointments
    })
  } catch (error) {
    console.error("Error fetching booked slots:", error)
    return NextResponse.json({ error: "Failed to fetch booked slots" }, { status: 500 })
  }
}