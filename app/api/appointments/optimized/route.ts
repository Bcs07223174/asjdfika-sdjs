import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Optimized Appointments API with Index-Based Queries
 * 
 * Key optimizations:
 * 1. Uses compound indexes: (doctorId, date, time, status) and (patientId, date, status)
 * 2. Implements query hints to force index usage
 * 3. Uses projection to fetch only necessary fields
 * 4. Optimizes common query patterns for appointment checking
 * 5. Includes performance monitoring
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get("patientId")
    const doctorId = searchParams.get("doctorId")
    const date = searchParams.get("date")
    const status = searchParams.get("status")
    const time = searchParams.get("time")

    const db = await connectToDatabase()
    
    // Ensure optimized indexes exist
    await ensureAppointmentIndexes(db)

    let query: any = {}
    let indexHint: any = null
    let queryType = ""

    if (patientId) {
      // Validate ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(patientId)) {
        return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 })
      }

      query.patientId = new ObjectId(patientId)
      
      if (date) {
        query.date = date
        if (status) {
          query.status = status
          indexHint = { patientId: 1, date: 1, status: 1 }
          queryType = "patient-date-status"
        } else {
          indexHint = { patientId: 1, date: 1 }
          queryType = "patient-date"
        }
      } else if (status) {
        query.status = status
        indexHint = { patientId: 1, status: 1 }
        queryType = "patient-status"
      } else {
        indexHint = { patientId: 1 }
        queryType = "patient-only"
      }
    } else if (doctorId) {
      // Validate ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(doctorId)) {
        return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
      }

      query.doctorId = new ObjectId(doctorId)
      
      if (date && time && status) {
        query.date = date
        query.time = time
        query.status = { $in: Array.isArray(status) ? status : [status] }
        indexHint = { doctorId: 1, date: 1, time: 1, status: 1 }
        queryType = "doctor-date-time-status"
      } else if (date && time) {
        query.date = date
        query.time = time
        indexHint = { doctorId: 1, date: 1, time: 1 }
        queryType = "doctor-date-time"
      } else if (date) {
        query.date = date
        if (status) {
          query.status = { $in: Array.isArray(status) ? status : [status] }
          indexHint = { doctorId: 1, date: 1, status: 1 }
          queryType = "doctor-date-status"
        } else {
          indexHint = { doctorId: 1, date: 1 }
          queryType = "doctor-date"
        }
      } else if (status) {
        query.status = { $in: Array.isArray(status) ? status : [status] }
        indexHint = { doctorId: 1, status: 1 }
        queryType = "doctor-status"
      } else {
        indexHint = { doctorId: 1 }
        queryType = "doctor-only"
      }
    } else {
      return NextResponse.json({ error: "Either patientId or doctorId is required" }, { status: 400 })
    }

    const startTime = Date.now()
    
    // Build optimized query with projection
    let queryBuilder = db.collection("appointments").find(query, {
      projection: {
        _id: 1,
        appointmentKey: 1,
        doctorId: 1,
        patientId: 1,
        doctorName: 1,
        patientName: 1,
        date: 1,
        time: 1,
        sessionStartTime: 1,
        status: 1,
        Adrees: 1,
        createdAt: 1,
        updatedAt: 1
      }
    })

    // Apply index hint if available
    if (indexHint) {
      queryBuilder = queryBuilder.hint(indexHint)
    }

    // Execute query with optimized sorting
    const appointments = await queryBuilder
      .sort({ date: 1, time: 1, createdAt: -1 })
      .toArray()

    const queryTime = Date.now() - startTime

    console.log(`Optimized appointments query completed:`)
    console.log(`- Query Type: ${queryType}`)
    console.log(`- Execution Time: ${queryTime}ms`)
    console.log(`- Results Count: ${appointments.length}`)
    console.log(`- Index Hint: ${indexHint ? JSON.stringify(indexHint) : 'none'}`)

    return NextResponse.json({
      success: true,
      appointments,
      meta: {
        queryType,
        executionTime: queryTime,
        resultCount: appointments.length,
        indexUsed: indexHint ? Object.keys(indexHint).join('+') : 'default'
      }
    })
  } catch (error) {
    console.error("Error fetching optimized appointments:", error)
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { doctorId, patientId, date, time, doctorName, patientName, doctorAddress, appointmentKey, checkConflict = true } = await request.json()

    if (!doctorId || !patientId || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await connectToDatabase()
    
    // Ensure optimized indexes exist
    await ensureAppointmentIndexes(db)

    if (checkConflict) {
      // Use optimized conflict checking with compound index
      const conflictStartTime = Date.now()
      
      const existingAppointment = await db.collection("appointments")
        .findOne(
          {
            doctorId: new ObjectId(doctorId),
            date,
            time,
            status: { $in: ["confirmed", "pending"] }
          },
          {
            hint: { doctorId: 1, date: 1, time: 1, status: 1 },
            projection: { _id: 1, status: 1 }
          }
        )

      const conflictCheckTime = Date.now() - conflictStartTime

      if (existingAppointment) {
        console.log(`Conflict check completed in ${conflictCheckTime}ms - CONFLICT FOUND`)
        return NextResponse.json({ 
          error: "Time slot already booked",
          conflictWith: existingAppointment._id,
          conflictStatus: existingAppointment.status
        }, { status: 400 })
      }

      console.log(`Conflict check completed in ${conflictCheckTime}ms - NO CONFLICT`)
    }

    // Generate appointment key if not provided
    const finalAppointmentKey = appointmentKey || Math.floor(100000 + Math.random() * 900000).toString()

    // Get patient information if patientName not provided
    let finalPatientName = patientName
    if (!finalPatientName) {
      const patient = await db.collection("patients").findOne(
        { _id: new ObjectId(patientId) },
        { projection: { name: 1 } }
      )
      finalPatientName = patient?.name || "Unknown Patient"
    }

    // Create optimized appointment document
    const appointment = {
      _id: new ObjectId(),
      appointmentKey: finalAppointmentKey,
      doctorId: new ObjectId(doctorId),
      patientId: new ObjectId(patientId),
      date: date,
      time: time,
      sessionStartTime: time,
      status: "pending",
      doctorName: doctorName || "Unknown Doctor",
      patientName: finalPatientName,
      Adrees: doctorAddress || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const insertStartTime = Date.now()
    await db.collection("appointments").insertOne(appointment)
    const insertTime = Date.now() - insertStartTime

    console.log(`Optimized appointment creation completed:`)
    console.log(`- Insert Time: ${insertTime}ms`)
    console.log(`- Appointment Key: ${finalAppointmentKey}`)
    console.log(`- Doctor ID: ${doctorId} (${doctorName})`)
    console.log(`- Patient ID: ${patientId} (${finalPatientName})`)
    console.log(`- Session Time: ${time} on ${date}`)

    return NextResponse.json({
      success: true,
      appointment,
      meta: {
        insertTime,
        conflictCheckEnabled: checkConflict
      },
      message: `Appointment created successfully. Your appointment key is: ${finalAppointmentKey}`
    })
  } catch (error) {
    console.error("Error creating optimized appointment:", error)
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { appointmentId, patientId, status, doctorId, newDate, newTime } = await request.json()

    if (!appointmentId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate ObjectId formats
    if (!/^[0-9a-fA-F]{24}$/.test(appointmentId)) {
      return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 })
    }

    const db = await connectToDatabase()
    
    // Ensure optimized indexes exist
    await ensureAppointmentIndexes(db)

    let findQuery: any = { _id: new ObjectId(appointmentId) }
    let indexHint: any = { _id: 1 }

    // Add additional security filters based on role
    if (patientId) {
      if (!/^[0-9a-fA-F]{24}$/.test(patientId)) {
        return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 })
      }
      findQuery.patientId = new ObjectId(patientId)
      indexHint = { patientId: 1, _id: 1 }
    }

    if (doctorId) {
      if (!/^[0-9a-fA-F]{24}$/.test(doctorId)) {
        return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
      }
      findQuery.doctorId = new ObjectId(doctorId)
      indexHint = { doctorId: 1, _id: 1 }
    }

    const findStartTime = Date.now()
    
    // Find the appointment with optimized query
    const appointment = await db.collection("appointments")
      .findOne(findQuery, { hint: indexHint })

    const findTime = Date.now() - findStartTime

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found or unauthorized" }, { status: 404 })
    }

    // Prepare update operations
    let updateFields: any = {
      status,
      updatedAt: new Date()
    }

    // Handle appointment rescheduling
    if (newDate && newTime) {
      // Check for conflicts if rescheduling
      const conflictStartTime = Date.now()
      
      const existingAppointment = await db.collection("appointments")
        .findOne(
          {
            doctorId: appointment.doctorId,
            date: newDate,
            time: newTime,
            status: { $in: ["confirmed", "pending"] },
            _id: { $ne: new ObjectId(appointmentId) } // Exclude current appointment
          },
          {
            hint: { doctorId: 1, date: 1, time: 1, status: 1 },
            projection: { _id: 1 }
          }
        )

      const conflictCheckTime = Date.now() - conflictStartTime

      if (existingAppointment) {
        console.log(`Reschedule conflict check completed in ${conflictCheckTime}ms - CONFLICT FOUND`)
        return NextResponse.json({ 
          error: "New time slot already booked",
          conflictWith: existingAppointment._id
        }, { status: 400 })
      }

      updateFields.date = newDate
      updateFields.time = newTime
      updateFields.sessionStartTime = newTime

      console.log(`Reschedule conflict check completed in ${conflictCheckTime}ms - NO CONFLICT`)
    }

    const updateStartTime = Date.now()
    
    // Update appointment with optimized query
    const result = await db.collection("appointments").updateOne(
      { _id: new ObjectId(appointmentId) },
      { $set: updateFields }
    )

    const updateTime = Date.now() - updateStartTime

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 })
    }

    console.log(`Optimized appointment update completed:`)
    console.log(`- Find Time: ${findTime}ms`)
    console.log(`- Update Time: ${updateTime}ms`)
    console.log(`- Appointment ID: ${appointmentId}`)
    console.log(`- New Status: ${status}`)

    return NextResponse.json({
      success: true,
      meta: {
        findTime,
        updateTime,
        rescheduled: !!(newDate && newTime)
      },
      message: "Appointment updated successfully"
    })
  } catch (error) {
    console.error("Error updating optimized appointment:", error)
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 })
  }
}

