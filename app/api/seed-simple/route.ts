import { MongoClient, ObjectId } from "mongodb"
import { NextResponse } from "next/server"

const client = new MongoClient("mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/")

export async function POST() {
  try {
    await client.connect()
    const db = client.db("clin")
    
    // First, let's try to insert one simple doctor to test
    const testDoctor = {
      _id: new ObjectId(),
      name: "Dr. Test Doctor",
      email: "test@example.com",
      phone: "+923001234567",
      role: "doctor",
      doctor_fee: "500",
      Discount: "10",
      passwordHash: "$2a$10$testhashherefortesting",
      photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
      specialty: "General Physician",
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Clear existing doctors first
    await db.collection("users").deleteMany({ role: "doctor" })
    
    // Insert one doctor at a time to identify validation issues
    const result = await db.collection("users").insertOne(testDoctor)
    
    return NextResponse.json({
      success: true,
      message: "Test doctor inserted successfully!",
      insertedId: result.insertedId,
      doctor: testDoctor
    })
    
  } catch (error) {
    console.error("Error in simple seed:", error)
    return NextResponse.json({ 
      error: "Failed to insert test doctor",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  } finally {
    await client.close()
  }
}
