"use client"
import * as React from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { AlertCircle, Brain, X, CheckCircle } from "lucide-react"

interface CDSSModalProps {
  assessment: {
    id: string;
    scaleType: string;
    totalScore: number;
    predictedRisk: string;
    confidence: number;
    shapValues: Record<string, number>;
    trajectory: any[];
  }
  onClose: () => void;
}

export function CDSSModal({ assessment, onClose }: CDSSModalProps) {
  // Format SHAP data for Recharts
  const shapData = Object.entries(assessment.shapValues)
    .map(([name, value]) => ({ name: name.replace("_", " "), importance: value }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5) // Top 5 features

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Explainable AI (SHAP) Analysis</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Risk Summary */}
            <Card className="md:col-span-1 bg-indigo-50/50 border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-indigo-900 text-sm">Prediction Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-indigo-700 font-medium mb-1">Scale Used</div>
                  <div className="text-lg font-bold text-slate-900">{assessment.scaleType} (Score: {assessment.totalScore})</div>
                </div>
                <div>
                  <div className="text-xs text-indigo-700 font-medium mb-1">Predicted Risk Level</div>
                  <Badge variant={assessment.predictedRisk === "High" ? "destructive" : "success"} className="text-sm px-3 py-1">
                    {assessment.predictedRisk} Risk
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-indigo-700 font-medium mb-1">AI Confidence</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 bg-indigo-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600" style={{ width: `${assessment.confidence * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-indigo-900">{(assessment.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Importance (SHAP) */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Top Contributing Factors (SHAP Values)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={shapData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={120} />
                      <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Importance']}
                      />
                      <Bar dataKey="importance" radius={[0, 4, 4, 0]} barSize={20}>
                        {shapData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
          </div>
          
          {/* CDSS Recommendations */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">CDSS Recommendations</h3>
            <div className="grid gap-3">
              {assessment.predictedRisk === "High" ? (
                <>
                  <div className="p-4 border border-rose-200 bg-rose-50 rounded-xl flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-rose-900">Immediate Behavioral Therapy (ABA)</h4>
                      <p className="text-sm text-rose-700 mt-1">Based on the elevated CARS score and specific domain flags, an urgent referral to ABA therapy is recommended.</p>
                    </div>
                  </div>
                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900">Speech-Language Evaluation</h4>
                      <p className="text-sm text-amber-700 mt-1">Communication deficit flagged as a top 2 contributing factor. Schedule SLP evaluation.</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-emerald-900">Routine Monitoring</h4>
                    <p className="text-sm text-emerald-700 mt-1">Continue standard developmental monitoring. No immediate critical interventions flagged.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <Button onClick={onClose} variant="outline" className="mr-3">Close</Button>
          <Button>Approve to Treatment Plan</Button>
        </div>
      </div>
    </div>
  )
}
