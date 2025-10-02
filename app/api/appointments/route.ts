import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get("patientId")

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID required" }, { status: 400 })
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(patientId)) {
      console.log(`Invalid ObjectId format: ${patientId}`)
      return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 })
    }

    const db = await connectToDatabase()
    
    // Search using both possible field names in your database
    const appointments = await db
      .collection("appointments")
      .find({ 
        $or: [
          { patientId: new ObjectId(patientId) },
          { patient_id: new ObjectId(patientId) }
        ]
      })
      .sort({ date: 1, sessionStartTime: 1 })
      .toArray()

    console.log(`Found ${appointments.length} appointments for patient ${patientId}`)
    if (appointments.length > 0) {
      console.log("Appointments data:", appointments)
    }
    
    return NextResponse.json(appointments)
  } catch (error) {
    console.error("Error fetching appointments:", error)
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { appointmentId, status, patientId } = await request.json()

    if (!appointmentId || !status || !patientId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Only allow patients to cancel appointments
    if (status !== "cancelled") {
      return NextResponse.json({ error: "Patients can only cancel appointments" }, { status: 403 })
    }

    // Validate ObjectId formats
    if (!/^[0-9a-fA-F]{24}$/.test(appointmentId) || !/^[0-9a-fA-F]{24}$/.test(patientId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Find the appointment and verify it belongs to the patient
    const appointment = await db.collection("appointments").findOne({
      _id: new ObjectId(appointmentId),
      patientId: new ObjectId(patientId)
    })

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found or unauthorized" }, { status: 404 })
    }

    // Check if appointment is already cancelled
    if (appointment.status === "cancelled") {
      return NextResponse.json({ error: "Appointment is already cancelled" }, { status: 400 })
    }

    // Update appointment status to cancelled
    const result = await db.collection("appointments").updateOne(
      { _id: new ObjectId(appointmentId) },
      { 
        $set: { 
          status: "cancelled",
          updatedAt: new Date()
        }
      }
    )

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Failed to cancel appointment" }, { status: 500 })
    }

    console.log(`Appointment ${appointmentId} cancelled by patient ${patientId}`)

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully"
    })
  } catch (error) {
    console.error("Error updating appointment:", error)
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { doctorId, patientId, date, time, doctorName, patientName, doctorAddress, appointmentKey } = await request.json()

    if (!doctorId || !patientId || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Check if slot is already booked
    const existingAppointment = await db.collection("appointments").findOne({
      doctorId: new ObjectId(doctorId),
      date,
      time,
      status: { $in: ["confirmed", "pending"] },
    })

    if (existingAppointment) {
      return NextResponse.json({ error: "Time slot already booked" }, { status: 400 })
    }

    // Generate appointment key if not provided
    const finalAppointmentKey = appointmentKey || Math.floor(100000 + Math.random() * 900000).toString()

    // Get patient information if patientName not provided
    let finalPatientName = patientName
    if (!finalPatientName) {
      const patient = await db.collection("patients").findOne({ _id: new ObjectId(patientId) })
      finalPatientName = patient?.name || "Unknown Patient"
    }

    // Create comprehensive appointment document
    const appointment = {
      _id: new ObjectId(),
      appointmentKey: finalAppointmentKey,
      doctorId: new ObjectId(doctorId),
      patientId: new ObjectId(patientId),
      date: date,
      time: time,
      sessionStartTime: time, // Store session time for compatibility
      status: "pending", // Auto-save as pending status
      doctorName: doctorName || "Unknown Doctor",
      patientName: finalPatientName,
      Adrees: doctorAddress || "", // Doctor's address field (as specified)
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.collection("appointments").insertOne(appointment)
    
    console.log(`Created new appointment in appointments collection:`)
    console.log(`- Appointment Key: ${finalAppointmentKey}`)
    console.log(`- Doctor ID: ${doctorId} (${doctorName})`)
    console.log(`- Patient ID: ${patientId} (${finalPatientName})`)
    console.log(`- Session Time: ${time} on ${date}`)
    console.log(`- Status: pending (auto-saved)`)

    return NextResponse.json({
      success: true,
      appointment,
      message: `Appointment saved as pending. Your appointment key is: ${finalAppointmentKey}`
    })
  } catch (error) {
    console.error("Error creating appointment:", error)
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 })
  }
}
