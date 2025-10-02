import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get("doctorId") || "68c1b0a8290666380fd5fa36" // Default to your doctor ID
    const date = searchParams.get("date") || "2025-09-10" // Default test date
    
    console.log(`Testing schedule fetch for doctor ${doctorId} on ${date}`)
    
    const db = await connectToDatabase()
    
    // Test the exact query that would be used in the schedule API
    const requestedDate = new Date(date)
    
    // Try week-specific schedule first
    const weekSpecificSchedule = await db.collection("doctor_schedules").findOne({
      doctorId: new ObjectId(doctorId),
      weekStart: { $lte: requestedDate },
      weekEnd: { $gte: requestedDate }
    })
    
    // Try general schedule
    const generalSchedule = await db.collection("doctor_schedules").findOne({
      doctorId: new ObjectId(doctorId),
      weekStart: { $exists: false },
      weekEnd: { $exists: false }
    })
    
    // Try any schedule for this doctor
    const anySchedule = await db.collection("doctor_schedules").findOne({
      doctorId: new ObjectId(doctorId)
    })
    
    const dayOfWeek = requestedDate.toLocaleDateString("en-US", { weekday: "long" })
    
    let result = {
      doctorId,
      requestedDate: date,
      dayOfWeek,
      weekSpecificSchedule: weekSpecificSchedule ? {
        _id: weekSpecificSchedule._id,
        weekStart: weekSpecificSchedule.weekStart,
        weekEnd: weekSpecificSchedule.weekEnd,
        daysCount: weekSpecificSchedule.days?.length || 0,
        hasPreCalculatedSlots: weekSpecificSchedule.days?.[0]?.morningSlots ? true : false
      } : null,
      generalSchedule: generalSchedule ? {
        _id: generalSchedule._id,
        daysCount: generalSchedule.days?.length || 0
      } : null,
      anySchedule: anySchedule ? {
        _id: anySchedule._id,
        weekStart: anySchedule.weekStart || null,
        weekEnd: anySchedule.weekEnd || null,
        daysCount: anySchedule.days?.length || 0
      } : null
    }
    
    // If we found a week-specific schedule, get the day details
    if (weekSpecificSchedule) {
      const daySchedule = weekSpecificSchedule.days?.find((day: any) => day.dayOfWeek === dayOfWeek)
      if (daySchedule) {
        (result as any).dayScheduleFound = {
          dayOfWeek: daySchedule.dayOfWeek,
          isOffDay: daySchedule.isOffDay,
          morningStart: daySchedule.morningStart,
          morningEnd: daySchedule.morningEnd,
          eveningStart: daySchedule.eveningStart,
          eveningEnd: daySchedule.eveningEnd,
          morningSlots: daySchedule.morningSlots?.length || 0,
          eveningSlots: daySchedule.eveningSlots?.length || 0,
          slotDuration: daySchedule.slotduration
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Schedule lookup test completed",
      ...result
    })
  } catch (error) {
    console.error("Error testing schedule lookup:", error)
    return NextResponse.json({ 
      error: "Failed to test schedule lookup",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}