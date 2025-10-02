import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

// Generate random 6-digit appointment key
function generateAppointmentKey(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

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
    
    // Get appointment requests for specific patient
    const appointmentRequests = await db
      .collection("_appointment")
      .find({ patientId: new ObjectId(patientId) })
      .sort({ createdAt: -1 })
      .toArray()

    console.log(`Found ${appointmentRequests.length} appointment requests for patient ${patientId}`)
    
    return NextResponse.json(appointmentRequests)
  } catch (error) {
    console.error("Error fetching appointment requests:", error)
    return NextResponse.json({ error: "Failed to fetch appointment requests" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { doctorId, patientId, date, time, doctorName, patientName, doctorAddress, autoConfirm = false } = await request.json()

    if (!doctorId || !patientId || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Check if slot is already booked in appointments collection
    const existingAppointment = await db.collection("appointments").findOne({
      doctorId: new ObjectId(doctorId),
      date,
      time,
      status: { $in: ["confirmed", "pending"] },
    })

    if (existingAppointment) {
      return NextResponse.json({ error: "Time slot already booked" }, { status: 400 })
    }

    // Check if there's already a pending request for this slot
    const existingRequest = await db.collection("_appointment").findOne({
      doctorId: new ObjectId(doctorId),
      date,
      time,
      status: "pending",
    })

    if (existingRequest) {
      return NextResponse.json({ error: "Appointment request already exists for this slot" }, { status: 400 })
    }

    // Generate appointment key
    const appointmentKey = generateAppointmentKey()

    // Get patient information if not provided
    let finalPatientName = patientName
    if (!finalPatientName) {
      const patient = await db.collection("patients").findOne({ _id: new ObjectId(patientId) })
      finalPatientName = patient?.name || "Unknown Patient"
    }

    if (autoConfirm) {
      // Create appointment directly in appointments collection with pending status
      const appointment = {
        _id: new ObjectId(),
        appointmentKey,
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
      
      console.log(`Created pending appointment in appointments collection:`)
      console.log(`- Appointment Key: ${appointmentKey}`)
      console.log(`- Doctor ID: ${doctorId} (${doctorName})`)
      console.log(`- Patient ID: ${patientId} (${finalPatientName})`)
      console.log(`- Session Time: ${time} on ${date}`)
      console.log(`- Status: pending (auto-saved)`)

      return NextResponse.json({
        success: true,
        appointment,
        isConfirmed: false, // Changed to false since it's pending
        message: `Appointment saved as pending. Your appointment key is: ${appointmentKey}`
      })
    } else {
      // Create new appointment request in _appointment collection
      const appointmentRequest = {
        _id: new ObjectId(),
        appointmentKey,
        doctorId: new ObjectId(doctorId),
        patientId: new ObjectId(patientId),
        date,
        time,
        sessionStartTime: time,
        status: "pending",
        doctorName: doctorName || "Unknown Doctor",
        patientName: finalPatientName,
        Adrees: doctorAddress || "", // Doctor's address field (as specified)
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.collection("_appointment").insertOne(appointmentRequest)
      console.log(`Created new appointment request with key ${appointmentKey} for patient ${patientId} with doctor ${doctorId}`)

      return NextResponse.json({
        success: true,
        appointmentRequest,
        isConfirmed: false,
        message: `Appointment request created successfully. Your appointment key is: ${appointmentKey}`
      })
    }
  } catch (error) {
    console.error("Error creating appointment request:", error)
    return NextResponse.json({ error: "Failed to create appointment request" }, { status: 500 })
  }
}