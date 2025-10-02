"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, BellRing, Check, CheckCheck, Clock, Mail } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

interface Notification {
  _id: string
  patientId: string
  message: string
  title: string
  type: "info" | "success" | "warning" | "error"
  isRead: boolean
  createdAt: string
  relatedId?: string
  actionUrl?: string
}

interface NotificationIconProps {
  patientId: string
  className?: string
}

export function NotificationIcon({ patientId, className = "" }: NotificationIconProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Live notification system - WhatsApp style (every 3 seconds when active)
  useEffect(() => {
    if (patientId) {
      fetchNotifications()
      
      // Immediate refresh when dialog opens
      if (isOpen) {
        const liveInterval = setInterval(fetchNotifications, 3000) // Live updates every 3 seconds
        return () => clearInterval(liveInterval)
      } else {
        // Background refresh when closed
        const backgroundInterval = setInterval(fetchNotifications, 15000) // 15 seconds when inactive
        return () => clearInterval(backgroundInterval)
      }
    }
  }, [patientId, isOpen])

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications?patientId=${patientId}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        
        // Check for new notifications (live system)
        const currentIds = new Set(notifications.map(n => n._id))
        const newNotifications = data.notifications.filter(n => !currentIds.has(n._id))
        
        // Play notification sound for new messages (WhatsApp style)
        if (newNotifications.length > 0 && notifications.length > 0) {
          // Could add sound here: new Audio('/notification.mp3').play()
          console.log(`📨 ${newNotifications.length} new notification(s) received`)
        }
        
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }, [patientId, notifications])

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, notificationId })
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, markAllAsRead: true })
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅"
      case "warning":
        return "⚠️"
      case "error":
        return "❌"
      default:
        return "ℹ️"
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative p-2 hover:bg-sky-50 ${className}`}
          onClick={() => setIsOpen(true)}
        >
          {unreadCount > 0 ? (
            <BellRing className="w-6 h-6 text-sky-600" />
          ) : (
            <Bell className="w-6 h-6 text-gray-400" />
          )}
          
          {/* Red dot indicator for unread notifications */}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 flex items-center justify-center">
              <div className="relative">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
              </div>
              {unreadCount > 1 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[85vh] bg-white border-0 shadow-2xl rounded-xl overflow-hidden">
        {/* Email-style Header */}
        <DialogHeader className="bg-gradient-to-r from-sky-50 to-blue-50 px-6 py-4 border-b border-sky-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 rounded-full">
                <Mail className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-sky-800">
                  Notifications
                </DialogTitle>
                <p className="text-sm text-sky-600 mt-0.5">
                  {notifications.length} total • {unreadCount} unread
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white border-0 px-3 py-1 rounded-full">
                  {unreadCount} new
                </Badge>
              )}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={isLoading}
                  className="bg-white/80 hover:bg-white text-sky-700 border border-sky-200 rounded-full px-3 py-1.5 text-xs font-medium"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      <span>Marking...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <CheckCheck className="w-4 h-4" />
                      <span>Mark all read</span>
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Email-style Notification List */}
        <div className="bg-white flex-1 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-sky-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                You'll receive appointment updates, test results, and important messages here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[60vh]">
              <div className="divide-y divide-gray-100">
                {notifications.map((notification, index) => (
                  <div
                    key={notification._id}
                    className={`relative transition-all duration-200 hover:bg-gray-50 cursor-pointer group ${
                      notification.isRead 
                        ? "bg-white" 
                        : "bg-blue-50/30 border-l-4 border-l-blue-500"
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification._id)}
                  >
                    <div className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        {/* Notification Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          notification.isRead ? 'bg-gray-100' : 'bg-blue-100'
                        }`}>
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-medium text-sm leading-tight ${
                                  notification.isRead ? 'text-gray-700' : 'text-gray-900 font-semibold'
                                }`}>
                                  {notification.title}
                                </h4>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                )}
                              </div>
                              <p className={`text-sm leading-relaxed ${
                                notification.isRead ? 'text-gray-500' : 'text-gray-700'
                              }`}>
                                {notification.message}
                              </p>
                              
                              {/* Meta info */}
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-400">
                                    {formatDate(notification.createdAt)}
                                  </span>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs border-0 ${getNotificationColor(notification.type)}`}
                                >
                                  {notification.type}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Action button */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1.5 h-auto hover:bg-gray-200 rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!notification.isRead) {
                                    markAsRead(notification._id)
                                  }
                                }}
                              >
                                {notification.isRead ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Check className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}