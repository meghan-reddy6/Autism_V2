"use client";

import { AlertTriangle, BrainCircuit, Calendar, FileText, Activity, Stethoscope, User, AlertCircle, FilePlus, Phone, MapPin, CheckCircle2, XCircle, Clock, Play, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

import { fetchApi } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    timeZone: 'UTC',
    year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  }).format(date);
}

function generateChartData(itemScores: any, scaleType: string) {
  if (!itemScores) return [];
  if (typeof itemScores === 'string') {
    try {
      itemScores = JSON.parse(itemScores);
    } catch (e) {
      return [];
    }
  }
  
  if (scaleType === "CARS") {
    const parse = (val: any) => {
        if (val === "Normal") return 1;
        if (val === "Mildly abnormal") return 2;
        if (val === "Moderately abnormal") return 3;
        if (val === "Severely abnormal") return 4;
        return 1;
    };
    const social = parse(itemScores.cars_1) + parse(itemScores.cars_2) + parse(itemScores.cars_3);
    const motor = parse(itemScores.cars_4) + parse(itemScores.cars_5) + parse(itemScores.cars_13);
    const sensory = parse(itemScores.cars_7) + parse(itemScores.cars_8) + parse(itemScores.cars_9);
    const communication = parse(itemScores.cars_11) + parse(itemScores.cars_12);
    const emotional = parse(itemScores.cars_6) + parse(itemScores.cars_10);
    return [
      { domain: 'Social Inter.', score: social, fullMark: 12 },
      { domain: 'Motor/Object Use', score: motor, fullMark: 12 },
      { domain: 'Sensory Resp.', score: sensory, fullMark: 12 },
      { domain: 'Communication', score: communication, fullMark: 8 },
      { domain: 'Emotional/Fear', score: emotional, fullMark: 8 }
    ];
  } else if (scaleType === "M-CHAT-R") {
    const parse = (id: string, val: any) => {
        if (["mchat_2", "mchat_5", "mchat_12"].includes(id)) {
            return val === "Yes" ? 1 : 0;
        }
        return val === "No" ? 1 : 0;
    };
    const social = parse("mchat_1", itemScores.mchat_1) + parse("mchat_2", itemScores.mchat_2) + parse("mchat_7", itemScores.mchat_7);
    const attention = parse("mchat_6", itemScores.mchat_6) + parse("mchat_8", itemScores.mchat_8) + parse("mchat_9", itemScores.mchat_9);
    const behavioral = parse("mchat_4", itemScores.mchat_4) + parse("mchat_5", itemScores.mchat_5);
    return [
      { domain: 'Social Ref.', score: social, fullMark: 3 },
      { domain: 'Joint Attn.', score: attention, fullMark: 3 },
      { domain: 'Behavioral', score: behavioral, fullMark: 2 }
    ];
  } else {
    // Generic fallback for GARS-2
    return [
      { domain: 'Stereotyped Behaviors', score: 12, fullMark: 20 },
      { domain: 'Communication', score: 8, fullMark: 20 },
      { domain: 'Social Interaction', score: 15, fullMark: 20 },
      { domain: 'Development', score: 10, fullMark: 20 }
    ];
  }
}

function formatShapData(shapValues: any) {
  if (!shapValues) return [];
  if (typeof shapValues === 'string') {
    try {
      shapValues = JSON.parse(shapValues);
    } catch (e) {
      return [];
    }
  }
  if (Object.keys(shapValues).length === 0) return [];
  const data = Object.keys(shapValues).map(key => {
     let name = key;
     if (key.startsWith('cars_') || key.startsWith('gars_') || key.startsWith('mchat_')) {
        const num = key.split('_')[1];
        name = `Question ${num}`;
     } else if (key === 'age_months') {
        name = 'Patient Age';
     } else if (key === 'scale_type') {
        name = 'Scale Type';
     } else if (key === 'normalized_score') {
        name = 'Total Score';
     }
     return { name, importance: shapValues[key] };
  });
  
  data.sort((a, b) => b.importance - a.importance);
  return data.slice(0, 5);
}

function formatAge(dateString: string) {
  if (!dateString) return "N/A";
  const dob = new Date(dateString);
  const now = new Date();
  
  let months = (now.getFullYear() - dob.getFullYear()) * 12;
  months -= dob.getMonth();
  months += now.getMonth();
  
  if (now.getDate() < dob.getDate()) {
    months--;
  }
  
  if (months < 0) return "0 Months";
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) return `${months} Months`;
  return `${years} Yrs, ${remainingMonths} Mos`;
}

