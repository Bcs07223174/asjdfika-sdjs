import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const db = await connectToDatabase()
    
    console.log("=== Testing Auto-Save Pending Appointment ===")
    
    // Test data
    const testAppointment = {
      _id: new ObjectId(),
      appointmentKey: "TEST123",
      doctorId: new ObjectId(),
      patientId: new ObjectId(),
      date: "2025-09-18",
      time: "10:00",
      sessionStartTime: "10:00",
      status: "pending",
      doctorName: "Dr. Test Doctor",
      patientName: "Test Patient",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    // Save test appointment
    await db.collection("appointments").insertOne(testAppointment)
    
    // Verify it was saved
    const savedAppointment = await db.collection("appointments").findOne({
      appointmentKey: "TEST123"
    })
    
    console.log("Test appointment saved:", savedAppointment)
    
    // Clean up test data
    await db.collection("appointments").deleteOne({
      appointmentKey: "TEST123"
    })
    
    return NextResponse.json({
      success: true,
      message: "Auto-save pending test completed successfully",
      testData: {
        appointmentKey: savedAppointment?.appointmentKey,
        status: savedAppointment?.status,
        doctorName: savedAppointment?.doctorName,
        patientName: savedAppointment?.patientName,
        sessionTime: savedAppointment?.time,
        date: savedAppointment?.date
      }
    })
  } catch (error) {
    console.error("Auto-save test error:", error)
    return NextResponse.json({ 
      error: "Test failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}