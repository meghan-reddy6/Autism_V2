"use client";

import { AlertTriangle, BrainCircuit } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

function AssessmentResultContent() {
  const searchParams = useSearchParams();
  const score = searchParams.get("score") || "0";
  const mlResult = searchParams.get("ml") || "Pending Analysis";

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Assessment Report
          </h1>
          <p className="text-slate-500 mt-2">
            Patient ID: PAT-8492 • CARS Scale
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 border-l-4 border-l-orange-500 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Clinical Score
            </h2>
            <AlertTriangle className="text-orange-500 h-6 w-6" />
          </div>
          <div className="text-5xl font-black text-slate-900 mb-2">{score}</div>
          <p className="text-sm text-slate-600 mt-4">
            Total summed deterministic score from the clinical instrument.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 border-l-4 border-l-blue-500 bg-slate-900 text-white shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center">
              <BrainCircuit className="mr-2 h-5 w-5 text-blue-400" />
              ML Decision Support
            </h2>
          </div>
          <div className="text-3xl font-bold text-white mb-2">{mlResult}</div>
          <p className="text-sm text-slate-400 mt-6">
            Inference processed via decoupled ML service.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentResult() {
  return (
    <Suspense fallback={<div>Loading Results...</div>}>
      <AssessmentResultContent />
    </Suspense>
  );
}