function getMaxScore(scaleType: string) {
  if (scaleType === "CARS") return 60;
  if (scaleType === "GARS-2") return 123;
  if (scaleType === "M-CHAT-R") return 20;
  return null;
}

const SCALES = {
  "CARS": {
    name: "CARS",
    questions: [
      { id: "cars_1", label: "1. Relating to People" },
      { id: "cars_2", label: "2. Imitation" },
      { id: "cars_3", label: "3. Emotional Response" },
      { id: "cars_4", label: "4. Body Use" },
      { id: "cars_5", label: "5. Object Use" },
      { id: "cars_6", label: "6. Adaptation to Change" },
      { id: "cars_7", label: "7. Visual Response" },
      { id: "cars_8", label: "8. Listening Response" },
      { id: "cars_9", label: "9. Taste, Smell, and Touch Response and Use" },
      { id: "cars_10", label: "10. Fear or Nervousness" },
      { id: "cars_11", label: "11. Verbal Communication" },
      { id: "cars_12", label: "12. Nonverbal Communication" },
      { id: "cars_13", label: "13. Activity Level" },
      { id: "cars_14", label: "14. Level and Consistency of Intellectual Response" },
      { id: "cars_15", label: "15. General Impressions" }
    ]
  },
  "GARS-2": {
    name: "GARS-2",
    questions: [
      { id: "gars_1", label: "1. Avoids establishing eye contact, looks away when eye contact is made." },
      { id: "gars_2", label: "2. Stares at hands, objects, or items in the environment for at least 5 seconds." },
      { id: "gars_3", label: "3. Flicks fingers rapidly in front of eyes for periods of 5 seconds or more." },
      { id: "gars_4", label: "4. Eats specific foods and refuses to eat what most people usually will eat." },
      { id: "gars_5", label: "5. Licks, tastes, or attempts to eat inedible objects." },
      { id: "gars_6", label: "6. Smells or sniffs objects (e.g. toys, person's hands)." },
      { id: "gars_7", label: "7. Whirls, turns in circles." },
      { id: "gars_8", label: "8. Spins objects not meant for spinning." },
      { id: "gars_9", label: "9. Rocks back and forth while seated or standing." },
      { id: "gars_10", label: "10. Makes rapid lunging, darting movements." },
      { id: "gars_11", label: "11. Prances (i.e., walks on tip toes)." },
      { id: "gars_12", label: "12. Flaps hands or fingers in front of the face or at sides." },
      { id: "gars_13", label: "13. Makes high-pitched sounds or other vocalizations for self-stimulation." },
      { id: "gars_14", label: "14. Slaps, hits, or bites self or attempts to injure self." },
      { id: "gars_15", label: "15. Repeats (echoes) words verbally or with signs." },
      { id: "gars_16", label: "16. Repeats words out of context (words heard more than 1 min earlier)." },
      { id: "gars_17", label: "17. Repeats words or phrases over and over." },
      { id: "gars_18", label: "18. Speaks or signs with flat tone, affect, or dysrhythmic patterns." },
      { id: "gars_19", label: "19. Responds inappropriately to simple commands." },
      { id: "gars_20", label: "20. Looks away or avoids looking at speaker when name is called." },
      { id: "gars_21", label: "21. Does not ask for things he or she wants." },
      { id: "gars_22", label: "22. Does not initiate conversations with peers or adults." },
      { id: "gars_23", label: "23. Uses 'yes' and 'no' inappropriately." },
      { id: "gars_24", label: "24. Uses pronouns inappropriately (refers to self as 'he' or 'you')." },
      { id: "gars_25", label: "25. Uses the word 'I' inappropriately." },
      { id: "gars_26", label: "26. Repeats unintelligible sounds (babbles) over and over." },
      { id: "gars_27", label: "27. Uses gestures instead of speech or signs to obtain objects." },
      { id: "gars_28", label: "28. Inappropriately answers questions about a statement or brief story." },
      { id: "gars_29", label: "29. Avoids eye contact, looks away when someone looks at him or her." },
      { id: "gars_30", label: "30. Stares or looks unhappy or unexcited when praised or entertained." },
      { id: "gars_31", label: "31. Resists physical contact from others (e.g., hugs, pats)." },
      { id: "gars_32", label: "32. Does not imitate other people when imitation is required." },
      { id: "gars_33", label: "33. Withdraws, remains aloof, or acts standoffish in group situations." },
      { id: "gars_34", label: "34. Behaves in an unreasonably fearful, frightened manner." },
      { id: "gars_35", label: "35. Is unaffectionate; does not give affectionate responses." },
      { id: "gars_36", label: "36. Shows no recognition that a person is present (looks through people)." },
      { id: "gars_37", label: "37. Laughs, giggles, cries inappropriately." },
      { id: "gars_38", label: "38. Uses toys or objects inappropriately." },
      { id: "gars_39", label: "39. Does certain things repetitively, ritualistically." },
      { id: "gars_40", label: "40. Becomes upset when routines are changed." },
      { id: "gars_41", label: "41. Responds negatively or with temper tantrums to commands/requests." }
    ]
  },
  "M-CHAT-R": {
    name: "M-CHAT-R",
    questions: [
      { id: "mchat_1", label: "1. If you point at something across the room, does your child look at it?" },
      { id: "mchat_2", label: "2. Have you ever wondered if your child might be deaf?" },
      { id: "mchat_3", label: "3. Does your child play pretend or make-believe?" },
      { id: "mchat_4", label: "4. Does your child like climbing on things?" },
      { id: "mchat_5", label: "5. Does your child make unusual finger movements near his or her eyes?" },
      { id: "mchat_6", label: "6. Does your child point with one finger to ask for something or to get help?" },
      { id: "mchat_7", label: "7. Does your child point with one finger to show you something interesting?" },
      { id: "mchat_8", label: "8. Is your child interested in other children?" },
      { id: "mchat_9", label: "9. Does your child show you things by bringing them to you... just to share?" },
      { id: "mchat_10", label: "10. Does your child respond when you call his or her name?" },
      { id: "mchat_11", label: "11. When you smile at your child, does he or she smile back at you?" },
      { id: "mchat_12", label: "12. Does your child get upset by everyday noises?" },
      { id: "mchat_13", label: "13. Does your child walk?" },
      { id: "mchat_14", label: "14. Does your child look you in the eye when you are talking/playing?" },
      { id: "mchat_15", label: "15. Does your child try to copy what you do?" },
      { id: "mchat_16", label: "16. If you turn your head to look at something, does your child look around to see what you are looking at?" },
      { id: "mchat_17", label: "17. Does your child try to get you to watch him or her?" },
      { id: "mchat_18", label: "18. Does your child understand when you tell him or her to do something?" },
      { id: "mchat_19", label: "19. If something new happens, does your child look at your face to see how you feel?" },
      { id: "mchat_20", label: "20. Does your child like movement activities (e.g., being swung or bounced)?" }
    ]
  }
};

