import { MongoClient } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

const client = new MongoClient("mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/")

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    await client.connect()
    const db = client.db("clin")

    // Find the patient by email
    const patient = await db.collection("Patients").findOne({ email })

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    // Check if already verified
    if (patient.otp?.verified) {
      return NextResponse.json({ error: "Account is already verified" }, { status: 400 })
    }

    // Generate new OTP
    const newOtpCode = generateOTP()
    const newOtpExpiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now

    // Update patient with new OTP
    const result = await db.collection("Patients").updateOne(
      { _id: patient._id },
      { 
        $set: { 
          "otp.code": newOtpCode,
          "otp.expiresAt": newOtpExpiresAt,
          "otp.verified": false,
          "updatedAt": new Date()
        }
      }
    )

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Failed to generate new OTP" }, { status: 500 })
    }

    console.log(`New OTP generated for ${email}: ${newOtpCode} (expires at ${newOtpExpiresAt})`)

    return NextResponse.json({
      success: true,
      message: "New OTP sent successfully. Please check your email/phone."
    })
  } catch (error) {
    console.error("Resend OTP error:", error)
    return NextResponse.json({ error: "Failed to resend OTP" }, { status: 500 })
  } finally {
    await client.close()
  }
}