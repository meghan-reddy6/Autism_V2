"use client"

import React from "react"
import { LogOut } from "lucide-react"
import { useAuthStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

export default function LogoutButton() {
  const { logout } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleLogout = () => {
    logout()
    queryClient.clear()
    router.push("/login")
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center w-full px-3 py-2.5 rounded-md transition-colors text-slate-600 hover:bg-rose-50 hover:text-rose-600"
    >
      <LogOut className="h-5 w-5 mr-3 shrink-0" />
      <span className="font-medium text-sm">Sign Out</span>
    </button>
  )
}
