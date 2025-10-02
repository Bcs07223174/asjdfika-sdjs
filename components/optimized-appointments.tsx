"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Filter, RefreshCw, Search, Stethoscope, User, Zap } from "lucide-react"
import { useEffect, useState } from "react"

interface OptimizedAppointment {
  _id: string
  appointmentKey: string
  doctorId: string
  patientId: string
  doctorName: string
  patientName: string
  date: string
  time: string
  sessionStartTime: string
  status: "confirmed" | "pending" | "cancelled" | "completed" | "rejected"
  Adrees?: string
  createdAt: string
  updatedAt: string
}

interface QueryMeta {
  queryType: string
  executionTime: number
  resultCount: number
  indexUsed: string
}

interface OptimizedAppointmentsProps {
  patientId?: string
  doctorId?: string
  defaultFilter?: {
    status?: string
    date?: string
    time?: string
  }
}

export function OptimizedAppointments({ 
  patientId, 
  doctorId, 
  defaultFilter = {} 
}: OptimizedAppointmentsProps) {
  const [appointments, setAppointments] = useState<OptimizedAppointment[]>([])
  const [loading, setLoading] = useState(false)
  const [queryMeta, setQueryMeta] = useState<QueryMeta | null>(null)
  const [filters, setFilters] = useState({
    status: defaultFilter.status || "",
    date: defaultFilter.date || "",
    time: defaultFilter.time || ""
  })

  const fetchOptimizedAppointments = async () => {
    if (!patientId && !doctorId) {
      console.warn("Either patientId or doctorId is required")
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (patientId) params.append("patientId", patientId)
      if (doctorId) params.append("doctorId", doctorId)
      if (filters.status) params.append("status", filters.status)
      if (filters.date) params.append("date", filters.date)
      if (filters.time) params.append("time", filters.time)

      const startTime = Date.now()
      const response = await fetch(`/api/appointments/optimized?${params}`)
      const clientTime = Date.now() - startTime
      
      if (!response.ok) {
        throw new Error("Failed to fetch appointments")
      }

      const data = await response.json()
      
      if (data.success) {
        setAppointments(data.appointments)
        setQueryMeta({
          ...data.meta,
          clientTime
        })
        console.log(`✅ Optimized appointments loaded:`, {
          count: data.appointments.length,
          queryType: data.meta.queryType,
          serverTime: data.meta.executionTime,
          clientTime,
          indexUsed: data.meta.indexUsed
        })
      } else {
        throw new Error(data.error || "Failed to fetch appointments")
      }
    } catch (error) {
      console.error("Error fetching optimized appointments:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch appointments when component mounts or filters change
  useEffect(() => {
    fetchOptimizedAppointments()
  }, [patientId, doctorId, filters.status, filters.date, filters.time])

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "rejected":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return "✅"
      case "pending":
        return "⏳"
      case "cancelled":
        return "❌"
      case "completed":
        return "✅"
      case "rejected":
        return "🚫"
      default:
        return "❓"
    }
  }

  const clearFilters = () => {
    setFilters({
      status: "",
      date: "",
      time: ""
    })
  }

  const hasFilters = filters.status || filters.date || filters.time

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      {queryMeta && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Optimized Query Performance</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-green-700">
              <div>
                <span className="font-medium">Query Type:</span>
                <div>{queryMeta.queryType}</div>
              </div>
              <div>
                <span className="font-medium">Server Time:</span>
                <div>{queryMeta.executionTime}ms</div>
              </div>
              <div>
                <span className="font-medium">Results:</span>
                <div>{queryMeta.resultCount} appointments</div>
              </div>
              <div>
                <span className="font-medium">Index Used:</span>
                <div>{queryMeta.indexUsed}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Appointment Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-filter">Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="time-filter">Time</Label>
              <Input
                id="time-filter"
                type="time"
                value={filters.time}
                onChange={(e) => setFilters(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button 
                onClick={fetchOptimizedAppointments} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? "Loading..." : "Search"}
              </Button>
              
              {hasFilters && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {patientId ? "My Appointments" : "Doctor Appointments"}
            <span className="text-sm font-normal text-gray-500">
              ({appointments.length} {appointments.length === 1 ? "appointment" : "appointments"})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading optimized appointments...</span>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No appointments found with the current filters.</p>
              {hasFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters to see all appointments
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <Card key={appointment._id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusBadgeColor(appointment.status)}>
                            {getStatusIcon(appointment.status)} {appointment.status.toUpperCase()}
                          </Badge>
                          
                          {appointment.appointmentKey && (
                            <span className="text-xs text-gray-500 font-mono">
                              Key: {appointment.appointmentKey}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Stethoscope className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Doctor:</span>
                              <span>{appointment.doctorName || "Unknown Doctor"}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-green-600" />
                              <span className="font-medium">Patient:</span>
                              <span>{appointment.patientName || "Unknown Patient"}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-purple-600" />
                              <span className="font-medium">Date:</span>
                              <span>{appointment.date}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-orange-600" />
                              <span className="font-medium">Time:</span>
                              <span>{appointment.time || appointment.sessionStartTime}</span>
                            </div>
                          </div>
                        </div>

                        {appointment.Adrees && (
                          <div className="text-xs text-gray-600 mt-2">
                            <span className="font-medium">Address:</span> {appointment.Adrees}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default OptimizedAppointments