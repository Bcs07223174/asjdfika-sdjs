"use client"

import { AppointmentBooking } from "@/components/appointment-booking"
import { AuthDialog } from "@/components/auth-dialog"
import { DoctorCard } from "@/components/doctor-card"
import { NotificationIcon } from "@/components/notification-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, CheckCircle, Clock, Heart, Menu, Search, Star, X } from "lucide-react"
import Link from "next/link"
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
  specialty?: string
}

interface Patient {
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

export default function PatientPanel() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]) // Store all doctors for local filtering
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchBy, setSearchBy] = useState<"name" | "id" | "specialty">("name")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetchDoctors()
    const savedPatient = localStorage.getItem("patient_user")
    if (savedPatient) {
      const patientData = JSON.parse(savedPatient)
      setPatient(patientData)
      fetchAppointments(patientData._id)
    }
    
    // Check if login is required (redirected from appointments page)
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('login') === 'required') {
      setShowAuthDialog(true)
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const fetchDoctors = async (searchQuery?: string, searchType?: string) => {
    try {
      setLoading(true)
      
      // Use optimized API for better performance
      let url = "/api/doctors/optimized"
      if (searchQuery && searchType) {
        if (searchType === "id") {
          url += `?id=${encodeURIComponent(searchQuery)}`
        } else if (searchType === "specialty") {
          url += `?specialty=${encodeURIComponent(searchQuery)}`
        } else {
          url += `?search=${encodeURIComponent(searchQuery)}`
        }
      }
      
      console.log("🔍 Fetching doctors from:", url)
      
      const response = await fetch(url)
      console.log("📊 API Response:", response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log("📋 API Data:", data)
        
        // Handle both old API format (array) and new optimized API format (object with doctors array)
        const doctorsArray = Array.isArray(data) ? data : (data.doctors || [])
        console.log("👨‍⚕️ Doctors found:", doctorsArray.length)
        
        setDoctors(doctorsArray)
        if (!searchQuery) {
          setAllDoctors(doctorsArray) // Store all doctors when not searching
        }
      } else {
        console.error("❌ API Error:", response.status, response.statusText)
        const errorText = await response.text()
        console.error("❌ Error details:", errorText)
        
        // Fallback to regular API if optimized fails
        console.log("🔄 Trying fallback API...")
        const fallbackResponse = await fetch("/api/doctors")
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          const doctorsArray = Array.isArray(fallbackData) ? fallbackData : (fallbackData.doctors || [])
          console.log("✅ Fallback API success:", doctorsArray.length, "doctors")
          setDoctors(doctorsArray)
          if (!searchQuery) {
            setAllDoctors(doctorsArray)
          }
        } else {
          console.error("❌ Fallback API also failed:", fallbackResponse.status)
        }
      }
    } catch (error) {
      console.error("💥 Fatal error fetching doctors:", error)
      // Try one more fallback
      try {
        console.log("🔄 Final fallback attempt...")
        const response = await fetch("/api/doctors")
        if (response.ok) {
          const data = await response.json()
          const doctorsArray = Array.isArray(data) ? data : (data.doctors || [])
          console.log("✅ Final fallback success:", doctorsArray.length, "doctors")
          setDoctors(doctorsArray)
          if (!searchQuery) {
            setAllDoctors(doctorsArray)
          }
        }
      } catch (finalError) {
        console.error("💀 All fallbacks failed:", finalError)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      fetchDoctors(searchTerm.trim(), searchBy)
    } else {
      setDoctors(allDoctors) // Show all doctors when search is empty
    }
  }

  const clearSearch = () => {
    setSearchTerm("")
    setDoctors(allDoctors)
  }

  const fetchAppointments = async (patientId: string) => {
    try {
      const response = await fetch(`/api/appointments?patientId=${patientId}`)
      if (response.ok) {
        const data = await response.json()
        setAppointments(data)
      }
    } catch (error) {
      console.error("Error fetching appointments:", error)
    }
  }

  const handleLogin = (patientData: Patient) => {
    setPatient(patientData)
    localStorage.setItem("patient_user", JSON.stringify(patientData))
    fetchAppointments(patientData._id)
    setShowAuthDialog(false)
  }

  const handleLogout = () => {
    setPatient(null)
    setAppointments([])
    localStorage.removeItem("patient_user")
  }

  const handleBookAppointment = (doctor: Doctor) => {
    if (!patient) {
      setShowAuthDialog(true)
      return
    }
    setSelectedDoctor(doctor)
    setShowBookingDialog(true)
  }

  const handleAppointmentBooked = (appointment: Appointment) => {
    setAppointments((prev) => [...prev, appointment])
    setShowBookingDialog(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* Enhanced Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-sky-100 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                  ClinicCare
                </h1>
                <p className="text-xs text-sky-500 -mt-1">Healthcare Made Easy</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link 
                href="/" 
                className="text-gray-700 hover:text-sky-600 font-medium transition-colors relative group"
              >
                Home
                <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-sky-500 group-hover:w-full transition-all duration-300" />
              </Link>
              {patient && (
                <Link 
                  href="/appointments" 
                  className="text-sky-700 hover:text-sky-600 font-medium transition-colors relative group"
                >
                  My Appointments
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-sky-500 group-hover:w-full transition-all duration-300" />
                </Link>
              )}
              <div className="flex items-center gap-2 text-sm text-sky-500">
                <Star className="w-4 h-4 text-yellow-500" />
              </div>
            </nav>

            {/* Auth & Mobile Menu */}
            <div className="flex items-center gap-3">
              {patient ? (
                <div className="hidden md:flex items-center gap-3">
                  {/* Notification Icon - only show when logged in */}
                  <NotificationIcon patientId={patient._id} />
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-sky-800">Welcome back!</p>
                    <p className="text-xs text-sky-600">{patient.name}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout} 
                    className="border-sky-200 text-sky-600 hover:bg-sky-50 hover:border-sky-300"
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="outline" className="border-sky-200 text-sky-600 hover:bg-sky-50">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-sky-100">
              <nav className="flex flex-col gap-4 pt-4">
                <Link 
                  href="/" 
                  className="text-gray-700 hover:text-sky-600 font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                {patient && (
                  <Link 
                    href="/appointments" 
                    className="text-sky-700 hover:text-sky-600 font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Appointments
                  </Link>
                )}
                {patient ? (
                  <div className="pt-2 border-t border-sky-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-sky-800">Welcome, {patient.name}!</p>
                      {/* Mobile Notification Icon */}
                      <NotificationIcon patientId={patient._id} className="md:hidden" />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        handleLogout()
                        setMobileMenuOpen(false)
                      }}
                      className="border-sky-200 text-sky-600 hover:bg-sky-50"
                    >
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-2 border-t border-sky-100">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-sky-200 text-sky-600 hover:bg-sky-50">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section - Only show if no patient logged in */}
        {!patient && (
          <section className="text-center mb-12 py-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl font-bold text-sky-800 mb-6">
                Your Health,{" "}
                <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                  Our Priority
                </span>
              </h1>
              <p className="text-xl text-sky-600 mb-8 leading-relaxed">
                Book appointments with trusted doctors, manage your healthcare journey, 
                and experience medical care like never before.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button size="lg" className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all">
                    Start Your Journey
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-sky-200 text-sky-600 hover:bg-sky-50 px-8 py-3 text-lg">
                  Learn More
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Patient Welcome Section */}
        {patient && (
          <section className="mb-8">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-8 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Welcome back, {patient.name}! 👋</h2>
                  <p className="text-sky-100 text-lg">Ready to take care of your health today?</p>
                </div>
                <div className="hidden md:block">
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                    <Heart className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Booked Appointments Section */}
        {patient && appointments.length > 0 && (
          <section id="appointments" className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-sky-800">Your Upcoming Appointments</h2>
              <Link href="/appointments">
                <Button variant="outline" className="border-sky-200 text-sky-600 hover:bg-sky-50">
                  View All
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {appointments.slice(0, 3).map((appointment) => (
                <Card key={appointment._id} className="border border-sky-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sky-800">{appointment.doctorName}</h3>
                      <Badge
                        variant={appointment.status === "confirmed" ? "default" : "secondary"}
                        className={appointment.status === "confirmed" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}
                      >
                        {appointment.status === "confirmed" && <CheckCircle className="w-3 h-3 mr-1" />}
                        {appointment.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-sky-600 mb-2">
                      <Calendar className="w-4 h-4 text-sky-500" />
                      {new Date(appointment.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-sky-600">
                      <Clock className="w-4 h-4 text-sky-500" />
                      {appointment.time}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {appointments.length > 3 && (
              <div className="text-center mt-6">
                <Link href="/appointments">
                  <Button variant="outline" className="border-sky-200 text-sky-600 hover:bg-sky-50">
                    View {appointments.length - 3} More Appointments
                  </Button>
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Find Your Doctor Section */}
        <section className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-sky-800 mb-3">Find Your Perfect Doctor</h2>
            <p className="text-sky-600 text-lg">Browse our qualified doctors and book your appointment with ease</p>
          </div>

          {/* Debug Section - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="max-w-5xl mx-auto mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-bold text-yellow-800 mb-2">🐛 Debug Info (Development Only)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Doctors Count:</strong> {doctors.length}
                </div>
                <div>
                  <strong>All Doctors:</strong> {allDoctors.length}
                </div>
                <div>
                  <strong>User Status:</strong> {patient ? 'Logged In' : 'Guest'}
                </div>
                <div>
                  <strong>Search Term:</strong> {searchTerm || 'None'}
                </div>
                <div>
                  <strong>Search By:</strong> {searchBy}
                </div>
              </div>
              {doctors.length > 0 && (
                <div className="mt-2">
                  <strong>Sample Doctor:</strong> {doctors[0]?.name || 'N/A'}
                </div>
              )}
            </div>
          )}

          {/* Enhanced Search Section */}
          <div className="max-w-5xl mx-auto mb-8">
            <form onSubmit={handleSearch} className="bg-white p-8 rounded-2xl shadow-lg border border-sky-100 backdrop-blur-sm">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Search Type Selector */}
                <div className="lg:w-1/4">
                  <label className="block text-sm font-semibold text-sky-700 mb-3">Search By</label>
                  <select
                    value={searchBy}
                    onChange={(e) => setSearchBy(e.target.value as "name" | "id" | "specialty")}
                    className="w-full px-4 py-3 border border-sky-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-sky-50"
                  >
                    <option value="name">Doctor Name</option>
                    <option value="id">Doctor ID</option>
                    <option value="specialty">Specialty</option>
                  </select>
                </div>

                {/* Search Input */}
                <div className="lg:w-1/2">
                  <label className="block text-sm font-semibold text-sky-700 mb-3">
                    {searchBy === "id" ? "Enter Doctor ID" : 
                     searchBy === "specialty" ? "Enter Specialty" : "Enter Doctor Name"}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-sky-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={
                        searchBy === "id" ? "e.g., 68c1b0a8290666380fd5fa35" :
                        searchBy === "specialty" ? "e.g., Cardiologist, Dermatologist" : "e.g., Dr. Sarah Ahmed"
                      }
                      className="w-full pl-12 pr-4 py-3 border border-sky-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-sky-50"
                    />
                  </div>
                </div>

                {/* Search Buttons */}
                <div className="lg:w-1/4 flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white mt-6 lg:mt-7 py-3 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                  <Button
                    type="button"
                    onClick={clearSearch}
                    variant="outline"
                    className="flex-1 mt-6 lg:mt-7 py-3 border-sky-300 text-sky-600 hover:bg-sky-50"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              
              {/* Search Results Info */}
              {searchTerm && (
                <div className="mt-6 p-4 bg-sky-50 rounded-lg border border-sky-200">
                  <div className="flex items-center gap-2 text-sky-700">
                    <Search className="w-4 h-4" />
                    <span className="text-sm">
                      Searching for {searchBy}: "<span className="font-semibold">{searchTerm}</span>" 
                      - Found <span className="font-semibold">{doctors.length}</span> result(s)
                    </span>
                  </div>
                </div>
              )}
            </form>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse border border-sky-100 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full" />
                      <div className="space-y-2">
                        <div className="h-4 bg-gradient-to-r from-sky-100 to-blue-100 rounded w-24" />
                        <div className="h-3 bg-gradient-to-r from-sky-100 to-blue-100 rounded w-20" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 bg-gradient-to-r from-sky-100 to-blue-100 rounded w-full" />
                      <div className="h-3 bg-gradient-to-r from-sky-100 to-blue-100 rounded w-3/4" />
                      <div className="h-10 bg-gradient-to-r from-sky-100 to-blue-100 rounded w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : doctors.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {doctors.map((doctor) => (
                  <div key={doctor._id} className="transform transition-all duration-300 hover:scale-105">
                    <DoctorCard
                      doctor={doctor}
                      onBookAppointment={() => handleBookAppointment(doctor)}
                    />
                  </div>
                ))}
              </div>
              
              {/* Show total count */}
              <div className="text-center mt-8">
                <p className="text-gray-600">
                  Showing <span className="font-semibold text-sky-600">{doctors.length}</span> doctor(s)
                  {searchTerm && ` matching "${searchTerm}"`}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {searchTerm ? "No doctors found" : "No doctors available"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? `We couldn't find any doctors matching "${searchTerm}". Try adjusting your search criteria.`
                  : "Please try again later or contact support for assistance."
                }
              </p>
              {searchTerm && (
                <Button 
                  onClick={clearSearch}
                  variant="outline" 
                  className="border-sky-300 text-sky-600 hover:bg-sky-50"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </section>
      </main>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} onLogin={handleLogin} />

      {selectedDoctor && (
        <AppointmentBooking
          open={showBookingDialog}
          onOpenChange={setShowBookingDialog}
          doctor={selectedDoctor}
          user={patient!}
          onAppointmentBooked={handleAppointmentBooked}
        />
      )}
    </div>
  )
}
