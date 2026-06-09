"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { User, Activity, BrainCircuit, FileText, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const assessmentSchema = z.object({
  scaleType: z.enum(["CARS", "GARS-2", "M-CHAT-R"], { required_error: "Please select an assessment scale" }),
  
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"], { required_error: "Please select a gender" }),
  parentName: z.string().optional(),
  parentEmail: z.string().email("Invalid email").optional().or(z.literal('')),
  contactNumber: z.string().optional(),
});

type AssessmentData = z.infer<typeof assessmentSchema>;

const SCALES = {
  "CARS": {
    name: "CARS",
    description: "Childhood Autism Rating Scale (15 Items). Clinical observation protocol."
  },
  "GARS-2": {
    name: "GARS-2",
    description: "Gilliam Autism Rating Scale (41 Items). Frequency-based observation protocol."
  },
  "M-CHAT-R": {
    name: "M-CHAT-R",
    description: "Modified Checklist for Autism in Toddlers (20 Items). Parent-report questionnaire."
  }
};

export default function NewAssessmentSession() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdSession, setCreatedSession] = useState<{id: string, token: string} | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssessmentData>({
    resolver: zodResolver(assessmentSchema)
  });

  const selectedScaleKey = watch("scaleType") as keyof typeof SCALES;

  const onSubmit = async (data: AssessmentData) => {
    setIsSubmitting(true);
    setError("");
    
    try {
      // 1. Create Patient Record in EMR
      const patient = await fetchApi('/patients', {
        method: "POST",
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: new Date(data.dateOfBirth).toISOString(),
          gender: data.gender,
          guardianName: data.parentName,
          guardianEmail: data.parentEmail || undefined,
          guardianPhone: data.contactNumber,
        }),
      });

      // 2. Generate Assessment Session
      const session = await fetchApi('/assessment-sessions', {
        method: "POST",
        body: JSON.stringify({
          patientId: patient.id,
          scaleType: data.scaleType
        }),
      });

      setCreatedSession(session);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create assessment session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    if (createdSession && typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}/assessment/${createdSession.token}`);
      alert("Link copied to clipboard!");
    }
  };

  if (createdSession) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-6 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Session Created Successfully</h2>
          <p className="text-slate-500 mb-8">
            The assessment session has been generated. If you provided an email address, the secure link was automatically dispatched to the parent.
          </p>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 flex items-center justify-between">
            <code className="text-sm text-slate-700 truncate mr-4">
              {typeof window !== 'undefined' ? `${window.location.origin}/assessment/${createdSession.token}` : ''}
            </code>
            <button onClick={copyLink} className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 shrink-0">
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => router.push(`/assessment/${createdSession.token}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              Open Assessment <ExternalLink className="w-4 h-4 ml-2" />
            </button>
            <button 
              onClick={() => router.push('/assessments')}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              Back to Inbox
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-3">
            <BrainCircuit className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Generate Assessment Session</h1>
          <p className="text-sm text-slate-500 mt-2">Create a new patient profile and generate a dynamic assessment link.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            
            {/* Demographics Section */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center border-b border-slate-100 pb-4 mb-6">
                <User className="mr-2 h-5 w-5 text-slate-400" /> Patient Demographics
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">First Name</label>
                  <input type="text" {...register("firstName")} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Last Name</label>
                  <input type="text" {...register("lastName")} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                  <input type="date" {...register("dateOfBirth")} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  {errors.dateOfBirth && <p className="text-red-500 text-xs">{errors.dateOfBirth.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Gender</label>
                  <select {...register("gender")} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                    <option value="">Select Gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  {errors.gender && <p className="text-red-500 text-xs">{errors.gender.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Parent / Guardian Name (Optional)</label>
                  <input type="text" {...register("parentName")} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Parent Email (Optional - For Auto-Dispatch)</label>
                  <input type="email" placeholder="parent@example.com" {...register("parentEmail")} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  {errors.parentEmail && <p className="text-red-500 text-xs">{errors.parentEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Contact Number (Optional)</label>
                  <input type="tel" {...register("contactNumber")} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Protocol Selection */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center border-b border-slate-100 pb-4 mb-6">
                <FileText className="mr-2 h-5 w-5 text-slate-400" /> Assessment Protocol
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(SCALES).map(([key, scale]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setValue("scaleType", key as any, { shouldValidate: true })}
                    className={cn(
                      "p-5 border rounded-xl flex flex-col items-start text-left transition-all",
                      selectedScaleKey === key ? "border-blue-600 bg-blue-50/50 shadow-[0_0_0_1px_#2563eb]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span className={cn("text-base font-semibold mb-1", selectedScaleKey === key ? "text-blue-900" : "text-slate-900")}>
                      {scale.name}
                    </span>
                    <span className="text-xs text-slate-500">{scale.description}</span>
                  </button>
                ))}
              </div>
              {errors.scaleType && <p className="text-red-500 text-sm mt-3">{errors.scaleType.message}</p>}
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-70"
              >
                {isSubmitting ? "Generating Link..." : "Create Assessment Session"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
