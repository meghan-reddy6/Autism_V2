"use client";

import { AlertTriangle, BrainCircuit, Calendar, FileText, Activity, Stethoscope, User, AlertCircle, FilePlus, Phone, MapPin } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  }).format(date);
}

export default function AssessmentResult() {
  const params = useParams();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchReport() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const res = await fetch(`http://localhost:8000/api/reports/${reportId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }
        
        if (!res.ok) throw new Error("Report not found");
        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError("Could not load the assessment report.");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-blue-600 rounded-full animate-bounce mb-4"></div>
          <p className="text-slate-500 font-medium">Generating Pre-Assessment Report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Report</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const mlMetadata = report.mlRiskMetadata || {};
  const symptoms = report.symptoms || [];
  const patient = report.patient || {};
  
  const ageMonths = patient.dateOfBirth ? 
    Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : 
    "N/A";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 print:bg-white print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
        
        {/* Header - Print Friendly */}
        <div className="border-b border-slate-200 bg-slate-50 p-8 print:bg-white print:px-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-flex items-center justify-center p-2 bg-blue-100 rounded-lg mb-4 print:hidden">
                <FilePlus className="h-6 w-6 text-blue-700" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clinical Pre-Assessment Report</h1>
              <p className="text-slate-500 mt-2 font-medium flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDate(report.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 font-mono">Report ID: {report.id.substring(0, 8)}</p>
              <button 
                onClick={handlePrint}
                className="mt-4 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors print:hidden"
              >
                Print Report
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-10 print:px-0">
          
          {/* Patient Details */}
          <section>
            <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
              <User className="mr-2 h-5 w-5 text-slate-400" /> Patient Demographics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl print:bg-white print:border print:border-slate-200">
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Patient Name</p>
                  <p className="text-slate-900 font-medium mt-1 text-lg">{patient.firstName} {patient.lastName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Date of Birth</p>
                  <p className="text-slate-900 font-medium mt-1">{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Age</p>
                  <p className="text-slate-900 font-medium mt-1">{ageMonths} Months</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Gender</p>
                  <p className="text-slate-900 font-medium mt-1">{patient.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Patient ID</p>
                  <p className="text-slate-900 font-medium mt-1 font-mono text-xs">{patient.id?.substring(0, 8)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 bg-slate-50 p-5 rounded-xl print:bg-white print:border print:border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Parent / Guardian</p>
                  <p className="text-slate-900 font-medium mt-1">{patient.parentName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Contact Number</p>
                  <p className="text-slate-900 font-medium mt-1 flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-slate-400" />
                    {patient.contactNumber || 'Not provided'}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Attending Clinician</p>
                  <p className="text-slate-900 font-medium mt-1">{report.author?.email || report.authorId}</p>
                </div>
              </div>
            </div>
          </section>

          {/* History & Symptoms */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
                  <FileText className="mr-2 h-5 w-5 text-slate-400" /> Medical History
                </h2>
                <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {report.medicalHistory || "No medical history provided during intake."}
                </p>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
                  <FileText className="mr-2 h-5 w-5 text-slate-400" /> Lifestyle & Environment
                </h2>
                <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {report.lifestyleInfo || "No lifestyle information provided during intake."}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
                <Stethoscope className="mr-2 h-5 w-5 text-slate-400" /> Reported Symptoms
              </h2>
              {symptoms.length > 0 ? (
                <ul className="space-y-3">
                  {symptoms.map((s: any, idx: number) => (
                    <li key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100 print:bg-white print:border-slate-200">
                      <p className="font-semibold text-slate-800">{s.symptom}</p>
                      <div className="flex text-xs text-slate-500 mt-2 space-x-4">
                        <span><strong className="text-slate-600">Duration:</strong> {s.duration}</span>
                        <span><strong className="text-slate-600">Severity:</strong> {s.severity}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm italic">No symptoms explicitly recorded.</p>
              )}
            </div>
          </section>

          {/* Clinical Scores & ML Insights */}
          <section>
            <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
              <Activity className="mr-2 h-5 w-5 text-slate-400" /> Preliminary Scoring ({report.scaleType})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-semibold text-slate-800">Deterministic Score</h3>
                  <AlertTriangle className="text-orange-500 h-5 w-5" />
                </div>
                <div className="text-4xl font-black text-slate-900 mb-2">{report.totalScore}</div>
                <p className="text-xs text-slate-500 mt-2">
                  Total raw score summed from intake observations based on the {report.scaleType} scale.
                </p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm print:bg-white print:border-slate-200 print:shadow-none">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-semibold text-blue-900 flex items-center">
                    <BrainCircuit className="mr-2 h-5 w-5 text-blue-600" />
                    Decision Support Insight
                  </h3>
                </div>
                <div className="text-2xl font-bold text-blue-950 mb-2">
                  {mlMetadata.observation || "Pending Analysis"}
                </div>
                <div className="mt-4 p-3 bg-blue-100/50 rounded-lg text-xs text-blue-800 border border-blue-200">
                  <span className="font-bold uppercase tracking-wider block mb-1">Non-Diagnostic Disclaimer</span>
                  {mlMetadata.disclaimer || "This information is intended for decision support only and does not constitute a medical diagnosis."}
                </div>
              </div>
            </div>
          </section>

          {/* Doctor's Notes (Print placeholder) */}
          <section className="pt-6 border-t border-slate-200 print:border-t-2 print:border-slate-800">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Physician Review Notes</h2>
            <div className="space-y-8">
              <div className="border-b border-slate-300 w-full h-8"></div>
              <div className="border-b border-slate-300 w-full h-8"></div>
              <div className="border-b border-slate-300 w-full h-8"></div>
              <div className="border-b border-slate-300 w-full h-8"></div>
            </div>
            
            <div className="mt-12 flex justify-between items-end">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Physician Signature</p>
                <div className="border-b border-slate-400 w-64 h-8"></div>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Date</p>
                <div className="border-b border-slate-400 w-40 h-8"></div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
