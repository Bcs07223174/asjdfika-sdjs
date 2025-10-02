"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, MapPin, Star, Zap } from "lucide-react"
import Image from "next/image"
import { memo, useState } from "react"

// Optimized interface with only essential fields for fast loading
interface OptimizedDoctor {
  _id: string
  name: string
  doctor_fee: string | number
  Discount?: string | number
  discount?: string | number // fallback field
  address?: string
  photoUrl: string
  specialty?: string
  specialization?: string // fallback field
  status?: string
}

interface OptimizedDoctorCardProps {
  doctor: OptimizedDoctor
  onBookAppointment: () => void
  loading?: boolean
  showPerformance?: boolean
}

// Optimized and memoized component for maximum performance
export const OptimizedDoctorCard = memo(function OptimizedDoctorCard({ 
  doctor, 
  onBookAppointment, 
  loading = false,
  showPerformance = false
}: OptimizedDoctorCardProps) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  // Fast loading state
  if (loading) {
    return <OptimizedDoctorCardSkeleton />
  }

  // Optimized discount calculation
  const discountValue = doctor.Discount || doctor.discount || 0
  const discountNum = typeof discountValue === 'string' ? 
    Number.parseInt(discountValue) || 0 : discountValue
  
  // Optimized fee calculation
  const feeValue = typeof doctor.doctor_fee === 'string' ? 
    Number.parseInt(doctor.doctor_fee) || 0 : doctor.doctor_fee
  
  const discountedFee = discountNum > 0
    ? feeValue - (feeValue * discountNum) / 100
    : feeValue

  // Optimized specialty handling
  const doctorSpecialty = doctor.specialty || doctor.specialization || "General Physician"

  // Optimized name initials
  const initials = doctor.name
    .split(" ")
    .slice(0, 2) // Take only first 2 words for performance
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border border-sky-200 bg-white hover:border-sky-300 group">
      <CardContent className="p-6">
        {/* Performance indicator */}
        {showPerformance && (
          <div className="flex items-center gap-1 mb-2">
            <Zap className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600 font-medium">Optimized Load</span>
          </div>
        )}

        {/* Doctor Header - Optimized Layout */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <Avatar className="w-16 h-16 border-2 border-sky-200">
              {doctor.photoUrl && !imageError ? (
                <>
                  {imageLoading && (
                    <div className="absolute inset-0 bg-sky-50 animate-pulse rounded-full" />
                  )}
                  <Image
                    src={doctor.photoUrl}
                    alt={doctor.name}
                    width={64}
                    height={64}
                    className="rounded-full object-cover"
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageError(true)
                      setImageLoading(false)
                    }}
                    loading="lazy"
                    sizes="64px"
                  />
                </>
              ) : (
                <AvatarFallback className="bg-sky-100 text-sky-700 text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-sky-800 truncate group-hover:text-sky-900 transition-colors">
              {doctor.name}
            </h3>
            <p className="text-base text-sky-600 truncate">{doctorSpecialty}</p>
            <p className="text-sm text-sky-500 font-mono">ID: {doctor._id.slice(-8)}</p>
            
            {/* Quick rating display */}
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-sky-600">4.8</span>
            </div>
          </div>
        </div>

        {/* Address - Only if available */}
        {doctor.address && (
          <div className="mb-4">
            <div className="flex items-start gap-2 text-sm text-sky-700">
              <MapPin className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
              <span className="truncate" title={doctor.address}>{doctor.address}</span>
            </div>
          </div>
        )}

        {/* Pricing - Optimized Display */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-sky-800">${Math.round(discountedFee)}</span>
            {discountNum > 0 && (
              <>
                <span className="text-sm text-sky-500 line-through">${feeValue}</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 text-xs px-2 py-1">
                  {discountNum}% OFF
                </Badge>
              </>
            )}
          </div>
          <Badge className="bg-sky-100 text-sky-800 px-2 py-1 text-xs">
            Available
          </Badge>
        </div>

        {/* Book Button - Optimized */}
        <Button 
          onClick={onBookAppointment} 
          className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2.5 text-sm font-medium transition-all duration-200 hover:shadow-md"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Book Appointment
        </Button>
      </CardContent>
    </Card>
  )
})

// Optimized loading skeleton
function OptimizedDoctorCardSkeleton() {
  return (
    <Card className="border border-sky-100 bg-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>

        <Skeleton className="w-full h-10" />
      </CardContent>
    </Card>
  )
}

export { OptimizedDoctorCardSkeleton }