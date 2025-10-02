import { connectToDatabase } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const db = await connectToDatabase()
    
    // Get all collections
    const collections = await db.listCollections().toArray()
    console.log("All collections found:", collections.map(c => c.name))
    
    // Get data from all relevant collections
    const doctors = await db.collection("doctors").find({}).toArray()
    const appointments = await db.collection("appointments").find({}).toArray()
    const patients = await db.collection("Patients").find({}).toArray()
    
    // Try different possible schedule collection names
    let schedules: any[] = []
    let scheduleCollectionName = ""
    
    const possibleScheduleNames = ["doctor_schedules", "schedules", "Schedule", "DoctorSchedule", "doctorSchedules"]
    
    for (const name of possibleScheduleNames) {
      try {
        const testSchedules = await db.collection(name).find({}).toArray()
        if (testSchedules.length > 0) {
          schedules = testSchedules
          scheduleCollectionName = name
          console.log(`Found schedules in collection: ${name}`)
          break
        }
      } catch (error) {
        console.log(`Collection ${name} not found or empty`)
      }
    }
    
    // Get counts
    const counts = {
      doctors: doctors.length,
      appointments: appointments.length,
      schedules: schedules.length,
      patients: patients.length
    }
    
    return NextResponse.json({
      success: true,
      collections: collections.map(c => c.name),
      scheduleCollectionFound: scheduleCollectionName || "none",
      counts,
      sampleData: {
        doctors: doctors.slice(0, 2),
        appointments: appointments.slice(0, 3),
        schedules: schedules.slice(0, 2),
        patients: patients.slice(0, 2)
      }
    })
  } catch (error) {
    console.error("Collection verification error:", error)
    return NextResponse.json({ 
      error: "Collection verification failed", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
