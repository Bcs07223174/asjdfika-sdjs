"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { DoctorCard } from "./doctor-card"

interface Doctor {
  _id: string
  name: string
  email: string
  phone: string
  role?: string
  doctor_fee: string | number
  Discount?: string | number
  discount?: string | number
  photoUrl: string
  specialty?: string
  specialization?: string
  qualification?: string
  experience_years?: number
  clinic_name?: string
  department?: string
  status?: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalDoctors: number
  limit: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface DoctorsResponse {
  doctors: Doctor[]
  pagination: PaginationInfo
}

interface DoctorsListProps {
  onBookAppointment: (doctor: Doctor) => void
}

export function DoctorsList({ onBookAppointment }: DoctorsListProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const fetchDoctors = useCallback(async (page: number = 1, search: string = "") => {
    try {
      setLoading(page === 1)
      setSearchLoading(search !== "")
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "6",
        ...(search && { search })
      })

      const response = await fetch(`/api/doctors?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: DoctorsResponse = await response.json()
      
      setDoctors(data.doctors || [])
      setPagination(data.pagination)
      setCurrentPage(page)
      
    } catch (error) {
      console.error("Error fetching doctors:", error)
      setDoctors([])
      setPagination(null)
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchDoctors(1, searchTerm)
  }, [fetchDoctors, searchTerm])

  // Search handler with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1)
      }
      fetchDoctors(1, searchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, fetchDoctors])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      fetchDoctors(newPage, searchTerm)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search doctors by name, specialty..."
          value={searchTerm}
          onChange={handleSearch}
          className="pl-10 pr-4 py-2 border-sky-200 focus:border-sky-400"
        />
        {searchLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
        )}
      </div>

      {/* Results Info */}
      {pagination && !loading && (
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.totalDoctors)} of {pagination.totalDoctors} doctors
        </div>
      )}

      {/* Doctor Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <DoctorCard
                key={`skeleton-${index}`}
                doctor={{} as Doctor}
                onBookAppointment={() => {}}
                loading={true}
              />
            ))
          : doctors.map((doctor) => (
              <DoctorCard
                key={doctor._id}
                doctor={doctor}
                onBookAppointment={() => onBookAppointment(doctor)}
              />
            ))
        }
      </div>

      {/* No Results */}
      {!loading && doctors.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            {searchTerm ? (
              <>
                <p className="text-lg font-medium">No doctors found</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">No doctors available</p>
                <p className="text-sm">Please check back later</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && !loading && (
        <div className="flex items-center justify-between pt-6">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
              className="border-sky-200 hover:bg-sky-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className={currentPage === pageNum 
                      ? "bg-sky-500 hover:bg-sky-600" 
                      : "border-sky-200 hover:bg-sky-50"
                    }
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="border-sky-200 hover:bg-sky-50"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="text-sm text-gray-500">
            Page {currentPage} of {pagination.totalPages}
          </div>
        </div>
      )}

      {/* Load More Button (Alternative pagination style) */}
      {pagination && pagination.hasNextPage && !loading && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            className="border-sky-200 hover:bg-sky-50"
          >
            <Loader2 className="w-4 h-4 mr-2 animate-spin" style={{ display: 'none' }} />
            Load More Doctors
          </Button>
        </div>
      )}
    </div>
  )
}

// Loading component for the entire list
export function DoctorsListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 max-w-md" />
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <DoctorCard
            key={`skeleton-${index}`}
            doctor={{} as Doctor}
            onBookAppointment={() => {}}
            loading={true}
          />
        ))}
      </div>
    </div>
  )
}