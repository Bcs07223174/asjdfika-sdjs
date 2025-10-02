import bcrypt from "bcryptjs"
import { MongoClient, ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

const client = new MongoClient("mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/")

// Generate 6-digit OTP
function generateOTP(): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  console.log(`Generated OTP: ${otp} (length: ${otp.length})`) // Debug log
  return otp
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, role = "patient" } = await request.json()

    await client.connect()
    const db = client.db("clin")

    // Check if patient already exists in Patients collection
    const existingPatient = await db.collection("Patients").findOne({ email })

    if (existingPatient) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Generate OTP for verification
    const otpCode = generateOTP()
    const otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now

    // Create patient document structure for Patients collection with all required fields
    const patientData = {
      _id: new ObjectId(),
      name,
      email,
      phone,
      passwordHash,
      role: "patient",
      photoUrl: "",
      linked_doctor_ids: [], // Required field for Patients collection schema
      otp: {
        code: otpCode,
        expiresAt: otpExpiresAt,
        verified: false
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to Patients collection
    const insertResult = await db.collection("Patients").insertOne(patientData)
    
    if (!insertResult.insertedId) {
      console.error("Failed to insert patient data")
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
    }

    console.log(`New patient registered: ${email} - saved to Patients collection with ID: ${insertResult.insertedId}`)
    console.log(`OTP generated for ${email}: ${otpCode} (expires at ${otpExpiresAt})`)

    // Return patient data without password and OTP (for security)
    const { passwordHash: _, otp: __, ...patientWithoutSensitiveData } = patientData
    const responseData = {
      ...patientWithoutSensitiveData,
      requiresVerification: true,
      message: `Account created successfully. Please check your email/phone for OTP verification code.`
    }
    
    console.log("Signup response sending:", { ...responseData, _id: "hidden" }) // Log response structure
    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("Signup error:", error)
    console.error("Error details:", error.errInfo?.details)
    
    // Handle MongoDB validation errors
    if (error.code === 121) {
      console.error("Validation schema details:", error.errInfo?.details)
      return NextResponse.json({ error: "Invalid data format. Please check all required fields." }, { status: 422 })
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Signup failed" }, { status: 500 })
  } finally {
    await client.close()
  }
}
