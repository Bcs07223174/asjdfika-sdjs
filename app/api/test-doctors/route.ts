import { connectToDatabase } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const db = await connectToDatabase()
    
    console.log("=== Doctors Collection Test ===")
    
    // Get collection info
    const collections = await db.listCollections().toArray()
    const doctorCollections = collections.filter(c => 
      c.name.toLowerCase().includes('doctor') || c.name.toLowerCase().includes('user')
    )
    
    console.log("Available collections:", collections.map(c => c.name))
    console.log("Doctor-related collections:", doctorCollections.map(c => c.name))
    
    // Test different collection names
    const testResults: Record<string, any> = {}
    
    for (const collectionName of ['doctors', 'Doctors', 'users', 'Users']) {
      try {
        const count = await db.collection(collectionName).countDocuments()
        const sample = await db.collection(collectionName).findOne()
        testResults[collectionName] = {
          count,
          sample: sample ? {
            _id: sample._id,
            name: sample.name,
            email: sample.email,
            role: sample.role,
            fields: Object.keys(sample)
          } : null
        }
        console.log(`${collectionName} collection: ${count} documents`)
      } catch (error: any) {
        testResults[collectionName] = { error: error.message }
      }
    }
    
    // Test fast query performance
    const startTime = Date.now()
    const fastQuery = await db.collection("doctors")
      .find({}, {
        projection: {
          name: 1,
          email: 1,
          phone: 1,
          doctor_fee: 1,
          specialty: 1,
          specialization: 1
        }
      })
      .limit(6)
      .toArray()
    const queryTime = Date.now() - startTime
    
    console.log(`Fast query completed in ${queryTime}ms`)
    
    return NextResponse.json({
      success: true,
      collections: collections.map(c => c.name),
      doctorCollections: doctorCollections.map(c => c.name),
      testResults,
      fastQuery: {
        count: fastQuery.length,
        queryTime: `${queryTime}ms`,
        sample: fastQuery[0] || null
      }
    })
  } catch (error) {
    console.error("Doctors test error:", error)
    return NextResponse.json({ 
      error: "Test failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}