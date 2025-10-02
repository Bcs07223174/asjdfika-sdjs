import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

/*
 * Enhanced Doctor Schedule API with Date Range Support
 * 
 * This API supports multiple schedule data structures:
 * 1. Weekly schedules with date ranges
 * 2. Week-specific schedules with weekStart/weekEnd dates
 * 3. Pre-calculated slot arrays (morningSlots, eveningSlots)
 * 
 * Expected doctor_schedules document structures:
 * 
 * Structure 1 (Date Range Based):
 * {
 *   doctorId: ObjectId,
 *   days: [...], // Standard weekly schedule
 *   dateRanges: [ // Optional: specific date ranges
 *     { startDate: "2025-09-01", endDate: "2025-09-30", days: [...] }
 *   ]
 * }
 * 
 * Structure 2 (Week Specific with Pre-calculated Slots):
 * {
 *   doctorId: ObjectId,
 *   weekStart: Date,
 *   weekEnd: Date,
 *   days: [
 *     {
 *       dayOfWeek: "Monday",
 *       isOffDay: false,
 *       morningStart: "08:00",
 *       morningEnd: "14:00",
 *       morningSlots: ["08:00", "08:30", ...],
 *       eveningStart: "15:00", 
 *       eveningEnd: "21:00",
 *       eveningSlots: ["15:00", "15:30", ...],
 *       slotduration: "30"
 *     }
 *   ]
 * }
 */

