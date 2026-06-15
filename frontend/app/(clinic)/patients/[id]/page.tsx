"use client"
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/Card"
import { Badge } from "@/shared/ui/Badge"
import { Button } from "@/shared/ui/Button"
import { CDSSModal } from "@/features/patients/components/CDSSModal"
import { FileText, Calendar, Activity, Clock, Plus } from "lucide-react"
import { fetchApi } from "@/lib/api-client"

import { formatDate, formatDateTime } from "@/lib/tailwindClasses"

export default function PatientView({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = React.useState("assessments")
  const [selectedAssessment, setSelectedAssessment] = React.useState<any | null>(null)
  
  const [patient, setPatient] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadPatient() {
      try {
        const data = await fetchApi(`/patients/${params.id}`);
        // Calculate age
        const dob = new Date(data.dateOfBirth);
        const ageDiffMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDiffMs);
        const years = Math.abs(ageDate.getUTCFullYear() - 1970);
        data.age = `${years} yrs`;
        
        setPatient(data);
      } catch (e) {
        console.error("Failed to load patient", e);
      } finally {
        setLoading(false);
      }
    }
    loadPatient();
  }, [params.id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading patient record...</div>;
  }

  if (!patient) {
    return <div className="p-8 text-center text-rose-500">Patient not found or unauthorized.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex items-center space-x-3 mt-1 text-sm text-slate-500 font-medium">
              <span>{patient.mrn}</span>
              <span>&bull;</span>
              <span>{patient.age} ({formatDate(patient.dateOfBirth)})</span>
              <span>&bull;</span>
              <span>{patient.gender}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline"><Calendar className="w-4 h-4 mr-2" /> Book Appt</Button>
          <Button><Plus className="w-4 h-4 mr-2" /> New Assessment</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Demographics & Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Demographics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-slate-500 font-medium mb-1">Guardian</div>
                <div className="text-slate-900">{patient.guardianName || "Not provided"}</div>
              </div>
              <div>
                <div className="text-slate-500 font-medium mb-1">Contact</div>
                <div className="text-slate-900">{patient.guardianPhone || "Not provided"}</div>
              </div>
              <div>
                <div className="text-slate-500 font-medium mb-1">Insurance</div>
                <div className="text-slate-900">{patient.insuranceProvider ? `${patient.insuranceProvider} (Grp: ${patient.insurancePolicyId || 'N/A'})` : "Not provided"}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Active Treatment Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 mr-2 shrink-0"/>Weekly ABA Therapy</li>
                <li className="flex items-start"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 mr-2 shrink-0"/>Bi-weekly Speech Therapy</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Clinical Data (Tabs) */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-max">
            <button 
              onClick={() => setActiveTab('assessments')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'assessments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Assessments & CDSS
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'notes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Clinical Notes
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Timeline
            </button>
          </div>

          {activeTab === 'assessments' && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {patient.assessments?.map((assessment: any) => (
                    <div key={assessment.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{assessment.scaleType} Assessment</h4>
                          <p className="text-sm text-slate-500 mt-0.5">{formatDateTime(assessment.createdAt)} &bull; Score: {assessment.totalScore}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant={assessment.predictedRisk === "High" ? "destructive" : "success"}>
                          {assessment.predictedRisk} Risk
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => setSelectedAssessment(assessment)}>
                          View AI Analysis
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'notes' && (
            <Card>
              <CardContent className="p-6 text-center text-slate-500 py-12">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p>No clinical notes found for this patient.</p>
                <Button variant="outline" className="mt-4">Add SOAP Note</Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'history' && (
            <Card>
              <CardContent className="p-6 text-center text-slate-500 py-12">
                <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p>Historical timeline view.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {selectedAssessment && (
        <CDSSModal 
          assessment={selectedAssessment} 
          onClose={() => setSelectedAssessment(null)} 
        />
      )}
    </div>
  )
}
