import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const db = await connectToDatabase()
    
    console.log("Seeding doctor_schedules collection...")
    
    // Sample doctor schedule data
    const sampleSchedules = [
      {
        _id: new ObjectId(),
        doctorId: new ObjectId("60f1b2b4c2f4a4001f4e8f1a"), // Sample doctor ID
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
      },
      {
        _id: new ObjectId(),
        doctorId: new ObjectId("60f1b2b4c2f4a4001f4e8f1b"), // Another sample doctor ID
        days: [
          {
            dayOfWeek: "Monday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00", 
            eveningStart: "16:00",
            eveningEnd: "20:00",
            slotduration: "45",
          },
          {
            dayOfWeek: "Tuesday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00",
            eveningStart: "16:00",
            eveningEnd: "20:00",
            slotduration: "45",
          },
          {
            dayOfWeek: "Wednesday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00",
            eveningStart: "16:00",
            eveningEnd: "20:00",
            slotduration: "45",
          },
          {
            dayOfWeek: "Thursday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00",
            eveningStart: "16:00",
            eveningEnd: "20:00",
            slotduration: "45",
          },
          {
            dayOfWeek: "Friday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00",
            eveningStart: "16:00",
            eveningEnd: "20:00",
            slotduration: "45",
          },
          {
            dayOfWeek: "Saturday",
            isOffDay: false,
            morningStart: "09:00",
            morningEnd: "12:00",
            eveningStart: null,
            eveningEnd: null,
            slotduration: "45",
          },
          {
            dayOfWeek: "Sunday",
            isOffDay: true,
            morningStart: null,
            morningEnd: null,
            eveningStart: null,
            eveningEnd: null,
            slotduration: "45",
          },
        ],
        dateRanges: [
          {
            startDate: "2025-09-01",
            endDate: "2025-09-30",
            days: [
              {
                dayOfWeek: "Monday",
                isOffDay: false,
                morningStart: "10:00",
                morningEnd: "12:00",
                eveningStart: "15:00",
                eveningEnd: "17:00",
                slotduration: "30",
              },
              // Add other days as needed for this date range
            ]
          }
        ],
        allowOutsideRange: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]
    
    // Insert the sample schedules
    const result = await db.collection("doctor_schedules").insertMany(sampleSchedules)
    
    console.log(`Inserted ${result.insertedCount} schedules`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${result.insertedCount} doctor schedules`,
      insertedIds: result.insertedIds,
      schedules: sampleSchedules.map(s => ({
        _id: s._id,
        doctorId: s.doctorId,
        daysCount: s.days.length,
        hasDateRanges: !!s.dateRanges
      }))
    })
  } catch (error) {
    console.error("Error seeding doctor_schedules:", error)
    return NextResponse.json({ 
      error: "Failed to seed doctor_schedules collection",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}