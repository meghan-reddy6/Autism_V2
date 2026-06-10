"use client"
import React from "react"
import Link from "next/link"
import { Activity, Users, Settings, FileText, Calendar, LogOut } from "lucide-react"
import AuthGuard from "@/components/AuthGuard"
import { ClinicalGuard } from "@/components/ClinicalGuard"
import LogoutButton from "@/components/LogoutButton"
import { useAuthStore } from "@/lib/store"

export default function ClinicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuthStore()
  const isDoctor = user?.role === "DOCTOR" || user?.role === "PSYCHOLOGIST" || user?.role === "CLINICAL_ADMIN" || user?.role === "SUPERVISOR" || user?.role === "SUPER_ADMIN"

  return (
    <AuthGuard>
      <ClinicalGuard>
        <div className="flex h-screen w-full overflow-hidden bg-slate-50 print:h-auto print:block print:overflow-visible">
          {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 hidden md:flex print:hidden">
          <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
            <Activity className="h-6 w-6 text-blue-600 mr-3" />
            <span className="font-bold text-slate-800 text-lg">SAT</span>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem href="/dashboard" icon={<Activity />} label="Dashboard" />
            <NavItem href="/patients" icon={<Users />} label="Patient Roster" />
            <NavItem href="/assessments" icon={<FileText />} label="All Assessments" />
            <NavItem href="/assessments/new" icon={<FileText />} label="New Assessment" />
            <NavItem href="/calendar" icon={<Calendar />} label="Calendar" />
            
            <div className="pt-8 pb-2">
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">System</p>
            </div>
            <NavItem href="/settings" icon={<Settings />} label="Settings" />

            {user?.role === "SUPER_ADMIN" && (
              <>
                <div className="pt-8 pb-2">
                  <p className="px-3 text-xs font-semibold text-rose-400 uppercase tracking-wider">Admin Constraints</p>
                </div>
                <NavItem href="/admin" icon={<Settings />} label="System Control" />
              </>
            )}
          </nav>
          
          <div className="p-4 border-t border-slate-100">
            <LogoutButton />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 justify-between shrink-0 print:hidden">
            <div className="font-semibold text-lg text-slate-800 md:hidden">SAT</div>
            <div className="hidden md:block"></div>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-slate-600">
                {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() : "??"}
              </div>
            </div>
          </header>
          
          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 print:overflow-visible">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
      </ClinicalGuard>
    </AuthGuard>
  )
}

function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactElement;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center px-3 py-2.5 rounded-md transition-colors text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {React.cloneElement(icon, { className: "h-5 w-5 mr-3 shrink-0" })}
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
