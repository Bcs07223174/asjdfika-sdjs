"use client"

import { NotificationIcon } from "@/components/notification-icon"
import { ThemeProvider } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Heart, Star } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import "../globals.css"

interface Patient {
  _id: string
  name: string
  email: string
  phone: string
}

export default function AppointmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [patient, setPatient] = useState<Patient | null>(null)

  useEffect(() => {
    const savedPatient = localStorage.getItem("patient_user")
    if (savedPatient) {
      setPatient(JSON.parse(savedPatient))
    }
  }, [])

  const handleLogout = () => {
    setPatient(null)
    localStorage.removeItem("patient_user")
    window.location.href = "/" // Redirect to home after logout
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
        {/* Modern Header - consistent with home page */}
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
                  <p className="text-xs text-gray-500 -mt-1">Healthcare Made Easy</p>
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
                    className="text-sky-600 font-medium transition-colors relative group"
                  >
                    My Appointments
                    <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-sky-500" />
                  </Link>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Star className="w-4 h-4 text-yellow-500" />
                  4.9/5 Rating
                </div>
              </nav>

              {/* Auth Actions */}
              <div className="flex items-center gap-2">
                {patient ? (
                  <div className="flex items-center gap-3">
                    {/* Notification Icon */}
                    <NotificationIcon patientId={patient._id} />
                    
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">Welcome back!</p>
                      <p className="text-xs text-gray-600">{patient.name}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleLogout}
                      className="border-sky-200 text-sky-600 hover:bg-sky-50"
                    >
                      Logout
                    </Button>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main>
          {children}
        </main>
      </div>
    </ThemeProvider>
  )
}
