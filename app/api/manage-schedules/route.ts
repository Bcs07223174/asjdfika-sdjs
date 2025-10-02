import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const db = await connectToDatabase()
    
    console.log("Fetching real doctors and creating schedules...")
    
    // First, get actual doctors from your doctors collection
    const doctors = await db.collection("doctors").find({}).limit(5).toArray()
    console.log(`Found ${doctors.length} doctors`)
    
    if (doctors.length === 0) {
      return NextResponse.json({ 
        error: "No doctors found in database", 
        suggestion: "Please ensure doctors collection has data"
      }, { status: 404 })
    }
    
    const schedules = []
    
    for (const doctor of doctors) {
      // Check if schedule already exists
      const existingSchedule = await db.collection("doctor_schedules").findOne({
        doctorId: doctor._id
      })
      
      if (!existingSchedule) {
        // Create a default schedule for this doctor
        const newSchedule = {
          _id: new ObjectId(),
          doctorId: doctor._id,
          doctorName: doctor.name, // For reference
          days: [
            {
              dayOfWeek: "Monday",
              isOffDay: false,
              morningStart: "09:00",
              morningEnd: "12:00",
              eveningStart: "14:00",
              eveningEnd: "18:00",
              slotduration: "30",
            },
            {
              dayOfWeek: "Tuesday",
              isOffDay: false,
              morningStart: "09:00",
              morningEnd: "12:00",
              eveningStart: "14:00",
              eveningEnd: "18:00",
              slotduration: "30",
            },
            {
              dayOfWeek: "Wednesday",
              isOffDay: false,
              morningStart: "09:00",
              morningEnd: "12:00",
              eveningStart: "14:00",
              eveningEnd: "18:00",
              slotduration: "30",
            },
            {
              dayOfWeek: "Thursday",
              isOffDay: false,
              morningStart: "09:00",
              morningEnd: "12:00",
              eveningStart: "14:00",
              eveningEnd: "18:00",
              slotduration: "30",
            },
            {
              dayOfWeek: "Friday",
              isOffDay: false,
              morningStart: "09:00",
              morningEnd: "12:00",
              eveningStart: null,
              eveningEnd: null,
              slotduration: "30",
            },
            {
              dayOfWeek: "Saturday",
              isOffDay: false,
              morningStart: "10:00",
              morningEnd: "13:00",
              eveningStart: null,
              eveningEnd: null,
              slotduration: "30",
            },
            {
              dayOfWeek: "Sunday",
              isOffDay: true,
              morningStart: null,
              morningEnd: null,
              eveningStart: null,
              eveningEnd: null,
              slotduration: "30",
            },
          ],
          allowOutsideRange: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        
        // Insert the schedule
        await db.collection("doctor_schedules").insertOne(newSchedule)
        schedules.push(newSchedule)
        
        console.log(`Created schedule for doctor: ${doctor.name} (${doctor._id})`)
      } else {
        schedules.push(existingSchedule)
        console.log(`Schedule already exists for doctor: ${doctor.name} (${doctor._id})`)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${doctors.length} doctors`,
      doctors: doctors.map(d => ({ _id: d._id, name: d.name, email: d.email })),
      schedulesCreated: schedules.length,
      schedules: schedules.map(s => ({
        _id: s._id,
        doctorId: s.doctorId,
        doctorName: s.doctorName || "Unknown",
        daysCount: s.days?.length || 0,
        hasDateRanges: !!(s as any).dateRanges
      }))
    })
  } catch (error) {
    console.error("Error creating real doctor schedules:", error)
    return NextResponse.json({ 
      error: "Failed to create doctor schedules",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { doctorId, scheduleData } = await request.json()
    
    if (!doctorId || !scheduleData) {
      return NextResponse.json({ error: "Doctor ID and schedule data required" }, { status: 400 })
    }
    
    const db = await connectToDatabase()
    
    // Update or create schedule for specific doctor
    const updatedSchedule = {
      doctorId: new ObjectId(doctorId),
      ...scheduleData,
      updatedAt: new Date(),
    }
    
    const result = await db.collection("doctor_schedules").replaceOne(
      { doctorId: new ObjectId(doctorId) },
      updatedSchedule,
      { upsert: true }
    )
    
    return NextResponse.json({
      success: true,
      message: result.upsertedId ? "Schedule created" : "Schedule updated",
      doctorId,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId
    })
  } catch (error) {
    console.error("Error updating doctor schedule:", error)
    return NextResponse.json({ 
      error: "Failed to update doctor schedule",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}