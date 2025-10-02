"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Mail, MapPin, Phone, Star } from "lucide-react"
import Image from "next/image"
import { memo, useState } from "react"

interface Doctor {
  _id: string
  name: string
  email: string
  phone: string
  role?: string
  doctor_fee: string | number
  Discount?: string | number
  discount?: string | number // Handle both field names
  photoUrl: string
  specialty?: string
  specialization?: string // Handle both field names
  qualification?: string
  experience_years?: number
  clinic_name?: string
  department?: string
  address?: string // Added address field
  status?: string
}

interface DoctorCardProps {
  doctor: Doctor
  onBookAppointment: () => void
  loading?: boolean
}

// Memoized component for better performance but keep original interface
export const DoctorCard = memo(function DoctorCard({ doctor, onBookAppointment }: DoctorCardProps) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  // Handle both Discount and discount field names, and convert to number
  const discountValue = doctor.Discount || doctor.discount || 0
  const discountNum = typeof discountValue === 'string' ? Number.parseInt(discountValue) || 0 : discountValue
  
  // Handle doctor_fee as string or number
  const feeValue = typeof doctor.doctor_fee === 'string' ? Number.parseInt(doctor.doctor_fee) || 0 : doctor.doctor_fee
  
  const discountedFee = discountNum > 0
    ? feeValue - (feeValue * discountNum) / 100
    : feeValue

  // Handle both specialty and specialization field names
  const doctorSpecialty = doctor.specialty || doctor.specialization || "General Physician"

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border border-sky-200 bg-white hover:border-sky-300">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
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
                  />
                </>
              ) : (
                <AvatarFallback className="bg-sky-100 text-sky-700 text-lg font-semibold">
                  {doctor.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-sky-800 truncate">{doctor.name}</h3>
            <p className="text-base text-sky-600 truncate">{doctorSpecialty}</p>
            <p className="text-sm text-sky-500 font-mono">ID: {doctor._id}</p>
            {doctor.qualification && (
              <p className="text-sm text-sky-600 truncate">{doctor.qualification}</p>
            )}
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-sky-600">4.8 (120 reviews)</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2 text-base text-sky-700">
            <Phone className="w-5 h-5 text-sky-500 flex-shrink-0" />
            <span className="truncate">{doctor.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-base text-sky-700">
            <Mail className="w-5 h-5 text-sky-500 flex-shrink-0" />
            <span className="truncate">{doctor.email}</span>
          </div>
          {doctor.address && (
            <div className="flex items-center gap-2 text-base text-sky-700">
              <MapPin className="w-5 h-5 text-sky-500 flex-shrink-0" />
              <span className="truncate" title={doctor.address}>{doctor.address}</span>
            </div>
          )}
        </div>

                <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-sky-800">${Math.round(discountedFee)}</span>
            {discountNum > 0 && (
              <>
                <span className="text-base text-sky-500 line-through">${feeValue}</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  {discountNum}% OFF
                </Badge>
              </>
            )}
          </div>
          <Badge className="bg-sky-100 text-sky-800 px-3 py-1">
            Available Today
          </Badge>
        </div>

        <Button 
          onClick={onBookAppointment} 
          className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 text-base font-medium"
        >
          <Calendar className="w-5 h-5 mr-2" />
          Book Appointment
        </Button>
      </CardContent>
    </Card>
  )
})

// Loading skeleton component
function DoctorCardSkeleton() {
  return (
    <Card className="border border-sky-100 bg-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>

        <Skeleton className="w-full h-10" />
      </CardContent>
    </Card>
  )
}
