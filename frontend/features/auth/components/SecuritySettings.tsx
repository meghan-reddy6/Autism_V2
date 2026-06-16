"use client"
import * as React from "react"
import { useAuthStore } from "@/lib/store"
import { fetchApi } from "@/lib/api-client"
import { Button } from "@/shared/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/Card"
import { Lock, Shield, ShieldCheck, ShieldAlert } from "lucide-react"
import { useQuery, useMutation } from "@tanstack/react-query"

export function SecuritySettings() {
  const { user } = useAuthStore()
  
  // Password State
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [pwError, setPwError] = React.useState("")
  const [pwSuccess, setPwSuccess] = React.useState("")

  // MFA State
  const [mfaSetup, setMfaSetup] = React.useState<{ secret: string, qr_code: string } | null>(null)
  const [mfaPin, setMfaPin] = React.useState("")
  const [mfaError, setMfaError] = React.useState("")
  const [mfaSuccess, setMfaSuccess] = React.useState("")

  const { data: meData, refetch: refetchMe } = useQuery({
    queryKey: ['authMe'],
    queryFn: async () => fetchApi('/auth/me'),
    retry: false
  })

  const mfaEnabled = !!meData?.mfaEnabled

  const passwordMutation = useMutation({
    mutationFn: async () => {
      await fetchApi('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      })
    },
    onSuccess: () => {
      setPwSuccess("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: (err: any) => {
      setPwError(err.message || "Failed to change password")
    }
  })

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    setPwError("")
    setPwSuccess("")

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters long")
      return
    }

    passwordMutation.mutate()
  }

  const mfaSetupMutation = useMutation({
    mutationFn: async () => fetchApi('/mfa/setup', { method: 'POST' }),
    onSuccess: (data) => {
      setMfaSetup(data)
    },
    onError: (err: any) => {
      setMfaError(err.message || "Failed to initiate MFA setup")
    }
  })

  const startMfaSetup = () => {
    setMfaError("")
    mfaSetupMutation.mutate()
  }

  const mfaVerifyMutation = useMutation({
    mutationFn: async () => {
      await fetchApi('/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ pin: mfaPin })
      })
    },
    onSuccess: () => {
      refetchMe()
      setMfaSetup(null)
      setMfaPin("")
      setMfaSuccess("Multi-Factor Authentication enabled successfully!")
    },
    onError: (err: any) => {
      setMfaError(err.message || "Invalid PIN")
    }
  })

  const verifyMfaSetup = () => {
    setMfaError("")
    setMfaSuccess("")
    mfaVerifyMutation.mutate()
  }

  const mfaDisableMutation = useMutation({
    mutationFn: async () => {
      await fetchApi('/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ pin: mfaPin })
      })
    },
    onSuccess: () => {
      refetchMe()
      setMfaPin("")
      setMfaSuccess("Multi-Factor Authentication has been disabled.")
    },
    onError: (err: any) => {
      setMfaError(err.message || "Invalid PIN")
    }
  })

  const disableMfa = () => {
    setMfaError("")
    setMfaSuccess("")
    if (!mfaPin) {
      setMfaError("Please enter your current Authenticator PIN to disable MFA")
      return
    }
    mfaDisableMutation.mutate()
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Security Settings</h2>
        <p className="text-slate-500">Manage your password and secure your account with 2-step verification.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Password Change Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" /> 
              Change Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {pwError && <div className="p-3 bg-rose-50 text-rose-500 text-sm rounded-md border border-rose-100">{pwError}</div>}
              {pwSuccess && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-md border border-emerald-100">{pwSuccess}</div>}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <Button type="submit" disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}>
                {passwordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* MFA Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mfaEnabled ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-amber-500" />}
              Multi-Factor Authentication
            </CardTitle>
            <CardDescription>
              {mfaEnabled 
                ? "Your account is secured with Google Authenticator."
                : "Add an extra layer of security to your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mfaError && <div className="p-3 bg-rose-50 text-rose-500 text-sm rounded-md border border-rose-100">{mfaError}</div>}
            {mfaSuccess && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-md border border-emerald-100">{mfaSuccess}</div>}

            {mfaEnabled ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg flex items-start gap-3 text-sm text-emerald-800">
                  <ShieldCheck className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
                  <p>MFA is currently <strong>enabled</strong>. You will be required to enter a 6-digit code from your authenticator app each time you sign in.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Disable MFA</label>
                  <p className="text-xs text-slate-500 mb-2">Enter your current 6-digit PIN to turn off 2-step verification.</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={mfaPin}
                      onChange={(e) => setMfaPin(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      className="w-32 h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-widest font-mono text-center"
                    />
                    <Button variant="danger" onClick={disableMfa} disabled={mfaDisableMutation.isPending || mfaPin.length < 6}>
                      Turn Off
                    </Button>
                  </div>
                </div>
              </div>
            ) : mfaSetup ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-sm text-slate-600">
                  1. Install an authenticator app like Google Authenticator or Authy on your phone.<br/>
                  2. Scan this QR code with the app.
                </p>
                
                <div className="p-4 bg-white border border-slate-200 rounded-xl flex justify-center shadow-sm">
                  <img src={mfaSetup.qr_code} alt="MFA QR Code" className="w-48 h-48" />
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-slate-500">Can't scan? Use this secret key:</p>
                  <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded text-slate-800 break-all select-all">
                    {mfaSetup.secret}
                  </code>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-1">3. Enter the 6-digit code to verify</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={mfaPin}
                      onChange={(e) => setMfaPin(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      className="flex-1 h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-widest font-mono text-center"
                    />
                    <Button onClick={verifyMfaSetup} disabled={mfaVerifyMutation.isPending || mfaPin.length < 6}>
                      Verify & Enable
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Button onClick={startMfaSetup} disabled={mfaSetupMutation.isPending} className="w-full">
                  <Shield className="w-4 h-4 mr-2" />
                  Set up Google Authenticator
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
