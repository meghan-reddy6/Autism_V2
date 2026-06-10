"use client"
import React from "react"
import { Card, CardContent } from "@/components/ui/Card"
import { Construction } from "lucide-react"
import { SecuritySettings } from "@/components/SecuritySettings"

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500 mt-2">Manage your account security and configuration.</p>
      </div>

      <SecuritySettings />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 md:px-6 lg:px-8">
        <Card>
          <div className="border-b border-slate-100 p-6 bg-slate-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-slate-800">ML Configuration</h2>
            <p className="text-sm text-slate-500 mt-1">Tenant-level CDSS thresholds.</p>
          </div>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mb-4">
              <Construction className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">Under Construction</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              The AI/ML Threshold configuration module is currently being built.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
