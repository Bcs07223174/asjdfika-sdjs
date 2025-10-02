"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Loader2, LogOut, MapPin, Stethoscope, User, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Appointment {
  _id: string;
  doctorName: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled";
  appointmentKey?: string;
  Adrees?: string; // Doctor's address field (as specified)
}

interface Patient {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

export default function BookedAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in - use same key as main page
    const patientData = localStorage.getItem("patient_user");
    if (!patientData) {
      // Redirect to home page with a message to login
      console.log("No patient data found, redirecting to home page");
      window.location.href = "/?login=required";
      return;
    }

    try {
      const parsedPatient = JSON.parse(patientData);
      setPatient(parsedPatient);
      fetchAppointments(parsedPatient._id);
    } catch (error) {
      console.error("Error parsing patient data:", error);
      localStorage.removeItem("patient_user");
      window.location.href = "/?login=required";
    }
  }, []);

  const fetchAppointments = async (patientId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/appointments?patientId=${patientId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched appointments data:", data);
        setAppointments(data);
        setFilteredAppointments(data); // Initialize filtered appointments
      } else {
        setError("Failed to fetch appointments");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setError("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter appointments based on selected status
  useEffect(() => {
    if (selectedStatus === "all") {
      setFilteredAppointments(appointments);
    } else {
      setFilteredAppointments(appointments.filter(app => app.status === selectedStatus));
    }
  }, [appointments, selectedStatus]);

  const handleLogout = () => {
    localStorage.removeItem("patient_user");
    window.location.href = "/";
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!patient) return;

    const confirmCancel = window.confirm("Are you sure you want to cancel this appointment? This action cannot be undone.");
    if (!confirmCancel) return;

    try {
      setIsCancelling(appointmentId);
      
      const response = await fetch("/api/appointments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId,
          status: "cancelled",
          patientId: patient._id,
        }),
      });

      if (response.ok) {
        // Update local state
        setAppointments(prev => 
          prev.map(app => 
            app._id === appointmentId 
              ? { ...app, status: "cancelled" as const }
              : app
          )
        );
        
        alert("Appointment cancelled successfully");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to cancel appointment");
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("Failed to cancel appointment. Please try again.");
    } finally {
      setIsCancelling(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-sky-600" />
            <span className="ml-3 text-sky-700 text-lg">Loading your appointments...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <Card className="text-center py-16 bg-white border-red-200">
            <CardContent className="p-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Stethoscope className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-semibold text-red-800 mb-3">Error Loading Appointments</h3>
              <p className="text-red-600 mb-8 text-lg">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-base"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-white">
      <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-sky-800">My Appointments</h1>
          <p className="text-sky-600 mt-1 text-lg">Manage your healthcare appointments</p>
        </div>
        <div className="flex items-center gap-3">
          {patient && (
            <>
              <Badge className="bg-sky-100 text-sky-800 px-4 py-2 text-sm font-medium">
                Welcome, {patient.name}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Current Patient Info */}
      {patient && (
        <Card className="bg-white shadow-lg border border-sky-200">
          <CardHeader className="bg-gradient-to-r from-sky-100 to-sky-50 border-b border-sky-200">
            <CardTitle className="flex items-center gap-2 text-sky-800 text-xl">
              <User className="w-5 h-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-base">
              <div>
                <p className="text-sky-600 text-sm uppercase tracking-wide font-medium mb-1">Name</p>
                <p className="font-semibold text-sky-800">{patient.name}</p>
              </div>
              <div>
                <p className="text-sky-600 text-sm uppercase tracking-wide font-medium mb-1">Email</p>
                <p className="font-semibold text-sky-800">{patient.email}</p>
              </div>
              <div>
                <p className="text-sky-600 text-sm uppercase tracking-wide font-medium mb-1">Phone</p>
                <p className="font-semibold text-sky-800">{patient.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointments List */}
      {appointments.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-sky-800 flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-sky-600" />
              My Appointments ({filteredAppointments.length})
            </h2>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-base font-medium text-sky-700">Filter by status:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={selectedStatus === "all" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("all")}
                  className={selectedStatus === "all" ? "bg-sky-600 hover:bg-sky-700 text-white" : "border-sky-300 text-sky-700 hover:bg-sky-50"}
                >
                  All ({appointments.length})
                </Button>
                <Button
                  size="sm"
                  variant={selectedStatus === "pending" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("pending")}
                  className={selectedStatus === "pending" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "border-yellow-300 text-yellow-700 hover:bg-yellow-50"}
                >
                  Pending ({appointments.filter(app => app.status === "pending").length})
                </Button>
                <Button
                  size="sm"
                  variant={selectedStatus === "confirmed" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("confirmed")}
                  className={selectedStatus === "confirmed" ? "bg-green-500 hover:bg-green-600 text-white" : "border-green-300 text-green-700 hover:bg-green-50"}
                >
                  Confirmed ({appointments.filter(app => app.status === "confirmed").length})
                </Button>
                <Button
                  size="sm"
                  variant={selectedStatus === "cancelled" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("cancelled")}
                  className={selectedStatus === "cancelled" ? "bg-red-500 hover:bg-red-600 text-white" : "border-red-300 text-red-700 hover:bg-red-50"}
                >
                  Cancelled ({appointments.filter(app => app.status === "cancelled").length})
                </Button>
              </div>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAppointments.map((appointment) => (
              <Card key={appointment._id} className="hover:shadow-lg transition-all duration-200 border-sky-200 bg-white">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-sky-800 leading-tight">
                          {appointment.doctorName}
                        </h3>
                        {appointment.appointmentKey && (
                          <p className="text-sm text-sky-600 font-mono mt-1">
                            Key: {appointment.appointmentKey}
                          </p>
                        )}
                      </div>
                      <Badge className={`px-3 py-1 text-sm shrink-0 ${getStatusBadgeColor(appointment.status)}`}>
                        {appointment.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3 text-base text-sky-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-sky-500 shrink-0" />
                        <span className="truncate">{formatDate(appointment.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-sky-500 shrink-0" />
                        <span>{appointment.time}</span>
                      </div>
                      {appointment.Adrees && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-sky-500 shrink-0" />
                          <span className="truncate" title={appointment.Adrees}>{appointment.Adrees}</span>
                        </div>
                      )}
                    </div>

                    {/* Cancel Button - Only show for non-cancelled appointments */}
                    {appointment.status !== "cancelled" && (
                      <div className="pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelAppointment(appointment._id)}
                          disabled={isCancelling === appointment._id}
                          className="w-full text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                        >
                          {isCancelling === appointment._id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-2" />
                              Cancel Appointment
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {appointments.length === 0 ? (
        <Card className="text-center py-16 bg-white border-sky-200">
          <CardContent className="p-8">
            <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="w-10 h-10 text-sky-600" />
            </div>
            <h3 className="text-2xl font-semibold text-sky-800 mb-3">No Appointments Found</h3>
            <p className="text-sky-600 mb-8 text-lg">
              You don't have any appointments at the moment.
            </p>
            <div className="space-y-6">
              <p className="text-base text-sky-500">
                Ready to schedule your next appointment?
              </p>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="border-sky-300 text-sky-700 hover:bg-sky-50 px-6 py-3 text-base"
              >
                Book Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredAppointments.length === 0 ? (
        <Card className="text-center py-16 bg-white border-sky-200">
          <CardContent className="p-8">
            <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="w-10 h-10 text-sky-600" />
            </div>
            <h3 className="text-2xl font-semibold text-sky-800 mb-3">No {selectedStatus} Appointments</h3>
            <p className="text-sky-600 mb-8 text-lg">
              No appointments found with "{selectedStatus}" status.
            </p>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => setSelectedStatus("all")}
              className="border-sky-300 text-sky-700 hover:bg-sky-50 px-6 py-3 text-base"
            >
              Show All Appointments
            </Button>
          </CardContent>
        </Card>
      ) : null}
      </div>
    </div>
  );
}
