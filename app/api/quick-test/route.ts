import { connectToDatabase } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== Quick Doctors Test ===")
    const db = await connectToDatabase()
    
    // Test connection
    const collections = await db.listCollections().toArray()
    console.log("Available collections:", collections.map(c => c.name))
    
    // Quick count
    const doctorCount = await db.collection("doctors").countDocuments()
    console.log(`Total doctors: ${doctorCount}`)
    
    // Fast sample query
    const startTime = Date.now()
    const sampleDoctors = await db.collection("doctors")
      .find({})
      .limit(3)
      .toArray()
    const queryTime = Date.now() - startTime
    
    console.log(`Sample query: ${queryTime}ms for ${sampleDoctors.length} doctors`)
    
    return NextResponse.json({
      success: true,
      collections: collections.map(c => c.name),
      doctorCount,
      queryTime: `${queryTime}ms`,
      sampleDoctors: sampleDoctors.map(d => ({
        _id: d._id,
        name: d.name,
        email: d.email,
        specialty: d.specialty || d.specialization
      }))
    })
  } catch (error) {
    console.error("Quick test error:", error)
    return NextResponse.json({ 
      error: "Failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}