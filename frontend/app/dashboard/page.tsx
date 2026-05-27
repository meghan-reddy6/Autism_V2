"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Search, Calendar, User, FileText, ArrowRight, PlusCircle, AlertCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export default function Dashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchReports() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/login";
          return;
        }
        
        const res = await fetch("http://localhost:8000/api/reports", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }
        
        if (!res.ok) throw new Error("Failed to load reports");
        const data = await res.json();
        setReports(data);
      } catch (err) {
        setError("Could not load the clinical dashboard.");
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => {
    const patientName = `${r.patient?.firstName || ''} ${r.patient?.lastName || ''}`.toLowerCase();
    return patientName.includes(search.toLowerCase()) ||
           (r.scaleType).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center">
              <Activity className="h-8 w-8 text-blue-600 mr-3" />
              Clinical Dashboard
            </h1>
            <p className="text-slate-500 mt-2">Manage pre-assessments and patient timelines.</p>
          </div>
          <Link href="/assessments/new">
            <button className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <PlusCircle className="h-5 w-5 mr-2" />
              New Pre-Assessment
            </button>
          </Link>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Recent Reports</h2>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search patient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Age (Months)</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Scale</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Loading reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No clinical reports found.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const observation = report.mlRiskMetadata?.observation || "Pending";
                    const isElevated = observation.toLowerCase().includes("elevated");
                    const ageMonths = report.patient?.dateOfBirth ? 
                      Math.floor((new Date().getTime() - new Date(report.patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : 
                      "N/A";
                    
                    const firstName = report.patient?.firstName || "Unknown";
                    const lastName = report.patient?.lastName || "Patient";
                    
                    return (
                      <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/patients/${report.patientId}`} className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs mr-3">
                              {firstName[0]}{lastName[0]}
                            </div>
                            {firstName} {lastName}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-600">
                          {ageMonths}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">
                            {report.scaleType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-semibold flex w-fit items-center",
                            isElevated ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", isElevated ? "bg-orange-500" : "bg-emerald-500")} />
                            {observation}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap flex items-center text-slate-500">
                          <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link href={`/assessments/${report.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm mr-4 inline-flex items-center">
                            View Report
                          </Link>
                          <Link href={`/patients/${report.patientId}`} className="text-slate-500 hover:text-slate-800 font-medium text-sm inline-flex items-center">
                            Timeline <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
