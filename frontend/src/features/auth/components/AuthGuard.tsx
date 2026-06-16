"use client"
import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/src/features/auth/store/authStore"
import { fetchApi } from "@/src/core/api/api-client"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, logout, login } = useAuthStore()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      let activeToken = token;
      
      if (!activeToken) {
        // Wait a tiny bit for Zustand persist hydration
        await new Promise(r => setTimeout(r, 150));
        activeToken = useAuthStore.getState().token;
        
        if (!activeToken) {
          if (mounted) {
            setIsChecking(false);
            router.replace("/login");
          }
          return;
        }
      }

      try {
        // Cryptographically verify token with backend
        const response = await fetchApi('/auth/me', {
          method: 'GET'
        })
        
        if (mounted) {
          setIsAuthenticated(true)
          setIsChecking(false)
        }
      } catch (error) {
        // If 401 or network error
        if (mounted) {
          logout()
          setIsChecking(false)
          router.replace("/login")
        }
      }
    }

    verifySession()

    return () => {
      mounted = false;
    }
  }, [token, router, pathname, logout])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Verifying Secure Session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Block render entirely (no partial UI leaks)
  }

  return <>{children}</>
}
