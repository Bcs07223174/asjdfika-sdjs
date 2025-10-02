import { MongoClient } from "mongodb"
import { NextResponse } from "next/server"

const client = new MongoClient("mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/")

export async function GET() {
  try {
    await client.connect()
    const db = client.db("clin")
    
    // Get counts of all collections
    const doctorsCount = await db.collection("users").countDocuments({ role: "doctor" })
    const patientsCount = await db.collection("users").countDocuments({ role: "patient" })
    const appointmentsCount = await db.collection("appointments").countDocuments()
    const schedulesCount = await db.collection("doctor_schedules").countDocuments()
    
    // Get sample doctors
    const doctors = await db.collection("users").find({ role: "doctor" }).limit(3).toArray()
    
    // Get sample patients
    const patients = await db.collection("users").find({ role: "patient" }).limit(3).toArray()
    
    return NextResponse.json({
      status: "Database connection successful",
      collections: {
        doctors: doctorsCount,
        patients: patientsCount,
        appointments: appointmentsCount,
        schedules: schedulesCount
      },
      sampleData: {
        doctors: doctors.map(d => ({ name: d.name, email: d.email, specialty: d.specialty })),
        patients: patients.map(p => ({ name: p.name, email: p.email }))
      }
    })
    
  } catch (error) {
    console.error("Database test error:", error)
    return NextResponse.json({ error: "Database connection failed", details: error.message }, { status: 500 })
  } finally {
    await client.close()
  }
}
