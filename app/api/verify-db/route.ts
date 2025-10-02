import { connectToDatabase } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const db = await connectToDatabase()
    
    // Get all collections
    const collections = await db.listCollections().toArray()
    
    // Get all doctors from the doctors collection
    const doctors = await db.collection("doctors").find({}).toArray()
    
    // Get count of total users
    const totalUsers = await db.collection("users").countDocuments()
    
    // Get sample of all users to see what roles exist
    const allUsers = await db.collection("users").find({}).limit(5).toArray()
    
    return NextResponse.json({
      success: true,
      collections: collections.map(c => c.name),
      stats: {
        totalUsers,
        totalDoctors: doctors.length,
        doctorsFound: doctors.length > 0
      },
      sampleDoctors: doctors.slice(0, 3), // Show first 3 doctors
      allDoctors: doctors, // Show all doctors from doctors collection
      sampleUsers: allUsers.map(u => ({ 
        _id: u._id, 
        name: u.name, 
        role: u.role, 
        email: u.email 
      }))
    })
  } catch (error) {
    console.error("Database verification error:", error)
    return NextResponse.json({ 
      error: "Database verification failed", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
