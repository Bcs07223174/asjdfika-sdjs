import { connectToDatabase } from "@/lib/mongodb"
import { NextResponse } from "next/server"

/**
 * Create Sample Notifications for Testing
 * This endpoint creates sample notifications for testing the notification system
 */

export async function POST() {
  try {
    const db = await connectToDatabase()
    
    // Get a sample patient from the Patients collection
    const samplePatient = await db.collection("Patients").findOne({})
    
    if (!samplePatient) {
      return NextResponse.json({ error: "No patients found to create sample notifications" }, { status: 404 })
    }

    const sampleNotifications = [
      {
        patientId: samplePatient._id,
        title: "Appointment Confirmed",
        message: "Your appointment with Dr. Smith has been confirmed for tomorrow at 10:00 AM.",
        type: "success",
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        relatedId: null,
        actionUrl: "/appointments"
      },
      {
        patientId: samplePatient._id,
        title: "Prescription Ready",
        message: "Your prescription is ready for pickup at the pharmacy.",
        type: "info",
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        relatedId: null,
        actionUrl: null
      },
      {
        patientId: samplePatient._id,
        title: "Test Results Available",
        message: "Your recent lab test results are now available. Please check your patient portal.",
        type: "info",
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        relatedId: null,
        actionUrl: null
      },
      {
        patientId: samplePatient._id,
        title: "Payment Reminder",
        message: "You have an outstanding balance of $45.00. Please make a payment to avoid service interruption.",
        type: "warning",
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        relatedId: null,
        actionUrl: null
      },
      {
        patientId: samplePatient._id,
        title: "Welcome to ClinicCare!",
        message: "Welcome to our patient portal! You can now view your appointments, test results, and communicate with your healthcare team.",
        type: "success",
        isRead: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        relatedId: null,
        actionUrl: null
      }
    ]

    // Insert all sample notifications
    const result = await db.collection("Notification").insertMany(sampleNotifications)

    return NextResponse.json({
      success: true,
      message: `Created ${result.insertedCount} sample notifications`,
      patientId: samplePatient._id,
      patientName: samplePatient.name,
      notifications: sampleNotifications.map((notif, index) => ({
        ...notif,
        _id: Object.values(result.insertedIds)[index]
      }))
    })

  } catch (error) {
    console.error("Sample notifications creation error:", error)
    return NextResponse.json({ error: "Failed to create sample notifications" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Sample Notifications API",
    usage: "POST to create sample notifications for testing",
    note: "This will create notifications for the first patient found in the database"
  })
}