import React from 'react';
import { BrainCircuit } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

export function DiagnosticRadar({ chartData }: { chartData: any[] }) {
  const maxDomain = chartData && chartData.length > 0 
    ? Math.max(...chartData.map(d => d.fullMark || 10)) 
    : 10;

  return (
    <section className="break-inside-avoid print:mt-10">
      <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
      <BrainCircuit className="mr-2 h-5 w-5 text-slate-400" /> Diagnostic Domains (Visual Analysis)
      </h2>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm print:shadow-none print:border-slate-300 flex flex-col md:flex-row items-center gap-8">
      <div className="w-full md:w-1/2 min-h-[350px]">
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="domain" tick={{ fill: '#475569', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, maxDomain]} />
                <Tooltip />
                <Radar name="Score" dataKey="score" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex items-center justify-center h-[350px] bg-slate-50 text-slate-500 text-sm rounded-lg border border-dashed border-slate-200">
               No domain data available to chart.
             </div>
          )}
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
