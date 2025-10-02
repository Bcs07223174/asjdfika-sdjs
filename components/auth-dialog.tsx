"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogin: (user: any) => void
}

export function AuthDialog({ open, onOpenChange, onLogin }: AuthDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [signupError, setSignupError] = useState("")
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  })

  // Clear errors when dialog opens/closes or when switching tabs
  const clearErrors = () => {
    setLoginError("")
    setSignupError("")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      })

      if (response.ok) {
        const user = await response.json()
        clearErrors()
        onLogin(user)
      } else {
        try {
          const errorData = await response.json()
          if (errorData.requiresVerification) {
            // Redirect to OTP verification if account not verified
            onOpenChange(false)
            const otpUrl = `/verify-otp?email=${encodeURIComponent(loginData.email)}`
            try {
              router.push(otpUrl)
            } catch (routerError) {
              console.warn("Router.push failed, using window.location:", routerError)
              window.location.href = otpUrl
            }
          } else {
            setLoginError(errorData.error || "Invalid credentials")
          }
        } catch (parseError) {
          // If we can't parse the response, show a connection error
          setLoginError("Connection failed. Please check your internet and try again.")
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      // Enhanced error messages based on error type
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setLoginError("Network connection failed. Please check your internet connection.")
      } else if (error instanceof TypeError) {
        setLoginError("Connection timeout. Please try again.")
      } else {
        setLoginError("Connection failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSignupError("")

    // Basic validation
    if (!signupData.name.trim()) {
      setSignupError("Name is required")
      setIsLoading(false)
      return
    }
    if (!signupData.email.trim()) {
      setSignupError("Email is required")
      setIsLoading(false)
      return
    }
    if (!signupData.phone.trim()) {
      setSignupError("Phone number is required")
      setIsLoading(false)
      return
    }
    if (signupData.password.length < 6) {
      setSignupError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...signupData, role: "patient" }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Signup response data:", data) // Debug log
        if (data.requiresVerification) {
          // Redirect to OTP verification page
          clearErrors()
          onOpenChange(false) // Close the dialog
          console.log("Redirecting to OTP verification page...") // Debug log
          
          // Try multiple redirection methods for better compatibility
          const otpUrl = `/verify-otp?email=${encodeURIComponent(signupData.email)}`
          try {
            router.push(otpUrl)
          } catch (routerError) {
            console.warn("Router.push failed, using window.location:", routerError)
            window.location.href = otpUrl
          }
        } else {
          // Fallback: if no OTP required, login directly
          clearErrors()
          onLogin(data)
        }
      } else {
        try {
          const errorData = await response.json()
          // Provide more specific error messages
          if (response.status === 400) {
            setSignupError(errorData.error || "Email already exists. Please try with a different email.")
          } else if (response.status === 422) {
            setSignupError("Invalid data format. Please check your information and try again.")
          } else if (response.status === 500) {
            setSignupError("Server error. Please try again later.")
          } else {
            setSignupError(errorData.error || "Signup failed. Please try again.")
          }
        } catch (parseError) {
          // If we can't parse the response, show a connection error
          setSignupError("Connection failed. Please check your internet and try again.")
        }
      }
    } catch (error) {
      console.error("Signup error:", error)
      // Enhanced error messages based on error type
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setSignupError("Network connection failed. Please check your internet connection.")
      } else if (error instanceof TypeError) {
        setSignupError("Connection timeout. Please try again.")
      } else {
        setSignupError("Unable to signup. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-indigo-100">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
            Welcome Back
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Please sign in to your account or create a new one
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="login" className="w-full" onValueChange={clearErrors}>
          <TabsList className="grid w-full grid-cols-2 bg-white/70 backdrop-blur-sm">
            <TabsTrigger value="login" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4 mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {loginError}
                </div>
              )}
              
              <div>
                <Label htmlFor="login-email" className="text-gray-700 font-medium">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="mt-1 border-gray-300 focus:border-sky-500 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <Label htmlFor="login-password" className="text-gray-700 font-medium">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  className="mt-1 border-gray-300 focus:border-sky-500 focus:ring-sky-500/20"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium py-2.5"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-6">
            <form onSubmit={handleSignup} className="space-y-4">
              {signupError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {signupError}
                </div>
              )}
              
              <div>
                <Label htmlFor="signup-name" className="text-gray-700 font-medium">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={signupData.name}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  className="mt-1 border-gray-300 focus:border-sky-500 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <Label htmlFor="signup-email" className="text-gray-700 font-medium">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signupData.email}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="mt-1 border-gray-300 focus:border-sky-500 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <Label htmlFor="signup-phone" className="text-gray-700 font-medium">Phone Number</Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={signupData.phone}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  required
                  className="mt-1 border-gray-300 focus:border-sky-500 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <Label htmlFor="signup-password" className="text-gray-700 font-medium">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Enter your password (min 6 characters)"
                  value={signupData.password}
                  onChange={(e) =>
                    setSignupData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  className="mt-1 border-gray-300 focus:border-sky-500 focus:ring-sky-500/20"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium py-2.5"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
