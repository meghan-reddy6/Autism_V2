"use client";

import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/src/core/api/api-client";
import { ArrowLeft, Building2, Users, FileText, HardDrive, Activity, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const { data: org, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['adminOrganizationDetails', params.id],
    queryFn: async () => {
      return fetchApi(`/admin/organizations/${params.id}`);
    },
    enabled: !!params.id
  });

  const error = queryError ? (queryError as Error).message : "";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="p-8">
        <button onClick={() => router.push('/admin/organizations')} className="text-slate-400 hover:text-white flex items-center mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Organizations
        </button>
        <div className="bg-rose-950 border border-rose-900 rounded-xl p-6 text-rose-400">
          {error || "Organization not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <button onClick={() => router.push('/admin/organizations')} className="text-slate-400 hover:text-white flex items-center mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Organizations
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-blue-900/30 text-blue-500 rounded-xl flex items-center justify-center border border-blue-800/50 mr-6">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{org.name}</h1>
              <div className="flex items-center mt-2 space-x-4">
                <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded border border-slate-700">
                  {org.subscriptionTier} Tier
                </span>
                <span className={`text-xs px-2.5 py-1 rounded border flex items-center ${org.status === 'ACTIVE' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50' : 'bg-rose-950/50 text-rose-400 border-rose-900/50'}`}>
                  {org.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                  {org.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
             <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700">
               Edit Configuration
             </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Staff Members</h3>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-white">{org.users.length}</p>
          <p className="text-xs text-slate-500 mt-2">Max Limit: {org.maxUsers}</p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Total Patients</h3>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">{org.metrics.totalPatients}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Assessments</h3>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{org.metrics.totalAssessments}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Storage Config</h3>
            <HardDrive className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-white">{org.maxStorageGB} GB</p>
          <p className="text-xs text-slate-500 mt-2">Allocated Capacity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users Table */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-white mb-4">Staff Roster</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {org.users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No staff members assigned to this organization.</td>
                    </tr>
                  ) : org.users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{user.firstName} {user.lastName}</div>
                        <div className="text-slate-500 text-xs mt-1">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center text-xs ${user.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {user.isActive ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <span className="w-2 h-2 rounded-full bg-slate-500 mr-2" />}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit Logs Feed */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="space-y-6">
              {org.recentActivity.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4">No recent activity</div>
              ) : org.recentActivity.map((log: any) => (
                <div key={log.id} className="relative pl-6 border-l-2 border-slate-800 pb-2 last:pb-0 last:border-transparent">
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1 border-4 border-slate-900"></div>
                  <p className="text-sm font-medium text-white">{log.action}</p>
                  <p className="text-xs text-slate-400 mt-1">By {log.user?.email || 'System'}</p>
                  <p className="text-xs text-slate-600 mt-1">{formatTimeAgo(log.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