export async function GET(request: NextRequest, { params }: { params: { doctorId: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(params.doctorId)) {
      console.log(`Invalid doctor ObjectId format: ${params.doctorId}`)
      return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
    }

    const db = await connectToDatabase()

    console.log(`Looking for schedule for doctor ${params.doctorId} on date ${date}`)
    console.log(`Doctor ID type: ${typeof params.doctorId}, length: ${params.doctorId.length}`)
    
    // Try to find schedule for the specific doctor
    let schedule = null
    
    if (date) {
      const requestedDate = new Date(date)
      console.log(`Searching for week-specific schedule covering date: ${requestedDate.toISOString()}`)
      
      // First try to find week-specific schedule that includes the requested date
      schedule = await db.collection("doctor_schedules").findOne({
        doctorId: new ObjectId(params.doctorId),
        weekStart: { $lte: requestedDate },
        weekEnd: { $gte: requestedDate }
      })
      
      console.log(`Week-specific schedule query result:`, schedule ? "FOUND" : "NOT FOUND")
      
      if (schedule) {
        console.log(`Found week-specific schedule for doctor ${params.doctorId} covering date ${date}`)
        console.log("Week-specific schedule:", {
          _id: schedule._id,
          weekStart: schedule.weekStart,
          weekEnd: schedule.weekEnd,
          daysCount: schedule.days?.length,
          hasDateSpecificDays: schedule.days?.[0]?.date ? true : false
        })
        
        // If the schedule has date-specific days, find the exact day
        if (schedule.days && schedule.days[0]?.date) {
          console.log("Schedule has date-specific days, finding exact match")
          const requestedDateStr = requestedDate.toISOString().split('T')[0] // YYYY-MM-DD format
          
          // Find the specific day that matches the requested date
          const specificDay = schedule.days.find((day: any) => {
            if (day.date) {
              const dayDateStr = new Date(day.date).toISOString().split('T')[0]
              return dayDateStr === requestedDateStr
            }
            return false
          })
          
          if (specificDay) {
            console.log(`Found exact day match for ${requestedDateStr}:`, specificDay.dayOfWeek)
            
            return NextResponse.json({
              ...schedule,
              selectedDay: specificDay,
              scheduleType: "date-specific",
              isWithinRange: true,
              requestedDate: date,
              dayOfWeek: specificDay.dayOfWeek,
              message: `Using date-specific schedule for ${specificDay.dayOfWeek}, ${requestedDateStr}`
            })
          } else {
            console.log(`No exact day match found for ${requestedDateStr}`)
          }
        }
        
        const dayOfWeek = requestedDate.toLocaleDateString("en-US", { weekday: "long" })
        
        return NextResponse.json({
          ...schedule,
          scheduleType: "week-specific",
          isWithinRange: true,
          requestedDate: date,
          dayOfWeek: dayOfWeek,
          message: `Using week-specific schedule (${schedule.weekStart} to ${schedule.weekEnd})`
        })
      }
    }
    
    // If no week-specific schedule found, try general schedule for doctor
    console.log(`Searching for general schedule for doctor: ${params.doctorId}`)
    schedule = await db.collection("doctor_schedules").findOne({
      doctorId: new ObjectId(params.doctorId),
      weekStart: { $exists: false }, // General schedule without specific week
      weekEnd: { $exists: false }
    })
    
    console.log(`General schedule query result:`, schedule ? "FOUND" : "NOT FOUND")
    
    if (schedule) {
      console.log(`Found general schedule for doctor ${params.doctorId}`)
      console.log("General schedule data:", {
        _id: schedule._id,
        daysCount: schedule.days?.length,
        hasDateRanges: !!schedule.dateRanges
      })
      
      // If date is provided, check if it falls within any date range (for general schedules)
      if (date) {
        const requestedDate = new Date(date)
        const dayOfWeek = requestedDate.toLocaleDateString("en-US", { weekday: "long" })
        
        console.log(`Checking general schedule for ${dayOfWeek} on ${date}`)
        
        // Check if schedule has date ranges
        if (schedule.dateRanges && Array.isArray(schedule.dateRanges)) {
          console.log("Schedule has date ranges:", schedule.dateRanges)
          
          // Find applicable date range
          const applicableRange = schedule.dateRanges.find((range: any) => {
            const startDate = new Date(range.startDate)
            const endDate = new Date(range.endDate)
            return requestedDate >= startDate && requestedDate <= endDate
          })
          
          if (applicableRange) {
            console.log("Found applicable date range:", applicableRange)
            
            // Return schedule with date-specific configuration
            return NextResponse.json({
              ...schedule,
              currentDateRange: applicableRange,
              scheduleType: "date-range-specific",
              isWithinRange: true,
              requestedDate: date,
              dayOfWeek: dayOfWeek
            })
          } else {
            console.log("Requested date is outside all defined date ranges")
            
            // Check if we should return default schedule or no schedule
            if (schedule.allowOutsideRange !== false) {
              // Return standard weekly schedule
              return NextResponse.json({
                ...schedule,
                scheduleType: "general",
                isWithinRange: false,
                requestedDate: date,
                dayOfWeek: dayOfWeek,
                message: "Using default weekly schedule (outside defined date ranges)"
              })
            } else {
              // No schedule available for this date
              return NextResponse.json({
                days: [],
                scheduleType: "none",
                isWithinRange: false,
                requestedDate: date,
                dayOfWeek: dayOfWeek,
                message: "No schedule available for this date"
              })
            }
          }
        } else {
          // No date ranges defined, use standard weekly schedule
          console.log("No date ranges defined, using standard weekly schedule")
          return NextResponse.json({
            ...schedule,
            scheduleType: "general",
            isWithinRange: true,
            requestedDate: date,
            dayOfWeek: dayOfWeek,
            message: "Using standard weekly schedule"
          })
        }
      }
      
      return NextResponse.json({
        ...schedule,
        scheduleType: "general"
      })
    }
    
    // Final fallback: try to find ANY schedule for this doctor (ignore week constraints)
    console.log(`Searching for ANY schedule for doctor: ${params.doctorId}`)
    schedule = await db.collection("doctor_schedules").findOne({
      doctorId: new ObjectId(params.doctorId)
    })
    
    console.log(`Any schedule query result:`, schedule ? "FOUND" : "NOT FOUND")
    
    if (schedule) {
      console.log(`Found ANY schedule for doctor ${params.doctorId}`)
      console.log("Any schedule data:", {
        _id: schedule._id,
        weekStart: schedule.weekStart,
        weekEnd: schedule.weekEnd,
        daysCount: schedule.days?.length
      })
      
      // Return it even if it has week constraints
      return NextResponse.json({
        ...schedule,
        scheduleType: schedule.weekStart ? "week-specific-fallback" : "general-fallback",
        message: schedule.weekStart ? 
          "Using week-specific schedule outside its date range" : 
          "Using general schedule"
      })
    }
    
    if (!schedule) {
      console.log("No schedule found in any collection, returning default schedule")
      // Return default schedule if none found
      return NextResponse.json({
        days: [
          {
            dayOfWeek: "Monday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00",
            eveningStart: "16:00",
            eveningEnd: "21:00",
            slotduration: "30",
          },
          {
            dayOfWeek: "Tuesday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00",
            eveningStart: "16:00",
            eveningEnd: "21:00",
            slotduration: "30",
          },
          {
            dayOfWeek: "Wednesday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00",
            eveningStart: "16:00",
            eveningEnd: "21:00",
            slotduration: "30",
          },
          {
            dayOfWeek: "Thursday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00",
            eveningStart: "16:00",
            eveningEnd: "21:00",
            slotduration: "30",
          },
          {
            dayOfWeek: "Friday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00",
            eveningStart: "16:00",
            eveningEnd: "21:00",
            slotduration: "30",
          },
          {
            dayOfWeek: "Saturday",
            isOffDay: false,
            morningStart: "08:00",
            morningEnd: "11:00",
            eveningStart: "16:00",
            eveningEnd: "21:00",
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
        scheduleType: "default",
        isWithinRange: true,
        requestedDate: date,
        message: "Using default schedule (no doctor schedule found)"
      })
    }

    console.log("No schedule found for doctor:", params.doctorId)
    return NextResponse.json({
      error: "No schedule found for this doctor",
      doctorId: params.doctorId,
      scheduleType: "none"
    }, { status: 404 })
  } catch (error) {
    console.error("Error fetching schedule:", error)
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 })
  }
}
