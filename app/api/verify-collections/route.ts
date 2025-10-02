import { MongoClient } from "mongodb"
import { NextResponse } from "next/server"

const client = new MongoClient("mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/")

export async function GET() {
  try {
    await client.connect()
    const db = client.db("clin")
    
    console.log("=== Collection Verification ===")
    
    // Get all collections
    const collections = await db.listCollections().toArray()
    console.log("All collections:", collections.map(c => c.name))
    
    // Test both patients collection variations
    const patientsLowerCount = await db.collection("patients").countDocuments()
    const patientsUpperCount = await db.collection("Patients").countDocuments()
    
    console.log(`"patients" (lowercase) collection: ${patientsLowerCount} documents`)
    console.log(`"Patients" (uppercase) collection: ${patientsUpperCount} documents`)
    
    // Get sample data from both
    const samplePatientsLower = await db.collection("patients").find().limit(2).toArray()
    const samplePatientsUpper = await db.collection("Patients").find().limit(2).toArray()
    
    console.log("Sample from patients (lowercase):", samplePatientsLower)
    console.log("Sample from Patients (uppercase):", samplePatientsUpper)
    
    return NextResponse.json({
      success: true,
      allCollections: collections.map(c => c.name),
      patientCollections: {
        "patients": {
          count: patientsLowerCount,
          sample: samplePatientsLower
        },
        "Patients": {
          count: patientsUpperCount,
          sample: samplePatientsUpper
        }
      }
    })
  } catch (error) {
    console.error("Collection verification error:", error)
    return NextResponse.json({ 
      error: "Verification failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  } finally {
    await client.close()
  }
}