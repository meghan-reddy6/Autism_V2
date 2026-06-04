"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"

import { useAuthStore } from "@/lib/store"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setError("")
    
    try {
      const formData = new URLSearchParams()
      formData.append("username", data.email)
      formData.append("password", data.password)
      
      // Hit the proxy endpoint
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || "Invalid credentials")
      }
      
      login(result.access_token, result.user)
      
      if (result.user.role === "SUPER_ADMIN") {
        router.push("/admin")
      } else if (result.user.role === "PARENT_USER") {
        router.push("/my-child")
      } else {
        router.push("/dashboard")
      }
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 text-rose-500 text-sm rounded-md border border-rose-100">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input 
          type="email" 
          {...register("email")}
          className="w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-slate-900"
          placeholder="doctor@clinic.com"
        />
        {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input 
          type="password" 
          {...register("password")}
          className="w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-slate-900"
          placeholder="••••••••"
        />
        {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>}
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  )
}
