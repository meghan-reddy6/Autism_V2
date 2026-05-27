"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { User, Calendar, Activity, AlertCircle, ArrowLeft, Clock, History } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

export default function PatientTimeline() {
  const params = useParams();
  const patientId = params.id as string;
  
  const [data, setData] = useState<{ patient: any, reports: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPatientData() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const res = await fetch(`http://localhost:8000/api/patients/${patientId}/reports`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }
        
        if (!res.ok) throw new Error("Failed to load patient history");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError("Could not load the patient timeline.");
      } finally {
        setLoading(false);
      }
    }
    fetchPatientData();
  }, [patientId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-500 font-medium flex items-center">
          <History className="h-6 w-6 animate-spin mr-3" />
          Loading Patient History...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
          <p className="text-slate-600">{error}</p>
          <Link href="/dashboard" className="mt-6 inline-block text-blue-600 font-medium">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const { patient, reports } = data;

  const firstName = patient.firstName || "Unknown";
  const lastName = patient.lastName || "Patient";

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        
        {/* Patient Profile Header */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 mb-10 flex items-center">
          <div className="h-16 w-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mr-6 text-2xl font-bold">
            {firstName[0]}{lastName[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{firstName} {lastName}</h1>
            <p className="text-slate-500 mt-1 font-medium text-sm flex gap-4">
              <span><strong>DOB:</strong> {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
              <span><strong>Gender:</strong> {patient.gender || 'N/A'}</span>
              <span><strong>Parent:</strong> {patient.parentName || 'N/A'}</span>
            </p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <History className="h-6 w-6 text-slate-400 mr-2" />
          Clinical Assessment Timeline
        </h2>

        {reports.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">
            No assessments found for this patient.
          </div>
        ) : (
          <div className="relative border-l border-slate-200 ml-4 space-y-8 pb-12">
            {reports.map((report: any, index: number) => {
              const observation = report.mlRiskMetadata?.observation || "Pending";
              const isElevated = observation.toLowerCase().includes("elevated");
              
              return (
                <div key={report.id} className="relative pl-8">
                  {/* Timeline dot */}
                  <span className={cn(
                    "absolute -left-[9px] top-1 h-4 w-4 rounded-full ring-4 ring-[#F8FAFC]",
                    index === 0 ? "bg-blue-600" : "bg-slate-300"
                  )} />
                  
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                      <div className="flex items-center text-slate-500 text-sm font-medium">
                        <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                        {formatDate(report.createdAt)}
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-semibold flex w-fit items-center",
                        isElevated ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {observation}
                      </span>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">{report.scaleType} Assessment</h3>
                      <p className="text-slate-600 mt-1 text-sm">
                        Administered by {report.author?.email || report.authorId}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Deterministic Score</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{report.totalScore}</p>
                      </div>
                      <Link href={`/assessments/${report.id}`}>
                        <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                          View Full Report
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
