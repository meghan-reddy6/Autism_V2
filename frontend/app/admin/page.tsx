"use client";

import { fetchApi } from "@/src/core/api/api-client";
import { Users, Building2, FileText, Activity, AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AdminDashboard() {
  const { data: stats, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: async () => {
      return fetchApi("/admin/analytics");
    }
  });

  const error = queryError ? (queryError as Error).message : "";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-rose-950 border border-rose-900 rounded-xl p-6 flex items-start">
          <AlertCircle className="w-6 h-6 text-rose-500 mr-3 shrink-0" />
          <div>
            <h3 className="font-bold text-rose-400 text-lg">Error Loading Analytics</h3>
            <p className="text-rose-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Organizations",
      value: stats?.totalTenants || 0,
      icon: <Building2 className="w-8 h-8 text-indigo-400" />,
      bg: "bg-indigo-950/50",
      border: "border-indigo-900/50"
    },
    {
      title: "Registered Users",
      value: stats?.totalUsers || 0,
      icon: <Users className="w-8 h-8 text-blue-400" />,
      bg: "bg-blue-950/50",
      border: "border-blue-900/50"
    },
    {
      title: "Total Patients",
      value: stats?.totalPatients || 0,
      icon: <Activity className="w-8 h-8 text-emerald-400" />,
      bg: "bg-emerald-950/50",
      border: "border-emerald-900/50"
    },
    {
      title: "Assessments Processed",
      value: stats?.totalAssessments || 0,
      icon: <FileText className="w-8 h-8 text-purple-400" />,
      bg: "bg-purple-950/50",
      border: "border-purple-900/50"
    }
  ];

  return (
    <div className="p-8">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Platform Overview</h1>
        <p className="text-slate-400 mt-2">Monitor global platform usage and organization metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className={`rounded-2xl border p-6 ${stat.bg} ${stat.border} shadow-lg relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              {stat.icon}
            </div>
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</p>
            <p className="text-4xl font-black text-white mt-4">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
