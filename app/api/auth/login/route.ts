import bcrypt from "bcryptjs"
import { MongoClient } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

const client = new MongoClient("mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/")

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    await client.connect()
    const db = client.db("clin")
    
    // Check Patients collection for patient authentication
    const patient = await db.collection("Patients").findOne({ email })

    if (!patient) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if account is verified
    if (!patient.otp?.verified) {
      return NextResponse.json({ 
        error: "Account not verified", 
        requiresVerification: true,
        email: patient.email 
      }, { status: 403 })
    }

    // Verify password if passwordHash exists
    if (!patient.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, patient.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    console.log(`Patient logged in: ${email}`)

    // Return patient without sensitive data
    const { passwordHash: _, ...patientWithoutPassword } = patient
    return NextResponse.json(patientWithoutPassword)
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  } finally {
    await client.close()
  }
}
