import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const db = await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get("search")
    const doctorId = searchParams.get("id")
    
    // Pagination parameters
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "6") // Default 6 doctors per page
    const skip = (page - 1) * limit
    
    let filter: any = {} // No need to filter by role since this is the doctors collection
    
    // Priority: ID search takes precedence over general search
    if (doctorId) {
      // Filter out VS Code browser IDs and other non-MongoDB ObjectId formats
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(doctorId)
      const isBrowserId = doctorId.includes("-") || doctorId.length !== 24
      
      if (isValidObjectId && !isBrowserId) {
        try {
          filter._id = new ObjectId(doctorId)
        } catch (error) {
          console.error("Invalid ObjectId format:", doctorId)
          return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
        }
      } else {
        console.log("Ignoring browser/invalid ID:", doctorId)
        // Don't apply any filter for invalid IDs, just proceed with pagination
      }
    }
    // Search by name or other fields only if no valid ID provided
    else if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { specialization: { $regex: searchQuery, $options: "i" } }, // Using specialization instead of specialty
        { email: { $regex: searchQuery, $options: "i" } }
      ]
    }

    console.log("Search filter:", JSON.stringify(filter))
    console.log(`Pagination: page=${page}, limit=${limit}, skip=${skip}`)
    
    // Use Promise.all for faster concurrent operations
    const [totalDoctors, doctors] = await Promise.all([
      // Get total count for pagination info
      db.collection("doctors").countDocuments(filter),
      
      // Get doctors with pagination and optimized projection for faster loading
      db.collection("doctors")
        .find(filter, {
          projection: {
            name: 1,
            email: 1,
            phone: 1,
            doctor_fee: 1,
            Discount: 1,
            discount: 1,
            photoUrl: 1,
            specialty: 1,
            specialization: 1,
            qualification: 1,
            experience_years: 1,
            clinic_name: 1,
            department: 1,
            address: 1, // Include address field
            status: 1
          }
        })
        .sort({ name: 1 }) // Sort alphabetically for consistent pagination
        .skip(skip)
        .limit(limit)
        .toArray()
    ])
    
    console.log(`Found ${doctors.length} doctors from doctors collection (page ${page}/${Math.ceil(totalDoctors / limit)})`)

    // Support both old UI (direct array) and new UI (pagination object)
    const isLegacyRequest = !searchParams.get("page") && !searchParams.get("limit")
    
    if (isLegacyRequest) {
      // Return all doctors as array for legacy UI compatibility
      const allDoctors = await db.collection("doctors")
        .find(filter, {
          projection: {
            name: 1,
            email: 1,
            phone: 1,
            doctor_fee: 1,
            Discount: 1,
            discount: 1,
            photoUrl: 1,
            specialty: 1,
            specialization: 1,
            qualification: 1,
            experience_years: 1,
            clinic_name: 1,
            department: 1,
            address: 1, // Include address field
            status: 1
          }
        })
        .sort({ name: 1 })
        .toArray()
      
      console.log(`Legacy mode: returning ${allDoctors.length} doctors as array`)
      return NextResponse.json(allDoctors)
    }

    // Return paginated response for new UI
    return NextResponse.json({
      doctors,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalDoctors / limit),
        totalDoctors,
        limit,
        hasNextPage: page < Math.ceil(totalDoctors / limit),
        hasPreviousPage: page > 1
      }
    })
  } catch (error) {
    console.error("Error fetching doctors:", error)
    return NextResponse.json({ error: "Failed to fetch doctors" }, { status: 500 })
  }
}
