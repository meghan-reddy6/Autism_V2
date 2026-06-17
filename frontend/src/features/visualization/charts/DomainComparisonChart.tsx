import React from 'react';
import { Activity } from "lucide-react";
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

export function DomainComparisonChart({ chartData }: { chartData: any[] }) {
  const comparisonData = chartData || [];

  return (
    <section className="break-inside-avoid print:mt-10 mt-8">
      <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
      <Activity className="mr-2 h-5 w-5 text-slate-400" /> Domain Comparison (vs. Typical Baseline)
      </h2>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm print:shadow-none print:border-slate-300">
        <p className="text-sm text-slate-600 mb-6">
          This chart compares the patient's domain scores against the average neurotypical baseline score. Higher scores generally indicate higher clinical significance.
        </p>
        <div className="w-full min-h-[350px]">
          {comparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" aspect={16/9}>
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="domain" tick={{ fill: '#475569', fontSize: 11 }} interval={0} tickMargin={10} />
                <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="score" name="Patient Score" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="baseline" name="Typical Baseline" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] bg-slate-50 text-slate-500 text-sm rounded-lg border border-dashed border-slate-200">
               No domain data available for comparison.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
