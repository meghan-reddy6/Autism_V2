import { AdminGuard } from "@/src/features/auth/components/AdminGuard";
import { LayoutDashboard, Users, Building2, Settings, LogOut, Activity, Trash2, Server } from "lucide-react";
import Link from "next/link";
import AdminLogoutButton from "@/src/features/auth/components/AdminLogoutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-900 flex text-slate-200">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col fixed inset-y-0 z-10">
          <div className="p-6 border-b border-slate-800 flex items-center">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center mr-3 shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight leading-none">CDSS</h1>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Super Admin</p>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Link href="/admin" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
              <LayoutDashboard className="w-5 h-5 mr-3 text-slate-400" />
              Platform Overview
            </Link>
            <Link href="/admin/organizations" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
              <Building2 className="w-5 h-5 mr-3 text-slate-400" />
              Organizations
            </Link>
            <Link href="/admin/users" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
              <Users className="w-5 h-5 mr-3 text-slate-400" />
              Global Users
            </Link>
            <Link href="/admin/system" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
              <Server className="w-5 h-5 mr-3 text-slate-400" />
              System Health
            </Link>
            <Link href="/admin/recycle-bin" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
              <Trash2 className="w-5 h-5 mr-3 text-slate-400" />
              Recycle Bin
            </Link>
            <Link href="/admin/settings" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
              <Settings className="w-5 h-5 mr-3 text-slate-400" />
              Settings
            </Link>
          </nav>
          
          <div className="p-4 border-t border-slate-800">
            <AdminLogoutButton />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 bg-slate-900">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