/**
 * Check slot availability with optimized query
 */
export async function HEAD(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get("doctorId")
    const date = searchParams.get("date")
    const time = searchParams.get("time")

    if (!doctorId || !date || !time) {
      return new NextResponse(null, { status: 400 })
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(doctorId)) {
      return new NextResponse(null, { status: 400 })
    }

    const db = await connectToDatabase()
    
    // Ensure optimized indexes exist
    await ensureAppointmentIndexes(db)

    const checkStartTime = Date.now()
    
    // Use optimized slot availability check
    const existingAppointment = await db.collection("appointments")
      .findOne(
        {
          doctorId: new ObjectId(doctorId),
          date,
          time,
          status: { $in: ["confirmed", "pending"] }
        },
        {
          hint: { doctorId: 1, date: 1, time: 1, status: 1 },
          projection: { _id: 1 }
        }
      )

    const checkTime = Date.now() - checkStartTime

    if (existingAppointment) {
      // Slot is unavailable
      return new NextResponse(null, { 
        status: 409,
        headers: {
          'X-Slot-Status': 'unavailable',
          'X-Check-Time': checkTime.toString()
        }
      })
    }

    // Slot is available
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'X-Slot-Status': 'available',
        'X-Check-Time': checkTime.toString()
      }
    })
  } catch (error) {
    console.error("Error checking slot availability:", error)
    return new NextResponse(null, { status: 500 })
  }
}

