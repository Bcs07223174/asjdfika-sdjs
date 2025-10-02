import { connectToDatabase } from "@/lib/mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const db = await connectToDatabase()
    
    console.log("Fetching all patients from Patients collection...")
    
    // Fetch all patients from the Patients collection
    const patients = await db
      .collection("Patients")
      .find({})
      .toArray()

    console.log(`Found ${patients.length} patients in Patients collection`)
    console.log("Patients data:", patients)
    
    return NextResponse.json(patients)
  } catch (error) {
    console.error("Error fetching patients:", error)
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 })
  }
}