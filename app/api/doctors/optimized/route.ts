import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Ultra-Optimized Doctors API - Speed Focused
 * 
 * Performance targets:
 * - Sub-50ms query execution
 * - Minimal data transfer
 * - Aggressive caching
 * - Smart index usage
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const db = await connectToDatabase()
    
    // Quick index check (non-blocking)
    ensureDoctorIndexes(db).catch(() => {}) // Fire and forget
    
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get("search")
    const doctorId = searchParams.get("id")
    const specialty = searchParams.get("specialty")
    const status = searchParams.get("status") || "active"
    
    // Ultra-fast pagination
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "6") // Small batches for speed
    const skip = (page - 1) * limit
    
    // Minimal projection - only essential fields
    const projection = {
      name: 1,
      doctor_fee: 1,
      Discount: 1,
      address: 1,
      photoUrl: 1,
      specialty: 1,
      specialization: 1,
      status: 1
    }
    
    let filter: any = {}
    let indexHint: any = null
    let queryType = ""
    
    // Lightning-fast query building
    if (doctorId) {
      if (!/^[0-9a-fA-F]{24}$/.test(doctorId)) {
        return NextResponse.json({ error: "Invalid doctor ID" }, { status: 400 })
      }
      filter = { _id: new ObjectId(doctorId), status: { $ne: "inactive" } }
      indexHint = { _id: 1 }
      queryType = "id-lookup"
    } else if (searchQuery) {
      filter = {
        $and: [
          {
            $or: [
              { name: { $regex: searchQuery, $options: "i" } },
              { specialty: { $regex: searchQuery, $options: "i" } },
              { specialization: { $regex: searchQuery, $options: "i" } }
            ]
          },
          { status: { $ne: "inactive" } }
        ]
      }
      indexHint = { name: 1, specialty: 1, status: 1 }
      queryType = "search"
    } else if (specialty) {
      filter = {
        $and: [
          {
            $or: [
              { specialty: { $regex: specialty, $options: "i" } },
              { specialization: { $regex: specialty, $options: "i" } }
            ]
          },
          { status: { $ne: "inactive" } }
        ]
      }
      indexHint = { specialty: 1, status: 1, name: 1 }
      queryType = "specialty"
    } else {
      // Fastest path - general listing
      filter = { status: { $ne: "inactive" } }
      indexHint = { status: 1, name: 1 }
      queryType = "listing"
    }
    
    // Build optimized query
    let queryBuilder = db.collection("doctors")
      .find(filter, { projection })
    
    if (indexHint) {
      queryBuilder = queryBuilder.hint(indexHint)
    }
    
    // Parallel execution for maximum speed
    const doctorsPromise = queryBuilder
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray()
    
    // Fast count (estimated for speed)
    const countPromise = doctorId 
      ? Promise.resolve(1) 
      : db.collection("doctors").estimatedDocumentCount()
    
    const [doctors, totalEstimate] = await Promise.all([doctorsPromise, countPromise])
    
    const executionTime = Date.now() - startTime
    
    // Minimal response payload
    const response = {
      success: true,
      doctors,
      pagination: {
        page,
        limit,
        total: totalEstimate,
        hasNext: doctors.length === limit,
        hasPrev: page > 1
      },
      meta: {
        queryTime: executionTime,
        queryType,
        count: doctors.length
      }
    }
    
    // Aggressive caching
    const etag = `"${Buffer.from(JSON.stringify({ 
      page, limit, queryType, count: doctors.length 
    })).toString('base64').slice(0, 16)}"`
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'ETag': etag,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        'X-Query-Time': `${executionTime}ms`,
        'X-Query-Type': queryType
      }
    })
    
  } catch (error) {
    console.error("Fast doctors API error:", error)
    const executionTime = Date.now() - startTime
    
    return NextResponse.json({ 
      error: "Fetch failed", 
      queryTime: executionTime 
    }, { status: 500 })
  }
}

/**
 * Non-blocking index creation
 */
async function ensureDoctorIndexes(db: any) {
  const collection = db.collection("doctors")
  
  try {
    // Critical indexes for speed
    await Promise.all([
      collection.createIndex({ status: 1, name: 1 }, { background: true, name: "status_name_speed" }),
      collection.createIndex({ name: 1, specialty: 1, status: 1 }, { background: true, name: "name_specialty_speed" }),
      collection.createIndex({ specialty: 1, status: 1, name: 1 }, { background: true, name: "specialty_speed" })
    ])
  } catch (error) {
    // Indexes might exist - continue
  }
}