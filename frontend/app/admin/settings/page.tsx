"use client"
import React from "react"
import { SecuritySettings } from "@/features/auth/components/SecuritySettings"

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Security Settings</h1>
        <p className="text-slate-500 mt-2">Manage your super admin account security.</p>
      </div>

      <SecuritySettings />
    </div>
  )
}