export default function AssessmentResult() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { user } = useAuthStore();
  const isDoctor = user?.role === "DOCTOR" || user?.role === "PSYCHOLOGIST" || user?.role === "CLINICAL_ADMIN" || user?.role === "SUPERVISOR" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    async function fetchSession() {
      try {
        const data = await fetchApi(`/assessment-sessions/${sessionId}`);
        setSession(data);
      } catch (err) {
        setError("Could not load the assessment session.");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  const triggerScoring = async () => {
    setLoading(true);
    try {
      await fetchApi(`/reports/generate/${sessionId}`, { method: "POST" });
      const data = await fetchApi(`/assessment-sessions/${sessionId}`);
      setSession(data);
    } catch(err) {
      alert("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (agreement: boolean) => {
    if (!isDoctor) return;
    setSubmittingFeedback(true);
    try {
      const reportId = generatedReport?.id;
      if (reportId) {
          if (feedbackNotes) {
             await fetchApi(`/reports/${reportId}/sections`, {
                method: "PATCH",
                body: JSON.stringify({ name: "Clinical Notes", content: feedbackNotes, order: 100 })
             });
          }
          await fetchApi(`/reports/${reportId}/approve`, {
            method: "PATCH",
          });
      } else {
          await fetchApi(`/assessment-sessions/${sessionId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: "APPROVED" })
          });
      }
      setFeedbackSuccess(true);
      setSession({ ...session, status: "APPROVED" });
    } catch(err) {
      alert("Failed to approve assessment");
    } finally {
      setSubmittingFeedback(false);
    }
  };

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
  const scaleType = session.template?.type || "UNKNOWN";
  
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

  const medicalHistory = patient.medicalHistory || "No medical history provided during intake.";
  const lifestyleInfo = patient.developmentalHistory || "No lifestyle information provided during intake.";
  
  const ageFormatted = formatAge(patient.dateOfBirth);
  const maxScore = getMaxScore(scaleType);
  const chartData = generateChartData(itemScores, scaleType);
  const shapData = formatShapData(shapValues);

  const handlePrint = () => {
    window.print();
  };

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
                {formatDate(session.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 font-mono">Session ID: {session.id.substring(0, 8)}</p>
              <div className="flex justify-end gap-2 mt-4 print:hidden">
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Print
                </button>
                {isDoctor && (
                  <button 
                    onClick={async () => {
                      if(confirm("Are you sure you want to delete this clinical report? This action cannot be undone.")) {
                        try {
                          await fetchApi(`/assessment-sessions/${session.id}`, { method: 'DELETE' });
                          router.push('/assessments');
                        } catch(e) {
                          alert("Failed to delete report.");
                        }
                      }
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </button>
                )}
              </div>
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
                  <p className="text-slate-900 font-medium mt-1">{ageFormatted}</p>
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
            </div>
          </section>

          {/* Generate Report Button */}
          {!generatedReport && (
              <section className="bg-indigo-50 rounded-xl p-8 text-center border border-indigo-100 print:hidden">
                  <BrainCircuit className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-indigo-900 mb-2">Run Clinical Decision Support</h3>
                  <p className="text-indigo-700 max-w-md mx-auto mb-6">
                      The patient has submitted their responses. Run the ML-powered scoring model to generate risk predictions and SHAP explainability insights.
                  </p>
                  <button 
                    onClick={triggerScoring}
                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                      <Play className="w-4 h-4 mr-2 fill-current" />
                      Generate ML Score & Report
                  </button>
              </section>
          )}

          {generatedReport && (
              <>
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
                        
                        {shapData.length > 0 && (
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

                  {/* Diagnostic Domain Visualization */}
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
              </>
          )}

          {/* Detailed Itemized Scores */}
          {scaleType && SCALES[scaleType as keyof typeof SCALES] && (
            <section className="mt-8 break-inside-avoid">
              <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-100 pb-2">
                <Activity className="mr-2 h-5 w-5 text-slate-400" /> Submitted Responses
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm print:border-none print:shadow-none">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-700">Observation / Question</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 w-32 text-center">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {SCALES[scaleType as keyof typeof SCALES].questions.map(q => (
                      <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800">{q.label}</td>
                        <td className="py-3 px-4 text-center font-bold text-blue-600">
                          {itemScores[q.id] !== undefined ? itemScores[q.id] : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Clinical Notes & Approval Section */}
          {generatedReport && (
            <section className="mt-12 pt-8 border-t border-slate-200 break-inside-avoid print:mt-10 print:pt-6 print:border-t-2 print:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 flex items-center mb-6">
                <Stethoscope className="mr-2 h-6 w-6 text-slate-500" /> Clinical Notes & Final Approval
              </h2>

              {session.status === "APPROVED" || feedbackSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center print:border-none print:p-0 print:text-left">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4 print:hidden" />
                  <h3 className="text-xl font-bold text-emerald-900 mb-2">Assessment Approved</h3>
                  <p className="text-emerald-700">This assessment has been reviewed and finalized by the clinician.</p>
                  {feedbackNotes && (
                    <div className="mt-6 text-left bg-white p-6 rounded-lg border border-emerald-100 print:bg-transparent print:border-slate-300 print:mt-4 print:p-4">
                      <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Clinical Notes</h4>
                      <p className="text-slate-800 whitespace-pre-wrap">{feedbackNotes}</p>
                    </div>
                  )}
                </div>
              ) : isDoctor ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm print:hidden">
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Final Clinical Impressions & Recommendations
                    </label>
                    <textarea
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                      rows={5}
                      placeholder="Enter clinical notes, behavioral observations, or next steps for the patient..."
                      className="w-full rounded-lg border-slate-300 border p-4 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => submitFeedback(true)}
                      disabled={submittingFeedback}
                      className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center shadow-sm"
                    >
                      {submittingFeedback ? "Processing..." : (
                        <>
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Finalize & Approve Assessment
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 text-right">
                    Approving will lock the assessment session and finalize the record.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center print:hidden">
                  <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600">This assessment requires Doctor or Psychologist review.</p>
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
