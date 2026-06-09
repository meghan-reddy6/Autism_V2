"use client"
import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/Card"
import { Construction, ShieldAlert, CheckCircle2 } from "lucide-react"
import { fetchApi } from "@/lib/api-client"

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg("")
    setErrorMsg("")

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.")
      return
    }

    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters.")
      return
    }

    setIsSubmitting(true)
    try {
      await fetchApi("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      })
      setSuccessMsg("Password successfully updated.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to change password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500 mt-2">Manage your account security and configuration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <div className="border-b border-slate-100 p-6 bg-slate-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-slate-800">Security Profile</h2>
            <p className="text-sm text-slate-500 mt-1">Update your login credentials.</p>
          </div>
          <CardContent className="p-6">
            {successMsg && (
              <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-lg flex items-center text-sm border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="mb-6 bg-rose-50 text-rose-700 p-4 rounded-lg flex items-center text-sm border border-rose-200">
                <ShieldAlert className="w-4 h-4 mr-2" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Current Password</label>
                <input required type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {isSubmitting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <div className="border-b border-slate-100 p-6 bg-slate-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-slate-800">ML Configuration</h2>
            <p className="text-sm text-slate-500 mt-1">Tenant-level CDSS thresholds.</p>
          </div>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mb-4">
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
