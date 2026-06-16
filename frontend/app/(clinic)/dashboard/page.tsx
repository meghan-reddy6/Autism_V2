"use client"
import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/Card"
import { Badge } from "@/shared/ui/Badge"
import { Activity, Users, FileText, AlertCircle } from "lucide-react"
import { fetchApi } from "@/lib/api-client"
import { formatDateTime } from "@/lib/tailwindClasses"

export default function ClinicDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => fetchApi('/dashboard/stats')
  });

  const stats = React.useMemo(() => {
    if (!data) return {
      summary: [
        { title: "Total Active Patients", value: "-", icon: Users, alert: false },
        { title: "Pending Assessments", value: "-", icon: FileText, alert: false },
        { title: "High-Risk Alerts", value: "-", icon: AlertCircle, alert: false },
        { title: "Weekly Consultations", value: "-", icon: Activity, alert: false },
      ],
      recent_activity: []
    };
    
    const icons = [Users, FileText, AlertCircle, Activity];
    return {
      ...data,
      summary: data.summary?.map((s: any, idx: number) => ({
        ...s,
        icon: icons[idx]
      })) || []
    };
  }, [data]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-rose-500">Failed to load dashboard: {(error as Error).message}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clinic Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here's what's happening today.</p>
      </div>
      
      {/* Summary Widgets */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.summary.map((stat: any, idx: number) => (
          <Card key={idx} className={stat.alert ? "border-rose-200 shadow-rose-100" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.alert ? "text-rose-500" : "text-indigo-600"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <p className={`text-xs mt-1 font-medium ${stat.alert ? "text-rose-600" : "text-emerald-600"}`}>
                {stat.trend && `${stat.trend} from last week`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Clinical Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recent_activity.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">No recent activity.</p>
            ) : (
              <div className="space-y-6">
                {stats.recent_activity.map((activity: any) => (
                  <div key={activity.id} className="flex items-start space-x-4">
                    <div className={`w-2 h-2 mt-2 rounded-full ${activity.type === 'Assessment' ? 'bg-indigo-500' : activity.type === 'Note' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-slate-900">{activity.patient}</p>
                      <p className="text-sm text-slate-500">{activity.action}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className="text-xs text-slate-400">{formatDateTime(activity.time)}</span>
                      {activity.risk && (
                        <Badge variant={activity.risk === "High" ? "destructive" : "success"}>
                          {activity.risk} Risk
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* CDSS Quick Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>CDSS Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.summary[2].value !== "0" && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center space-x-2 text-amber-800 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-semibold text-sm">Action Required</span>
                  </div>
                  <p className="text-sm text-amber-700">{stats.summary[2].value} patients require immediate follow-up based on their recent trajectory forecast.</p>
                </div>
              )}
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <h4 className="font-semibold text-sm text-indigo-900 mb-1">System Update</h4>
                <p className="text-sm text-indigo-700">The new SHAP Explainable AI model is now active for all CARS assessments.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
