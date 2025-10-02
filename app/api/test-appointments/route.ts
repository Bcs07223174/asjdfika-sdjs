import { connectToDatabase } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const db = await connectToDatabase()
    
    console.log("=== Appointments Collection Test ===")
    
    // Get appointments count and sample data
    const appointmentsCount = await db.collection("appointments").countDocuments()
    const sampleAppointments = await db.collection("appointments")
      .find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray()
    
    console.log(`Total appointments: ${appointmentsCount}`)
    console.log("Sample appointments:", sampleAppointments)
    
    // Check what fields are being saved
    const fieldsSample = sampleAppointments.map(apt => ({
      appointmentKey: apt.appointmentKey,
      doctorId: apt.doctorId,
      patientId: apt.patientId,
      doctorName: apt.doctorName,
      patientName: apt.patientName,
      date: apt.date,
      time: apt.time,
      sessionStartTime: apt.sessionStartTime,
      status: apt.status,
      createdAt: apt.createdAt,
      fields: Object.keys(apt)
    }))
    
    return NextResponse.json({
      success: true,
      appointmentsCount,
      sampleAppointments: fieldsSample,
      message: `Found ${appointmentsCount} appointments in collection`
    })
  } catch (error) {
    console.error("Appointments test error:", error)
    return NextResponse.json({ 
      error: "Test failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}