/**
 * Ensure optimal indexes exist for appointment queries
 */
async function ensureAppointmentIndexes(db: any) {
  const collection = db.collection("appointments")
  
  try {
    // Index 1: Compound index for doctor availability checks (most critical)
    await collection.createIndex(
      { 
        doctorId: 1, 
        date: 1, 
        time: 1, 
        status: 1 
      },
      { 
        name: "doctorId_date_time_status_idx",
        background: true 
      }
    )

    // Index 2: Compound index for patient appointments lookup
    await collection.createIndex(
      { 
        patientId: 1, 
        date: 1, 
        status: 1 
      },
      { 
        name: "patientId_date_status_idx",
        background: true 
      }
    )

    // Index 3: Doctor + date for daily schedules
    await collection.createIndex(
      { 
        doctorId: 1, 
        date: 1, 
        status: 1 
      },
      { 
        name: "doctorId_date_status_idx",
        background: true 
      }
    )

    // Index 4: Patient + status for status-based queries
    await collection.createIndex(
      { 
        patientId: 1, 
        status: 1, 
        date: 1 
      },
      { 
        name: "patientId_status_date_idx",
        background: true 
      }
    )

    // Index 5: Doctor + status for doctor management
    await collection.createIndex(
      { 
        doctorId: 1, 
        status: 1, 
        date: 1 
      },
      { 
        name: "doctorId_status_date_idx",
        background: true 
      }
    )

    // Index 6: Appointment key for quick lookups
    await collection.createIndex(
      { appointmentKey: 1 },
      { 
        name: "appointmentKey_idx",
        background: true,
        unique: true,
        sparse: true
      }
    )

    // Index 7: Created date for sorting and analytics
    await collection.createIndex(
      { createdAt: 1 },
      { 
        name: "createdAt_idx",
        background: true 
      }
    )

    console.log("✅ Optimized indexes ensured for appointments collection")
  } catch (error) {
    // Indexes may already exist
    console.log("ℹ️ Appointment indexes already exist or creation skipped")
  }
}

/**
 * Test index performance for appointments
 */
async function testAppointmentIndexes(db: any) {
  const collection = db.collection("appointments")
  const testDoctorId = "60f1b0a8290666380fd5fa36" // Sample doctor ID
  const testDate = "2025-09-30"
  const testTime = "10:00"
  
  const tests = []
  
  // Test 1: Doctor slot availability check
  const test1Start = Date.now()
  const result1 = await collection.findOne({
    doctorId: new ObjectId(testDoctorId),
    date: testDate,
    time: testTime,
    status: { $in: ["confirmed", "pending"] }
  }, { hint: { doctorId: 1, date: 1, time: 1, status: 1 } })
  const test1Time = Date.now() - test1Start
  
  tests.push({
    testName: "Doctor Slot Availability",
    executionTime: test1Time,
    result: result1 ? "slot_unavailable" : "slot_available"
  })
  
  // Test 2: Patient appointments lookup
  const test2Start = Date.now()
  const result2 = await collection.find({
    patientId: new ObjectId(testDoctorId), // Using as sample patient ID
    status: "confirmed"
  }, { hint: { patientId: 1, status: 1, date: 1 } }).limit(10).toArray()
  const test2Time = Date.now() - test2Start
  
  tests.push({
    testName: "Patient Appointments Lookup", 
    executionTime: test2Time,
    resultCount: result2.length
  })
  
  return tests
}