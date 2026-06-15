"use client";

import { AlertTriangle, BrainCircuit, Calendar, FileText, Activity, Stethoscope, User, AlertCircle, FilePlus, Phone, MapPin, CheckCircle2, XCircle, Clock, Play, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useRef } from "react";
import { useAuthStore } from "@/lib/store";
import { fetchApi } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/tailwindClasses";

import { SCALES } from "@/features/assessments/logic/assessmentScales";
import { generateChartData, formatShapData, formatAge, getMaxScore } from "@/features/assessments/logic/assessmentScoreCalculator";
import { useAssessmentSession } from "@/features/assessments/hooks/useAssessmentSession";
import { PreliminaryScoring, DiagnosticRadar } from "@/features/assessments/components/AssessmentVisuals";

export default function AssessmentResult() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  
  const { user } = useAuthStore();
  const isDoctor = user?.role ? ["SUPER_ADMIN", "ORG_ADMIN", "DOCTOR"].includes(user.role) : false;

  const {
    session,
    loading,
    error,
    submittingFeedback,
    feedbackSuccess,
    triggerScoring,
    submitFeedback
  } = useAssessmentSession(sessionId, isDoctor);

  const [feedbackNotes, setFeedbackNotes] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-blue-600 rounded-full animate-bounce mb-4"></div>
          <p className="text-slate-500 font-medium">Loading Session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Session</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const parseJson = (val: any, fallback: any) => {
    if (!val) return fallback;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return fallback; }
    }
    return val;
  };

  const patient = session.patient || {};
  const scaleType = session.scaleType || "UNKNOWN";
  
  const itemScores: any = {};
  if (session.responses) {
      session.responses.forEach((r: any) => {
          itemScores[r.fieldName] = r.value;
      });
  }

  const generatedReport = session.reports && session.reports.length > 0 ? session.reports[0] : null;
  const mlSections = generatedReport ? parseJson(generatedReport.sections, {}) : null;

  const totalScore = mlSections?.totalScore;
  const predictedRisk = mlSections?.predictedRisk;
  const confidence = mlSections?.confidence;
  const shapValues = mlSections?.shapValues || {};

  const ageFormatted = formatAge(patient.dateOfBirth);
  const maxScore = getMaxScore(scaleType);
  const chartData = generateChartData(itemScores, scaleType);
  const shapData = formatShapData(shapValues);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 print:bg-white print:py-0 print:px-0">
      <div ref={reportRef} className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
        
        {/* Header */}
        <div className="border-b border-slate-200 bg-slate-50 p-8 print:bg-white print:px-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-flex items-center justify-center p-2 bg-blue-100 rounded-lg mb-4 print:hidden">
                <FilePlus className="h-6 w-6 text-blue-700" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assessment Session</h1>
              <p className="text-slate-500 mt-2 font-medium flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDateTime(session.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 font-mono">Session ID: {session.id.substring(0, 8)}</p>
              <div className="flex justify-end gap-2 mt-4 print:hidden">
                <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
                  Print
                </button>
                {isDoctor && (
                  <button onClick={async () => {
                      if(confirm("Are you sure you want to delete this clinical report?")) {
                        try {
                          await fetchApi(`/assessment-sessions/${session.id}`, { method: 'DELETE' });
                          router.push('/assessments');
                        } catch(e) { alert("Failed to delete report."); }
                      }
                    }} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-10 print:px-0">
          
          <section>
            <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
              <User className="mr-2 h-5 w-5 text-slate-400" /> Patient Demographics
            </h2>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl print:bg-white print:border print:border-slate-200">
              <div className="col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Patient Name</p>
                <p className="text-slate-900 font-medium mt-1 text-lg">{patient.firstName} {patient.lastName}</p>
              </div>
              <div><p className="text-xs font-semibold text-slate-500 uppercase">Date of Birth</p><p className="text-slate-900 font-medium mt-1">{formatDate(patient.dateOfBirth)}</p></div>
              <div><p className="text-xs font-semibold text-slate-500 uppercase">Age</p><p className="text-slate-900 font-medium mt-1">{ageFormatted}</p></div>
              <div><p className="text-xs font-semibold text-slate-500 uppercase">Gender</p><p className="text-slate-900 font-medium mt-1">{patient.gender || 'N/A'}</p></div>
              <div><p className="text-xs font-semibold text-slate-500 uppercase">Patient ID</p><p className="text-slate-900 font-medium mt-1 font-mono text-xs">{patient.id?.substring(0, 8)}</p></div>
            </div>
          </section>

          {!generatedReport && isDoctor && (
              <section className="bg-indigo-50 rounded-xl p-8 text-center border border-indigo-100 print:hidden">
                  <BrainCircuit className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-indigo-900 mb-2">Run Clinical Decision Support</h3>
                  <p className="text-indigo-700 max-w-md mx-auto mb-6">Run the ML-powered scoring model to generate risk predictions and SHAP explainability insights.</p>
                  <button onClick={triggerScoring} className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                      <Play className="w-4 h-4 mr-2 fill-current" /> Generate ML Score & Report
                  </button>
              </section>
          )}

          {generatedReport && (
              <>
                  <PreliminaryScoring scaleType={scaleType} totalScore={totalScore} maxScore={maxScore} predictedRisk={predictedRisk} confidence={confidence} shapData={shapData} />
                  <DiagnosticRadar chartData={chartData} />
              </>
          )}

          {scaleType && SCALES[scaleType as keyof typeof SCALES] && isDoctor && (
            <section className="mt-8 break-inside-avoid">
              <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
                <Activity className="mr-2 h-5 w-5 text-slate-400" /> Submitted Responses
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm print:border-none print:shadow-none">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                    <tr><th className="py-3 px-4 font-semibold text-slate-700">Observation / Question</th><th className="py-3 px-4 font-semibold text-slate-700 w-32 text-center">Value</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {SCALES[scaleType as keyof typeof SCALES].questions.map(q => (
                      <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800">{q.label}</td>
                        <td className="py-3 px-4 text-center font-bold text-blue-600">{itemScores[q.id] !== undefined ? itemScores[q.id] : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {generatedReport && (
            <section className="mt-12 pt-8 border-t border-slate-200 break-inside-avoid print:mt-10 print:pt-6 print:border-t-2 print:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 flex items-center mb-6"><Stethoscope className="mr-2 h-6 w-6 text-slate-500" /> Clinical Notes & Final Approval</h2>
              {session.status === "APPROVED" || feedbackSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center print:border-none print:p-0 print:text-left">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4 print:hidden" />
                  <h3 className="text-xl font-bold text-emerald-900 mb-2">Assessment Approved</h3>
                  <p className="text-emerald-700">This assessment has been reviewed and finalized by the clinician.</p>
                  {feedbackNotes && (
                    <div className="mt-6 text-left bg-white p-6 rounded-lg border border-emerald-100 print:bg-transparent print:border-slate-300 print:mt-4 print:p-4">
                      <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Clinical Notes</h4><p className="text-slate-800 whitespace-pre-wrap">{feedbackNotes}</p>
                    </div>
                  )}
                </div>
              ) : isDoctor ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm print:hidden">
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Final Clinical Impressions & Recommendations</label>
                    <textarea value={feedbackNotes} onChange={(e) => setFeedbackNotes(e.target.value)} rows={5} placeholder="Enter clinical notes..." className="w-full rounded-lg border-slate-300 border p-4 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" />
                  </div>
                  <div className="flex justify-end gap-4">
                    <button onClick={() => submitFeedback(generatedReport.id, feedbackNotes)} disabled={submittingFeedback} className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center shadow-sm">
                      {submittingFeedback ? "Processing..." : <><CheckCircle2 className="w-5 h-5 mr-2" />Finalize & Approve Assessment</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center print:hidden"><AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" /><p className="text-slate-600">This assessment requires Doctor or Psychologist review.</p></div>
              )}
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
