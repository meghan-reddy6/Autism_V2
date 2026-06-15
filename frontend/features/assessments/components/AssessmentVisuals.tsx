import React from 'react';
import { AlertTriangle, BrainCircuit, Activity } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

export function PreliminaryScoring({ 
  scaleType, 
  totalScore, 
  maxScore, 
  predictedRisk, 
  confidence, 
  shapData 
}: any) {
  return (
    <section className="break-inside-avoid print:mt-10">
      <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
      <Activity className="mr-2 h-5 w-5 text-slate-400" /> Preliminary Scoring ({scaleType})
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
          <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-semibold text-slate-800">Deterministic Score</h3>
          <AlertTriangle className="text-orange-500 h-5 w-5" />
          </div>
          <div className="text-4xl font-black text-slate-900 mb-2">
          {totalScore} {maxScore ? <span className="text-2xl text-slate-400">/ {maxScore}</span> : ""}
          </div>
          <p className="text-xs text-slate-500 mt-2">
          Total raw score summed from intake observations based on the {scaleType} scale.
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
          {predictedRisk || "Pending Analysis"}
          </div>
          {confidence && (
          <div className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-4">
              Confidence Interval: {(confidence * 100).toFixed(1)}%
          </div>
          )}
          
          {shapData && shapData.length > 0 && (
          <div className="mt-2 border-t border-blue-100 pt-4">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3">Top Driving Factors</h4>
              <div className="h-40 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shapData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#1e3a8a', fontWeight: 600 }} width={80} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
              </ResponsiveContainer>
              </div>
          </div>
          )}
      </div>
      </div>
    </section>
  );
}

export function DiagnosticRadar({ chartData }: { chartData: any[] }) {
  return (
    <section className="break-inside-avoid print:mt-10">
      <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
      <BrainCircuit className="mr-2 h-5 w-5 text-slate-400" /> Diagnostic Domains (Visual Analysis)
      </h2>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm print:shadow-none print:border-slate-300 flex flex-col md:flex-row items-center gap-8">
      <div className="w-full md:w-1/2 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="domain" tick={{ fill: '#475569', fontSize: 12 }} />
              <PolarRadiusAxis />
              <Tooltip />
              <Radar name="Score" dataKey="score" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.5} />
          </RadarChart>
          </ResponsiveContainer>
      </div>
      <div className="w-full md:w-1/2 space-y-4">
          <h3 className="font-semibold text-slate-800">Domain Breakdown</h3>
          <p className="text-sm text-slate-600">
          This chart aggregates the raw item scores into broad clinical domains.
          </p>
      </div>
      </div>
    </section>
  );
}
