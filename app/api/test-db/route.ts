import { MongoClient } from "mongodb"
import { NextResponse } from "next/server"

const client = new MongoClient("mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/")

export async function GET() {
  try {
    await client.connect()
    const db = client.db("clin")
    
    console.log("=== Database Connection Test ===")
    
    // Test basic operations
    const collections = await db.listCollections().toArray()
    console.log("Available collections:", collections.map(c => c.name))
    
    // Test appointments collection
    const appointmentsCount = await db.collection("appointments").countDocuments()
    const sampleAppointments = await db.collection("appointments").find().limit(3).toArray()
    console.log(`Appointments collection: ${appointmentsCount} documents`)
    console.log("Sample appointments:", sampleAppointments)
    
    // Test patients collection
    const patientsCount = await db.collection("Patients").countDocuments()
    const samplePatients = await db.collection("Patients").find().limit(3).toArray()
    console.log(`Patients collection: ${patientsCount} documents`)
    console.log("Sample patients:", samplePatients)
    
    // Test doctors collection
    const doctorsCount = await db.collection("doctors").countDocuments()
    const sampleDoctors = await db.collection("doctors").find().limit(3).toArray()
    console.log(`Doctors collection: ${doctorsCount} documents`)
    console.log("Sample doctors:", sampleDoctors)
    
    // Test schedules collection
    const schedulesCount = await db.collection("doctor_schedules").countDocuments()
    const sampleSchedules = await db.collection("doctor_schedules").find().limit(2).toArray()
    console.log(`Doctor_schedules collection: ${schedulesCount} documents`)
    console.log("Sample schedules:", sampleSchedules)
    
    return NextResponse.json({
      success: true,
      connectionStatus: "Connected successfully",
      collections: collections.map(c => c.name),
      data: {
        appointments: appointmentsCount,
        patients: patientsCount,
        doctors: doctorsCount,
        schedules: schedulesCount
      },
      samples: {
        appointments: sampleAppointments,
        patients: samplePatients,
        doctors: sampleDoctors,
        schedules: sampleSchedules
      }
    })
  } catch (error) {
    console.error("Database test error:", error)
    return NextResponse.json({ 
      error: "Database connection failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  } finally {
    await client.close()
  }
}
