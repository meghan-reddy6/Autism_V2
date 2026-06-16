"use client"
import React from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/Card"
import { Badge } from "@/shared/ui/Badge"
import { fetchApi } from "@/lib/api-client"
import { FileText, Search, Filter, Loader2, ArrowRight } from "lucide-react"
import { useAuthStore } from "@/lib/store"
import { formatDate } from "@/lib/tailwindClasses"

export default function AllAssessmentsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const isDoctor = user?.role ? ["SUPER_ADMIN", "ORG_ADMIN", "DOCTOR"].includes(user.role) : false;
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")

  const { data: assessments = [], isLoading: loading, error } = useQuery({
    queryKey: ['assessments', statusFilter],
    queryFn: () => {
      const endpoint = statusFilter === "ALL" 
        ? '/assessment-sessions' 
        : `/assessment-sessions?status=${statusFilter}`
      return fetchApi(endpoint)
    }
  });

  const errorMessage = error ? (error as Error).message : "";

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "High":
      case "Very High":
        return "destructive"
      case "Moderate":
        return "warning" // assumes warning variant exists, if not use default
      case "Low":
        return "success"
      default:
        return "default"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">All Assessments</h1>
          <p className="text-slate-500 mt-1">Review clinical assessments and CDSS predictions across your roster.</p>
        </div>
        <button 
          onClick={() => router.push('/assessments/new')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <FileText className="w-4 h-4 mr-2" />
          New Assessment
        </button>
      </div>

      <div className="flex border-b border-slate-200 space-x-6">
        {["ALL", "CREATED", "SUBMITTED", "UNDER_REVIEW", "APPROVED"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              statusFilter === status 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {status.replace("_", " ")}
          </button>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by patient name or ID..." 
              className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>
          <button className="flex items-center px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
              <p>Loading assessment records...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-8 text-center text-rose-500">
              <p>{errorMessage}</p>
            </div>
          ) : assessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <FileText className="w-12 h-12 mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No assessments found</h3>
              <p className="max-w-sm text-center">There are no assessment records in the system yet. Start by creating a new assessment.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Scale Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Score</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">CDSS Risk</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assessments.map((assessment: any) => (
                  <tr 
                    key={assessment.id} 
                    onClick={() => router.push(`/assessments/${assessment.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{assessment.patient?.firstName} {assessment.patient?.lastName}</div>
                      <div className="text-xs text-slate-500">DOB: {formatDate(assessment.patient?.dateOfBirth)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatDate(assessment.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {assessment.scaleType || "Unknown Scale"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {(() => {
                        if (!assessment.reports?.[0]) return "-";
                        let sections = assessment.reports[0].sections;
                        if (typeof sections === 'string') {
                          try { sections = JSON.parse(sections); } catch(e) { sections = {}; }
                        }
                        return sections?.totalScore ?? "-";
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        if (!assessment.reports?.[0]) {
                          return <span className="text-sm text-slate-400">Pending</span>;
                        }
                        let sections = assessment.reports[0].sections;
                        if (typeof sections === 'string') {
                          try { sections = JSON.parse(sections); } catch(e) { sections = {}; }
                        }
                        const risk = sections?.predictedRisk;
                        return (
                          <span className={`text-sm font-bold text-${getRiskColor(risk)}-600`}>
                            {risk || "Unknown"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={assessment.status === 'FINALIZED' ? 'default' : 'secondary'}>
                        {assessment.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 group-hover:text-blue-800 transition-colors flex items-center justify-end w-full">
                        View <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
