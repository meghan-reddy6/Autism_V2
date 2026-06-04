"use client"
import React from "react"
import { Card, CardContent } from "@/components/ui/Card"
import { Construction } from "lucide-react"

export default function PlaceholderPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Patient Roster</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <Construction className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Under Construction</h2>
          <p className="text-slate-500 max-w-md">
            The Patient Roster module is currently being built. Please check back later.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
