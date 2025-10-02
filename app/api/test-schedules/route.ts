import { connectToDatabase } from "@/lib/mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const db = await connectToDatabase()
    
    console.log("Testing doctor_schedules collection access...")
    
    // Get all schedules to test collection access
    const schedules = await db.collection("doctor_schedules").find({}).toArray()
    
    console.log(`Found ${schedules.length} schedules in doctor_schedules collection`)
    console.log("Schedules:", schedules)
    
    // Get collection count
    const collectionCount = await db.collection("doctor_schedules").countDocuments()
    
    return NextResponse.json({
      success: true,
      totalSchedules: schedules.length,
      schedules: schedules,
      collectionStats: {
        count: collectionCount,
        documentsFound: schedules.length
      }
    })
  } catch (error) {
    console.error("Error testing doctor_schedules collection:", error)
    return NextResponse.json({ 
      error: "Failed to access doctor_schedules collection",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}