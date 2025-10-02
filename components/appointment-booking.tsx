"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, CheckCircle, ChevronLeft, ChevronRight, Clock, Key, Loader2, MapPin, Stethoscope } from "lucide-react"
import { useEffect, useState } from "react"

interface Doctor {
  _id: string
  name: string
  email: string
  phone: string
  role: string
  doctor_fee: string
  Discount: string
  photoUrl: string
  address?: string // Added address field
}

interface User {
  _id: string
  name: string
  email: string
  phone: string
}

interface Appointment {
  _id: string
  doctorId: string
  patientId: string
  date: string
  time: string
  status: "confirmed" | "pending" | "cancelled"
  doctorName: string
}

interface TimeSlot {
  time: string
  available: boolean
}

interface AppointmentBookingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctor: Doctor
  user: User
  onAppointmentBooked: (appointment: Appointment) => void
}

export function AppointmentBooking({ open, onOpenChange, doctor, user, onAppointmentBooked }: AppointmentBookingProps) {
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [morningSlots, setMorningSlots] = useState<TimeSlot[]>([])
  const [eveningSlots, setEveningSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [appointmentKey, setAppointmentKey] = useState("")
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [doctorSchedule, setDoctorSchedule] = useState<any>(null)

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setCurrentWeekOffset(0)
      setSelectedDate("")
      setSelectedTime("")
      setMorningSlots([])
      setEveningSlots([])
      setDoctorSchedule(null)
    }
  }, [open])

  useEffect(() => {
    if (open && selectedDate) {
      setIsLoadingSlots(true)
      fetchAvailableSlots()
        .finally(() => setIsLoadingSlots(false))
    }
  }, [open, selectedDate, doctor._id])

  const fetchAvailableSlots = async () => {
    try {
      const response = await fetch(`/api/schedule/${doctor._id}?date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        console.log("Fetched schedule data:", data)
        setDoctorSchedule(data)
        generateTimeSlots(data)
      } else {
        console.error("Failed to fetch schedule:", response.statusText)
        // If schedule fetch fails, clear slots
        setMorningSlots([])
        setEveningSlots([])
      }
    } catch (error) {
      console.error("Error fetching schedule:", error)
      setMorningSlots([])
      setEveningSlots([])
    }
  }

  const generateTimeSlots = (scheduleData: any) => {
    if (!selectedDate) return
    
    const dayOfWeek = new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long" })
    console.log(`Generating slots for ${dayOfWeek} on ${selectedDate}`)
    console.log("Schedule data received:", scheduleData)
    
    // Check if this is a date-range based schedule
    if (scheduleData.currentDateRange) {
      console.log("Using date-range specific schedule:", scheduleData.currentDateRange)
      
      // Use the date range specific schedule if available
      const dateRangeSchedule = scheduleData.currentDateRange
      const daySchedule = dateRangeSchedule.days?.find((day: any) => day.dayOfWeek === dayOfWeek)
      
      if (daySchedule) {
        console.log("Found day schedule in date range:", daySchedule)
        generateSlotsForDay(daySchedule)
        return
      }
    }
    
    // Fall back to standard weekly schedule
    const daySchedule = scheduleData.days?.find((day: any) => day.dayOfWeek === dayOfWeek)
    console.log("Day schedule found:", daySchedule)

    if (!daySchedule || daySchedule.isOffDay) {
      console.log("Day is off or no schedule found")
      setMorningSlots([])
      setEveningSlots([])
      return
    }

    generateSlotsForDay(daySchedule)
  }

  const generateSlotsForDay = (daySchedule: any) => {
    console.log("Processing day schedule:", daySchedule)
    
    // Check if the schedule has pre-calculated slots
    if (daySchedule.morningSlots && Array.isArray(daySchedule.morningSlots)) {
      console.log("Using pre-calculated morning slots:", daySchedule.morningSlots)
      
      const morning = daySchedule.morningSlots.map((time: string) => ({
        time: time,
        available: true // All slots are available since we're not checking bookings
      }))
      
      setMorningSlots(morning)
    } else if (daySchedule.morningStart && daySchedule.morningEnd) {
      // Generate slots from start/end times
      const slotDuration = Number.parseInt(daySchedule.slotduration || "30")
      const morning = generateSlots(daySchedule.morningStart, daySchedule.morningEnd, slotDuration)
      setMorningSlots(morning)
    } else {
      setMorningSlots([])
    }
    
    // Handle evening slots
    if (daySchedule.eveningSlots && Array.isArray(daySchedule.eveningSlots)) {
      console.log("Using pre-calculated evening slots:", daySchedule.eveningSlots)
      
      const evening = daySchedule.eveningSlots.map((time: string) => ({
        time: time,
        available: true // All slots are available since we're not checking bookings
      }))
      
      setEveningSlots(evening)
    } else if (daySchedule.eveningStart && daySchedule.eveningEnd) {
      // Generate slots from start/end times
      const slotDuration = Number.parseInt(daySchedule.slotduration || "30")
      const evening = generateSlots(daySchedule.eveningStart, daySchedule.eveningEnd, slotDuration)
      setEveningSlots(evening)
    } else {
      setEveningSlots([])
    }
    
    // Log after state updates (will show in next render)
    console.log("Morning and evening slots have been updated")
  }

  const generateSlots = (start: string, end: string, duration: number): TimeSlot[] => {
    if (!start || !end) return []
    
    const slots: TimeSlot[] = []
    const startTime = new Date(`2000-01-01T${start}:00`)
    const endTime = new Date(`2000-01-01T${end}:00`)

    console.log(`Generating slots from ${start} to ${end} with ${duration} minute intervals`)

    while (startTime < endTime) {
      const timeString = startTime.toTimeString().slice(0, 5)

      slots.push({
        time: timeString,
        available: true, // All slots are available since we're not checking bookings
      })

      startTime.setMinutes(startTime.getMinutes() + duration)
    }

    console.log(`Generated ${slots.length} slots:`, slots.map(s => s.time))
    return slots
  }

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/appointment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor._id,
          patientId: user._id,
          date: selectedDate,
          time: selectedTime,
          doctorName: doctor.name,
          patientName: user.name,
          doctorAddress: doctor.address || "", // Include doctor's address
          autoConfirm: true, // Auto-confirm to save directly to appointments collection
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Handle both confirmed appointments and pending requests
        const appointmentData = result.appointment || result.appointmentRequest
        
        // Set appointment key and show success dialog
        setAppointmentKey(appointmentData.appointmentKey)
        setShowSuccess(true)
        
        // Notify parent with the appointment data
        onAppointmentBooked(appointmentData)
        
        // Reset form
        setSelectedDate("")
        setSelectedTime("")
        
        console.log("Appointment saved to appointments collection:", {
          appointmentKey: appointmentData.appointmentKey,
          doctorId: doctor._id,
          doctorName: doctor.name,
          patientId: user._id,
          patientName: user.name,
          sessionTime: selectedTime,
          date: selectedDate,
          status: "pending" // Auto-saved as pending
        })
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to book appointment")
      }
    } catch (error) {
      console.error("Booking error:", error)
      alert("Failed to book appointment. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getWeekDays = (weekOffset: number = 0) => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + (weekOffset * 7) + i)
      days.push({
        date: date.toISOString().split("T")[0],
        display: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        isToday: date.toDateString() === new Date().toDateString(),
        isPast: date < new Date(new Date().setHours(0, 0, 0, 0))
      })
    }
    return days
  }

  const goToPreviousWeek = () => {
    setCurrentWeekOffset(currentWeekOffset - 1)
    setSelectedDate("")
    setSelectedTime("")
  }

  const goToNextWeek = () => {
    setCurrentWeekOffset(currentWeekOffset + 1)
    setSelectedDate("")
    setSelectedTime("")
  }

  const getNextSevenDays = () => {
    return getWeekDays(currentWeekOffset)
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    onOpenChange(false)
  }

  // Success Dialog Component
  if (showSuccess) {
    return (
      <Dialog open={true} onOpenChange={handleSuccessClose}>
        <DialogContent className="sm:max-w-md bg-white border border-green-200">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-xl text-green-800">Appointment Request Submitted!</DialogTitle>
                <DialogDescription className="text-green-600">
                  Your appointment request has been successfully submitted
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Appointment Key */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-800">Your Appointment Key</span>
              </div>
              <div className="text-2xl font-mono font-bold text-green-700 tracking-wider">
                {appointmentKey}
              </div>
              <p className="text-sm text-green-600 mt-2">
                Please save this key. You'll need it to track your appointment.
              </p>
            </div>

            {/* Appointment Details */}
            <div className="bg-sky-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sky-800 mb-3">Appointment Details</h4>
              <div className="space-y-2 text-sm text-sky-600">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  <span><strong>Doctor:</strong> {doctor.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span><strong>Time:</strong> {selectedTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Status: PENDING
                  </Badge>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleSuccessClose}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Done
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  navigator.clipboard.writeText(appointmentKey)
                  alert("Appointment key copied to clipboard!")
                }}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                Copy Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-gradient-to-br from-white to-sky-50 border border-sky-200 max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="pb-6 bg-gradient-to-r from-sky-600 to-blue-600 -m-6 mb-6 p-6 rounded-t-lg">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl text-white mb-2 font-bold">
                Book Appointment
              </DialogTitle>
              <DialogDescription className="text-sky-100">
                Schedule your appointment with <span className="font-semibold text-white">{doctor.name}</span>
              </DialogDescription>
              
              {/* Doctor Info */}
              <div className="flex items-center gap-4 mt-4 text-sm text-sky-100">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">{doctor.role || "Doctor"}</span>
                </div>
                {doctor.doctor_fee && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Fee: ${doctor.doctor_fee}</span>
                    {doctor.Discount && (
                      <Badge className="bg-green-100 text-green-700 text-xs px-2 py-1">
                        {doctor.Discount}% OFF
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 px-2">
          {/* Date Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xl flex items-center gap-2 text-gray-800">
                <Calendar className="w-6 h-6 text-sky-600" />
                Select Date
              </h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousWeek}
                  className="p-2 border-sky-300 hover:bg-sky-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-sky-700 min-w-[120px] text-center bg-sky-50 px-3 py-1 rounded-full">
                  {currentWeekOffset === 0 ? "This Week" : 
                   currentWeekOffset === 1 ? "Next Week" :
                   currentWeekOffset > 1 ? `${currentWeekOffset} weeks ahead` :
                   currentWeekOffset === -1 ? "Last Week" :
                   `${Math.abs(currentWeekOffset)} weeks ago`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextWeek}
                  className="p-2 border-sky-300 hover:bg-sky-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-3">
              {getNextSevenDays().map((day) => (
                <Button
                  key={day.date}
                  variant={selectedDate === day.date ? "default" : "outline"}
                  className={`p-4 h-auto flex flex-col transition-all duration-300 rounded-xl ${
                    selectedDate === day.date 
                      ? "bg-gradient-to-br from-sky-600 to-blue-600 text-white shadow-lg transform scale-105" 
                      : day.isPast
                      ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                      : "hover:bg-sky-50 hover:border-sky-400 border-sky-200 text-sky-700 hover:shadow-md"
                  } ${day.isToday ? "border-sky-500 border-2 shadow-md" : ""}`}
                  onClick={() => !day.isPast && setSelectedDate(day.date)}
                  disabled={day.isPast}
                >
                  <span className="text-sm font-bold">{day.display}</span>
                  {day.isToday && <span className="text-xs text-sky-600 font-medium">Today</span>}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div className="space-y-6">
              <h3 className="font-bold text-xl flex items-center gap-2 text-sky-800">
                <Clock className="w-6 h-6 text-sky-600" />
                Select Time
              </h3>

              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-12 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                  <span className="ml-3 text-sky-700 font-medium">Loading available slots...</span>
                </div>
              ) : (
                <>
                  {morningSlots.length > 0 && (
                    <div className="space-y-4 bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-200">
                      <h4 className="text-lg font-bold text-gray-800 flex items-center gap-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full"></div>
                        Morning Sessions
                        <Badge className="bg-orange-100 text-orange-700 text-xs">
                          {morningSlots.length} slots
                        </Badge>
                      </h4>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {morningSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(slot.time)}
                            className={`p-3 transition-all duration-300 rounded-lg font-medium ${
                              selectedTime === slot.time
                              ? "bg-gradient-to-br from-sky-600 to-blue-600 text-white shadow-lg transform scale-105"
                              : "hover:bg-orange-100 hover:border-orange-300 border-orange-200 text-sky-700 hover:shadow-md"
                            }`}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {eveningSlots.length > 0 && (
                    <div className="space-y-4 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-200">
                      <h4 className="text-lg font-bold text-sky-800 flex items-center gap-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full"></div>
                        Evening Sessions
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          {eveningSlots.length} slots
                        </Badge>
                      </h4>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {eveningSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(slot.time)}
                            className={`p-3 transition-all duration-300 rounded-lg font-medium ${
                              selectedTime === slot.time
                              ? "bg-gradient-to-br from-sky-600 to-blue-600 text-white shadow-lg transform scale-105"
                              : "hover:bg-purple-100 hover:border-purple-300 border-purple-200 text-sky-700 hover:shadow-md"
                            }`}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {morningSlots.length === 0 && eveningSlots.length === 0 && !isLoadingSlots && (
                    <div className="text-center py-12 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                      <Clock className="w-16 h-16 text-sky-400 mx-auto mb-4" />
                      <p className="text-sky-700 font-bold text-lg mb-2">No available slots for this date</p>
                      <p className="text-sky-600 mb-4">
                        {doctorSchedule?.isWithinRange === false ? 
                          "This date is outside the doctor's available schedule range" :
                          doctorSchedule ? 
                            "Doctor may be off on this day or all slots are booked" :
                            "Unable to load doctor's schedule"
                        }
                      </p>
                      {doctorSchedule?.message && (
                        <p className="text-sm text-blue-700 bg-blue-100 px-4 py-2 rounded-full inline-block font-medium">
                          {doctorSchedule.message}
                        </p>
                      )}
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-sky-600">Try selecting a different date or</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextWeek}
                          className="text-sky-600 hover:bg-sky-50"
                        >
                          <ChevronRight className="w-4 h-4 mr-1" />
                          Check Next Week
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Booking Summary */}
          {selectedDate && selectedTime && (
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 p-6 rounded-xl border border-sky-200">
              <h4 className="font-bold text-xl text-sky-800 mb-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-sky-600" />
                Appointment Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Stethoscope className="w-5 h-5 text-sky-600" />
                    <span className="text-sky-700"><strong className="text-sky-800">Doctor:</strong> {doctor.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-sky-600" />
                    <span className="text-gray-700"><strong className="text-gray-800">Date:</strong> {new Date(selectedDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-sky-600" />
                    <span className="text-gray-700"><strong className="text-gray-800">Time:</strong> {selectedTime}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-sky-700">${doctor.doctor_fee}</span>
                    {doctor.Discount && (
                      <Badge className="bg-green-100 text-green-700 px-3 py-1">
                        {doctor.Discount}% OFF
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Book Button */}
          <div className="pt-6 border-t border-sky-200">
            <Button
              onClick={handleBookAppointment}
              disabled={!selectedDate || !selectedTime || isLoading}
              className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 h-14 text-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Processing Request...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6 mr-3" />
                  Request Appointment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
