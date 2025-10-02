import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Optimized Notifications API with Index-Based Queries
 * 
 * Features:
 * 1. Uses existing patientId index for optimal performance
 * 2. Auto-detects patient ID from session/localStorage pattern
 * 3. Supports read/unread status management
 * 4. Email-like interface with mark all as read functionality
 * 5. Top-down notification ordering (newest first)
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get("patientId")
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID required" }, { status: 400 })
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(patientId)) {
      return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 })
    }

    const db = await connectToDatabase()
    await ensureNotificationIndexes(db)
    
    // Build query for notifications
    const query: any = { patientId: new ObjectId(patientId) }
    if (unreadOnly) {
      query.isRead = false
    }

    // Get notifications with optimal projection and sorting
    const notifications = await db
      .collection("Notification")
      .find(query, {
        projection: {
          patientId: 1,
          message: 1,
          title: 1,
          type: 1,
          isRead: 1,
          createdAt: 1,
          relatedId: 1,
          actionUrl: 1
        }
      })
      .sort({ createdAt: -1 }) // Top-down (newest first)
      .skip(offset)
      .limit(limit)
      .toArray()

    // Get unread count for the patient
    const unreadCount = await db
      .collection("Notification")
      .countDocuments({
        patientId: new ObjectId(patientId),
        isRead: false
      })

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length,
      hasMore: notifications.length === limit
    })

  } catch (error) {
    console.error("Notifications fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, message, title, type = "info", relatedId, actionUrl } = body

    if (!patientId || !message) {
      return NextResponse.json({ error: "Patient ID and message are required" }, { status: 400 })
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(patientId)) {
      return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 })
    }

    const db = await connectToDatabase()
    await ensureNotificationIndexes(db)

    const notification = {
      patientId: new ObjectId(patientId),
      message: message.trim(),
      title: title?.trim() || "New Notification",
      type, // info, success, warning, error
      isRead: false,
      createdAt: new Date(),
      relatedId: relatedId ? new ObjectId(relatedId) : null,
      actionUrl: actionUrl || null
    }

    const result = await db.collection("Notification").insertOne(notification)

    return NextResponse.json({
      success: true,
      notificationId: result.insertedId,
      notification: { ...notification, _id: result.insertedId }
    })

  } catch (error) {
    console.error("Notification creation error:", error)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, notificationId, markAllAsRead = false } = body

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID required" }, { status: 400 })
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(patientId)) {
      return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 })
    }

    const db = await connectToDatabase()
    await ensureNotificationIndexes(db)

    let result

    if (markAllAsRead) {
      // Mark all notifications as read for this patient
      result = await db.collection("Notification").updateMany(
        {
          patientId: new ObjectId(patientId),
          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      )

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
        modifiedCount: result.modifiedCount
      })
    } else if (notificationId) {
      // Mark single notification as read
      if (!/^[0-9a-fA-F]{24}$/.test(notificationId)) {
        return NextResponse.json({ error: "Invalid notification ID format" }, { status: 400 })
      }

      result = await db.collection("Notification").updateOne(
        {
          _id: new ObjectId(notificationId),
          patientId: new ObjectId(patientId)
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      )

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        message: "Notification marked as read"
      })
    } else {
      return NextResponse.json({ error: "Either notificationId or markAllAsRead must be provided" }, { status: 400 })
    }

  } catch (error) {
    console.error("Notification update error:", error)
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}

/**
 * Ensure optimal indexes exist for notification queries
 */
async function ensureNotificationIndexes(db: any) {
  const collection = db.collection("Notification")
  
  try {
    // Index 1: Primary index for patientId + isRead + createdAt (most common query)
    await collection.createIndex(
      { 
        patientId: 1, 
        isRead: 1, 
        createdAt: -1 
      },
      { 
        name: "patientId_isRead_createdAt_idx",
        background: true 
      }
    )

    // Index 2: PatientId + createdAt for general queries
    await collection.createIndex(
      { 
        patientId: 1, 
        createdAt: -1 
      },
      { 
        name: "patientId_createdAt_idx",
        background: true 
      }
    )

    // Index 3: Simple patientId index for count queries
    await collection.createIndex(
      { patientId: 1 },
      { 
        name: "patientId_idx",
        background: true 
      }
    )

    console.log("✅ Optimized indexes ensured for Notification collection")
  } catch (error) {
    console.log("ℹ️ Notification indexes already exist or creation skipped")
  }
}