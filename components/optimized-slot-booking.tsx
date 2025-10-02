'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, User, Zap } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface TimeSlot {
  time: string
  available: boolean
}

interface OptimizedSchedule {
  dayOfWeek: string
  isOffDay: boolean
  morningStart?: string
  morningEnd?: string
  eveningStart?: string
  eveningEnd?: string
  morningSlots?: string[]
  eveningSlots?: string[]
  slotduration: string
}

interface OptimizedSlotBookingProps {
  doctorId: string
  selectedDate: string
  onSlotSelect?: (slot: string) => void
}

/**
 * Optimized Slot Booking Component
 * 
 * Features:
 * - Uses optimized API endpoints with compound indexes
 * - Implements intelligent caching with React useMemo
 * - Efficient re-rendering with useCallback
 * - Pre-calculated slots for better performance
 * - Smart error handling and fallbacks
 */
export function OptimizedSlotBooking({ doctorId, selectedDate, onSlotSelect }: OptimizedSlotBookingProps) {
  const [schedule, setSchedule] = useState<OptimizedSchedule | null>(null)
  const [morningSlots, setMorningSlots] = useState<TimeSlot[]>([])
  const [eveningSlots, setEveningSlots] = useState<TimeSlot[]>([])
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optimizationMetrics, setOptimizationMetrics] = useState<any>(null)

  // Memoize dayOfWeek calculation to avoid unnecessary recalculations
  const dayOfWeek = useMemo(() => {
    return new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long" })
  }, [selectedDate])

  // Optimized slot fetching with caching
  const fetchOptimizedSchedule = useCallback(async () => {
    if (!doctorId || !selectedDate) return

    setLoading(true)
    setError(null)

    try {
      // Use the optimized slot loading API
      const response = await fetch(
        `/api/slots/optimized?doctorId=${doctorId}&date=${selectedDate}&dayOfWeek=${dayOfWeek}`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'public, max-age=300', // 5-minute cache
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.schedule) {
        setSchedule(data.schedule)
        setOptimizationMetrics({
          queryType: data.queryType,
          optimized: data.optimized,
          optimizationUsed: data.optimizationUsed
        })
        
        // Process slots efficiently
        await processScheduleSlots(data.schedule)
      } else {
        setError(data.error || "No schedule available")
      }
    } catch (err) {
      console.error("Error fetching optimized schedule:", err)
      setError(err instanceof Error ? err.message : "Failed to load schedule")
    } finally {
      setLoading(false)
    }
  }, [doctorId, selectedDate, dayOfWeek])

  // Fetch booked slots separately for better performance
  const fetchBookedSlots = useCallback(async () => {
    if (!doctorId || !selectedDate) return

    try {
      const response = await fetch(
        `/api/appointments/booked-slots?doctorId=${doctorId}&date=${selectedDate}`
      )

      if (response.ok) {
        const data = await response.json()
        setBookedSlots(new Set(data.bookedSlots || []))
      }
    } catch (err) {
      console.warn("Could not fetch booked slots:", err)
    }
  }, [doctorId, selectedDate])

  // Process schedule slots with optimization
  const processScheduleSlots = useCallback(async (scheduleData: OptimizedSchedule) => {
    if (!scheduleData || scheduleData.isOffDay) {
      setMorningSlots([])
      setEveningSlots([])
      return
    }

    // Use pre-calculated slots if available (most optimized)
    if (scheduleData.morningSlots && Array.isArray(scheduleData.morningSlots)) {
      const morning = scheduleData.morningSlots.map(time => ({
        time,
        available: true // Will be updated with booked slots
      }))
      setMorningSlots(morning)
    } else if (scheduleData.morningStart && scheduleData.morningEnd) {
      // Generate slots only if pre-calculated ones aren't available
      const duration = parseInt(scheduleData.slotduration || "30")
      const morning = generateTimeSlots(scheduleData.morningStart, scheduleData.morningEnd, duration)
      setMorningSlots(morning)
    } else {
      setMorningSlots([])
    }

    // Same for evening slots
    if (scheduleData.eveningSlots && Array.isArray(scheduleData.eveningSlots)) {
      const evening = scheduleData.eveningSlots.map(time => ({
        time,
        available: true
      }))
      setEveningSlots(evening)
    } else if (scheduleData.eveningStart && scheduleData.eveningEnd) {
      const duration = parseInt(scheduleData.slotduration || "30")
      const evening = generateTimeSlots(scheduleData.eveningStart, scheduleData.eveningEnd, duration)
      setEveningSlots(evening)
    } else {
      setEveningSlots([])
    }
  }, [])

  // Generate slots efficiently (fallback for when pre-calculated slots aren't available)
  const generateTimeSlots = useCallback((start: string, end: string, duration: number): TimeSlot[] => {
    if (!start || !end) return []
    
    const slots: TimeSlot[] = []
    const startTime = new Date(`2000-01-01T${start}:00`)
    const endTime = new Date(`2000-01-01T${end}:00`)
    
    let current = new Date(startTime)
    
    while (current < endTime) {
      slots.push({
        time: current.toTimeString().slice(0, 5),
        available: true
      })
      current.setMinutes(current.getMinutes() + duration)
    }
    
    return slots
  }, [])

  // Update slot availability based on booked slots
  const updateSlotAvailability = useCallback((slots: TimeSlot[]) => {
    return slots.map(slot => ({
      ...slot,
      available: !bookedSlots.has(slot.time)
    }))
  }, [bookedSlots])

  // Apply booked slots to morning and evening slots
  const optimizedMorningSlots = useMemo(() => 
    updateSlotAvailability(morningSlots), 
    [morningSlots, updateSlotAvailability]
  )

  const optimizedEveningSlots = useMemo(() => 
    updateSlotAvailability(eveningSlots), 
    [eveningSlots, updateSlotAvailability]
  )

  // Handle slot selection
  const handleSlotSelect = useCallback((slot: string) => {
    onSlotSelect?.(slot)
  }, [onSlotSelect])

  // Load data on component mount and when dependencies change
  useEffect(() => {
    Promise.all([
      fetchOptimizedSchedule(),
      fetchBookedSlots()
    ])
  }, [fetchOptimizedSchedule, fetchBookedSlots])

  // Render slot button with optimization
  const renderSlotButton = useCallback((slot: TimeSlot, period: 'morning' | 'evening') => (
    <Button
      key={`${period}-${slot.time}`}
      variant={slot.available ? "outline" : "secondary"}
      size="sm"
      disabled={!slot.available}
      onClick={() => handleSlotSelect(slot.time)}
      className={`
        ${slot.available 
          ? "hover:bg-sky-50 hover:border-sky-300 text-sky-700" 
          : "opacity-50 cursor-not-allowed text-gray-400"
        }
      `}
    >
      <Clock className="w-3 h-3 mr-1" />
      {slot.time}
    </Button>
  ), [handleSlotSelect])

  if (loading) {
    return (
      <Card className="border-sky-200">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600"></div>
            <span className="text-sky-600">Loading optimized slots...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="text-red-600">
            <h3 className="font-semibold">Error Loading Slots</h3>
            <p className="text-sm mt-1">{error}</p>
            <Button 
              onClick={fetchOptimizedSchedule} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!schedule || schedule.isOffDay) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-6 text-center">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h3 className="font-semibold text-gray-600">No Slots Available</h3>
          <p className="text-sm text-gray-500 mt-1">
            {schedule?.isOffDay ? "Doctor is off on this day" : "No schedule found for this date"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Optimization Metrics (Development Only) */}
      {process.env.NODE_ENV === 'development' && optimizationMetrics && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center text-green-700">
              <Zap className="w-4 h-4 mr-2" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                Query: {optimizationMetrics.queryType}
              </Badge>
              <Badge variant={optimizationMetrics.optimized ? "default" : "secondary"} className="text-xs">
                {optimizationMetrics.optimized ? "Optimized" : "Fallback"}
              </Badge>
              {optimizationMetrics.optimizationUsed && (
                <Badge variant="outline" className="text-xs">
                  {optimizationMetrics.optimizationUsed}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Slots */}
      <Card className="border-sky-200">
        <CardHeader>
          <CardTitle className="text-sky-700 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Available Slots - {dayOfWeek}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Morning Slots */}
          {optimizedMorningSlots.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                <div className="w-3 h-3 bg-amber-400 rounded-full mr-2"></div>
                Morning ({schedule.morningStart} - {schedule.morningEnd})
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {optimizedMorningSlots.map(slot => renderSlotButton(slot, 'morning'))}
              </div>
            </div>
          )}

          {/* Evening Slots */}
          {optimizedEveningSlots.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                Evening ({schedule.eveningStart} - {schedule.eveningEnd})
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {optimizedEveningSlots.map(slot => renderSlotButton(slot, 'evening'))}
              </div>
            </div>
          )}

          {/* No Slots Available */}
          {optimizedMorningSlots.length === 0 && optimizedEveningSlots.length === 0 && (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No time slots available for this day</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}