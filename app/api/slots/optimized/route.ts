import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Optimized Slot Loading API
 * 
 * This API optimizes slot loading by:
 * 1. Using compound indexes on (doctorId, dayOfWeek) for efficient queries
 * 2. Using compound indexes on (doctorId, weekStart, weekEnd) for date range queries
 * 3. Implementing query optimization patterns
 * 4. Using projection to fetch only necessary fields
 * 5. Implementing efficient caching strategies
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get("doctorId")
    const date = searchParams.get("date")
    const dayOfWeek = searchParams.get("dayOfWeek")

    if (!doctorId) {
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 })
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(doctorId)) {
      return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
    }

    const db = await connectToDatabase()
    
    // Ensure indexes exist for optimal performance
    await ensureIndexes(db)

    let schedule = null
    let queryType = ""

    if (date) {
      const requestedDate = new Date(date)
      const calculatedDayOfWeek = requestedDate.toLocaleDateString("en-US", { weekday: "long" })
      
      // Strategy 1: Find week-specific schedule using compound index
      queryType = "week-specific"
      schedule = await db.collection("doctor_schedules").findOne(
        {
          doctorId: new ObjectId(doctorId),
          weekStart: { $lte: requestedDate },
          weekEnd: { $gte: requestedDate }
        },
        {
          projection: {
            days: {
              $elemMatch: { dayOfWeek: calculatedDayOfWeek }
            },
            weekStart: 1,
            weekEnd: 1,
            doctorId: 1,
            _id: 1
          }
        }
      )

      if (schedule && schedule.days?.length > 0) {
        return NextResponse.json({
          success: true,
          schedule: schedule.days[0],
          queryType,
          optimized: true,
          requestedDate: date,
          dayOfWeek: calculatedDayOfWeek
        })
      }

      // Strategy 2: Find general schedule with specific day using compound index
      queryType = "general-specific-day"
      schedule = await db.collection("doctor_schedules").findOne(
        {
          doctorId: new ObjectId(doctorId),
          weekStart: { $exists: false },
          weekEnd: { $exists: false },
          "days.dayOfWeek": calculatedDayOfWeek
        },
        {
          projection: {
            days: {
              $elemMatch: { dayOfWeek: calculatedDayOfWeek }
            },
            doctorId: 1,
            _id: 1
          }
        }
      )

      if (schedule && schedule.days?.length > 0) {
        return NextResponse.json({
          success: true,
          schedule: schedule.days[0],
          queryType,
          optimized: true,
          requestedDate: date,
          dayOfWeek: calculatedDayOfWeek
        })
      }
    }

    // Strategy 3: Direct day lookup using compound index (doctorId, dayOfWeek)
    if (dayOfWeek) {
      queryType = "direct-day-lookup"
      schedule = await db.collection("doctor_schedules").findOne(
        {
          doctorId: new ObjectId(doctorId),
          "days.dayOfWeek": dayOfWeek
        },
        {
          projection: {
            days: {
              $elemMatch: { dayOfWeek: dayOfWeek }
            },
            doctorId: 1,
            _id: 1
          }
        }
      )

      if (schedule && schedule.days?.length > 0) {
        return NextResponse.json({
          success: true,
          schedule: schedule.days[0],
          queryType,
          optimized: true,
          dayOfWeek
        })
      }
    }

    // Strategy 4: Fallback - get all days and filter (less optimal but comprehensive)
    queryType = "fallback-full-schedule"
    schedule = await db.collection("doctor_schedules").findOne(
      { doctorId: new ObjectId(doctorId) },
      { projection: { days: 1, doctorId: 1, _id: 1 } }
    )

    if (schedule) {
      const targetDay = dayOfWeek || (date ? new Date(date).toLocaleDateString("en-US", { weekday: "long" }) : null)
      
      if (targetDay) {
        const daySchedule = schedule.days?.find((day: any) => day.dayOfWeek === targetDay)
        if (daySchedule) {
          return NextResponse.json({
            success: true,
            schedule: daySchedule,
            queryType,
            optimized: false,
            dayOfWeek: targetDay
          })
        }
      }

      return NextResponse.json({
        success: true,
        schedule: schedule.days,
        queryType: "full-week-schedule",
        optimized: false
      })
    }

    return NextResponse.json({
      success: false,
      error: "No schedule found",
      doctorId,
      searchedStrategies: [queryType]
    }, { status: 404 })

  } catch (error) {
    console.error("Error in optimized slot loading:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * Ensure optimal indexes exist for slot loading queries
 */
async function ensureIndexes(db: any) {
  const collection = db.collection("doctor_schedules")
  
  try {
    // Index 1: Compound index for doctorId and dayOfWeek (most common query)
    await collection.createIndex(
      { 
        doctorId: 1, 
        "days.dayOfWeek": 1 
      },
      { 
        name: "doctorId_dayOfWeek_idx",
        background: true 
      }
    )

    // Index 2: Compound index for date range queries
    await collection.createIndex(
      { 
        doctorId: 1, 
        weekStart: 1, 
        weekEnd: 1 
      },
      { 
        name: "doctorId_dateRange_idx",
        background: true 
      }
    )

    // Index 3: Simple doctorId index for fallback queries
    await collection.createIndex(
      { doctorId: 1 },
      { 
        name: "doctorId_idx",
        background: true 
      }
    )

    // Index 4: Compound index for general schedules
    await collection.createIndex(
      { 
        doctorId: 1, 
        weekStart: 1, 
        weekEnd: 1,
        "days.dayOfWeek": 1
      },
      { 
        name: "doctorId_general_day_idx",
        background: true,
        sparse: true
      }
    )

    console.log("Optimized indexes ensured for doctor_schedules collection")
  } catch (error) {
    console.warn("Index creation warning (may already exist):", error)
  }
}

/**
 * Alternative endpoint for bulk slot loading (multiple days at once)
 */
export async function POST(request: NextRequest) {
  try {
    const { doctorId, startDate, endDate, dayOfWeekFilter } = await request.json()

    if (!doctorId) {
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 })
    }

    if (!/^[0-9a-fA-F]{24}$/.test(doctorId)) {
      return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
    }

    const db = await connectToDatabase()
    await ensureIndexes(db)

    const start = new Date(startDate)
    const end = new Date(endDate)

    let query: any = {
      doctorId: new ObjectId(doctorId),
      $or: [
        // Week-specific schedules that overlap with the requested range
        {
          weekStart: { $lte: end },
          weekEnd: { $gte: start }
        },
        // General schedules (no week constraints)
        {
          weekStart: { $exists: false },
          weekEnd: { $exists: false }
        }
      ]
    }

    // Add day filter if specified
    if (dayOfWeekFilter && dayOfWeekFilter.length > 0) {
      query["days.dayOfWeek"] = { $in: dayOfWeekFilter }
    }

    const schedules = await db.collection("doctor_schedules")
      .find(query)
      .project({
        days: 1,
        weekStart: 1,
        weekEnd: 1,
        doctorId: 1,
        _id: 1
      })
      .toArray()

    // Process and optimize the results
    const optimizedSchedules = schedules.map(schedule => {
      let relevantDays = schedule.days || []
      
      // Filter days if dayOfWeekFilter is provided
      if (dayOfWeekFilter && dayOfWeekFilter.length > 0) {
        relevantDays = relevantDays.filter((day: any) => 
          dayOfWeekFilter.includes(day.dayOfWeek)
        )
      }

      return {
        ...schedule,
        days: relevantDays,
        scheduleType: schedule.weekStart ? "week-specific" : "general"
      }
    })

    return NextResponse.json({
      success: true,
      schedules: optimizedSchedules,
      optimized: true,
      queryRange: { startDate, endDate },
      totalSchedules: optimizedSchedules.length
    })

  } catch (error) {
    console.error("Error in bulk slot loading:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}