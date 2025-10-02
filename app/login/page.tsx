"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Heart, Lock, Mail, Phone, Shield, UserIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  })

  // Check if user is already logged in
  useEffect(() => {
    const savedPatient = localStorage.getItem("patient_user")
    if (savedPatient) {
      // User is already logged in, redirect to home
      router.push("/")
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      })

      if (response.ok) {
        const user = await response.json()
        localStorage.setItem("patient_user", JSON.stringify(user))
        router.push("/")
      } else {
        alert("Invalid credentials")
      }
    } catch (error) {
      console.error("Login error:", error)
      alert("Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...signupData, role: "patient" }),
      })

      if (response.ok) {
        const user = await response.json()
        localStorage.setItem("patient_user", JSON.stringify(user))
        router.push("/")
      } else {
        const error = await response.text()
        alert(error || "Signup failed")
      }
    } catch (error) {
      console.error("Signup error:", error)
      alert("Signup failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-sky-200 rounded-full opacity-20 animate-pulse" />
      <div className="absolute top-32 right-20 w-16 h-16 bg-blue-300 rounded-full opacity-30 animate-pulse delay-1000" />
      <div className="absolute bottom-20 left-32 w-12 h-12 bg-indigo-200 rounded-full opacity-25 animate-pulse delay-500" />

      <div className="relative w-full max-w-md">
        {/* Back to Home Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 mb-6 font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Main Card */}
        <Card className="backdrop-blur-sm bg-white/80 border-sky-100 shadow-2xl">
          <CardHeader className="text-center pb-6">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold text-sky-800">
              Welcome to ClinicCare
            </CardTitle>
            <CardDescription className="text-sky-600 mt-2">
              Your trusted healthcare companion
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-sky-50 mb-6">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-sky-500 data-[state=active]:text-white transition-all"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="data-[state=active]:bg-sky-500 data-[state=active]:text-white transition-all"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sky-700 font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-sky-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 border-sky-200 focus:border-sky-400 focus:ring-sky-400 bg-white/50"
                        value={loginData.email}
                        onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sky-700 font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-sky-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        className="pl-10 border-sky-200 focus:border-sky-400 focus:ring-sky-400 bg-white/50"
                        value={loginData.password}
                        onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium py-2.5 transition-all shadow-lg hover:shadow-xl" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing In...
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                <div className="text-center pt-4">
                  <p className="text-sm text-sky-600">
                    Don't have an account?{" "}
                    <button 
                      type="button"
                      onClick={() => {
                        const signupTab = document.querySelector('[value="signup"]') as HTMLButtonElement
                        signupTab?.click()
                      }}
                      className="text-sky-600 hover:text-sky-700 font-medium"
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sky-700 font-medium">
                      Full Name
                    </Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-sky-400" />
                      <Input
                        id="signup-name"
                        placeholder="Enter your full name"
                        className="pl-10 border-sky-200 focus:border-sky-400 focus:ring-sky-400 bg-white/50"
                        value={signupData.name}
                        onChange={(e) => setSignupData((prev) => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sky-700 font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-sky-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 border-sky-200 focus:border-sky-400 focus:ring-sky-400 bg-white/50"
                        value={signupData.email}
                        onChange={(e) => setSignupData((prev) => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone" className="text-sky-700 font-medium">
                      Phone Number <span className="text-sky-400">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-sky-400" />
                      <Input
                        id="signup-phone"
                        placeholder="Enter your phone number"
                        className="pl-10 border-sky-200 focus:border-sky-400 focus:ring-sky-400 bg-white/50"
                        value={signupData.phone}
                        onChange={(e) => setSignupData((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sky-700 font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-sky-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        className="pl-10 border-sky-200 focus:border-sky-400 focus:ring-sky-400 bg-white/50"
                        value={signupData.password}
                        onChange={(e) => setSignupData((prev) => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium py-2.5 transition-all shadow-lg hover:shadow-xl" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Account...
                      </div>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>

                <div className="text-center pt-4">
                  <p className="text-sm text-sky-600">
                    Already have an account?{" "}
                    <button 
                      type="button"
                      onClick={() => {
                        const loginTab = document.querySelector('[value="login"]') as HTMLButtonElement
                        loginTab?.click()
                      }}
                      className="text-sky-600 hover:text-sky-700 font-medium"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-sm text-sky-500 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Your data is protected with enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  )
}