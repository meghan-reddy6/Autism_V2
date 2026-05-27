"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { CheckCircle2, User, Activity, BrainCircuit, FileText, Stethoscope, Plus, Trash2, AlertCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 1. Upgraded Schema with PII (Dynamic questions removed from rigid schema)
const assessmentSchema = z.object({
  scaleType: z.enum(["CARS", "GARS-2", "M-CHAT-R"], { required_error: "Please select an assessment scale" }),
  clinicianId: z.string().min(1, "Clinician ID is required"),
  
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"], { required_error: "Please select a gender" }),
  parentName: z.string().optional(),
  contactNumber: z.string().optional(),
  
  medicalHistory: z.string().optional(),
  lifestyleInfo: z.string().optional(),
  
  symptoms: z.array(z.object({
    symptom: z.string().min(1, "Symptom description is required"),
    duration: z.string().min(1, "Duration is required"),
    severity: z.string().min(1, "Severity is required")
  })).optional(),
});

type AssessmentData = z.infer<typeof assessmentSchema>;

// --- 2. FULL CLINICAL QUESTION DATA DICTIONARIES ---
const SCALES = {
  "CARS": {
    name: "CARS",
    description: "Childhood Autism Rating Scale (15 Items). Scored 1 (Normal) to 4 (Severe).",
    options: [
      { val: 1, text: "Normal", desc: "Age-appropriate behavior" },
      { val: 2, text: "Mildly abnormal", desc: "Slight deviation" },
      { val: 3, text: "Moderately abnormal", desc: "Clear impairment" },
      { val: 4, text: "Severely abnormal", desc: "Profound deviation" },
    ],
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
    description: "Gilliam Autism Rating Scale (41 Items). Scored on frequency of occurrence.",
    options: [
      { val: 0, text: "Never", desc: "Never observed" },
      { val: 1, text: "Seldom", desc: "1-2 times per 6 hours" },
      { val: 2, text: "Sometimes", desc: "3-4 times per 6 hours" },
      { val: 3, text: "Frequently", desc: "5-6+ times per 6 hours" },
    ],
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
    description: "Modified Checklist for Autism in Toddlers (20 Items). Parent-report yes/no format.",
    options: [
      { val: 0, text: "No", desc: "Behavior is not typical" },
      { val: 1, text: "Yes", desc: "Behavior is typical" },
    ],
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

function chunkArray(array: any[], size: number) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

export default function SaaSAssessmentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => setMounted(true), []);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(assessmentSchema),
    mode: "onChange",
    defaultValues: {
      symptoms: [{ symptom: "", duration: "", severity: "Mild" }]
    }
  });

  const { fields: symptomFields, append: appendSymptom, remove: removeSymptom } = useFieldArray({
    control,
    name: "symptoms"
  });

  const selectedScaleKey = watch("scaleType") as keyof typeof SCALES;
  const currentScale = SCALES[selectedScaleKey];
  
  const questionPages = currentScale ? chunkArray(currentScale.questions, 8) : [];
  
  const BASE_STEPS = ["Protocol", "Intake", "History", "Symptoms"];
  const totalSteps = BASE_STEPS.length + questionPages.length;

  const handleNextStep = async () => {
    setValidationError("");
    let isStepValid = false;

    if (step === 0) {
      isStepValid = await trigger(["scaleType"]);
    } else if (step === 1) {
      isStepValid = await trigger(["firstName", "lastName", "dateOfBirth", "gender", "clinicianId"]);
    } else if (step === 2) {
      isStepValid = await trigger(["medicalHistory", "lifestyleInfo"]);
    } else if (step === 3) {
      isStepValid = await trigger(["symptoms"]);
    } else if (step >= 4) {
      const pageIndex = step - 4;
      const currentQuestions = questionPages[pageIndex];
      const allAnswered = currentQuestions.every(q => watch(q.id) !== undefined);
      if (!allAnswered) {
        setValidationError("Please select an answer for all visible observations.");
        return;
      }
      isStepValid = true;
    }

    if (isStepValid) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setStep(prev => prev + 1);
    }
  };

  const onSubmit = async (data: any) => {
    // Final check for the last page of questions
    if (step >= 4) {
      const pageIndex = step - 4;
      const currentQuestions = questionPages[pageIndex];
      const allAnswered = currentQuestions.every(q => watch(q.id) !== undefined);
      if (!allAnswered) {
        setValidationError("Please select an answer for all visible observations.");
        return;
      }
    }

    setIsSubmitting(true);
    setValidationError("");
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const itemScores: Record<string, number> = {};
      currentScale.questions.forEach(q => {
        itemScores[q.id] = data[q.id];
      });

      const response = await fetch("http://localhost:8000/api/reports/preliminary", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          clinician_id: data.clinicianId,
          first_name: data.firstName,
          last_name: data.lastName,
          date_of_birth: new Date(data.dateOfBirth).toISOString(),
          gender: data.gender,
          parent_name: data.parentName,
          contact_number: data.contactNumber,
          scale_type: data.scaleType,
          item_scores: itemScores,
          medical_history: data.medicalHistory,
          lifestyle_info: data.lifestyleInfo,
          symptoms: data.symptoms
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      
      if (!response.ok) throw new Error("Failed to submit");
      const result = await response.json();
      router.push(`/assessments/${result.report_id}`);
    } catch (error) {
      console.error(error);
      setValidationError("Failed to submit to backend. Is the server running?");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8 sm:mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-3 sm:mb-4">
            <BrainCircuit className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Clinical Assessment Setup</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2">Configure and administer preliminary behavioral scales.</p>
        </div>

        {/* Dynamic Progress Stepper (Mobile Responsive) */}
        <div className="mb-6 sm:mb-8 flex items-center justify-start sm:justify-center gap-1 sm:gap-4 overflow-x-auto pb-4 no-scrollbar">
          {Array.from({ length: totalSteps > 4 ? totalSteps : 5 }).map((_, i) => {
            let label = "";
            if (i < 4) label = BASE_STEPS[i];
            else label = `Obs ${i - 3}`;
            
            return (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0 px-1">
                <div className={cn("h-2 w-10 sm:w-16 rounded-full transition-all duration-300", step >= i ? "bg-blue-600" : "bg-slate-200")} />
                <span className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-wider", step >= i ? "text-blue-700" : "text-slate-400")}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-10">
            <form id="assessment-form" onSubmit={handleSubmit(onSubmit)}>
              
              {/* STEP 0: Select Assessment Type */}
              <div className={cn("space-y-6 sm:space-y-8 animate-in fade-in duration-500", step !== 0 && "hidden")}>
                <div className="border-b border-slate-100 pb-4 sm:pb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-slate-400" /> Select Scale Protocol
                  </h2>
                </div>
                
                <div className="grid gap-4">
                  {Object.entries(SCALES).map(([key, scale]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setValue("scaleType", key, { shouldValidate: true })}
                      className={cn(
                        "p-4 sm:p-6 border rounded-xl flex flex-col items-start text-left transition-all",
                        selectedScaleKey === key ? "border-blue-600 bg-blue-50/50 shadow-[0_0_0_1px_#2563eb]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                        errors.scaleType && !selectedScaleKey && "border-red-300 bg-red-50/30"
                      )}
                    >
                      <span className={cn("text-base sm:text-lg font-semibold mb-1", selectedScaleKey === key ? "text-blue-900" : "text-slate-900")}>
                        {scale.name}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-500">{scale.description}</span>
                    </button>
                  ))}
                </div>
                {errors.scaleType && <p className="text-red-500 text-sm">Please select a scale to continue.</p>}
              </div>

              {/* STEP 1: Intake (Demographics) */}
              <div className={cn("space-y-6 sm:space-y-8 animate-in fade-in duration-500", step !== 1 && "hidden")}>
                <div className="border-b border-slate-100 pb-4 sm:pb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
                    <User className="mr-2 h-5 w-5 text-slate-400" /> Patient Demographics
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">First Name</label>
                    <input type="text" {...register("firstName")} className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="First Name" />
                    {errors.firstName && <p className="text-red-500 text-xs sm:text-sm">{errors.firstName.message?.toString()}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">Last Name</label>
                    <input type="text" {...register("lastName")} className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="Last Name" />
                    {errors.lastName && <p className="text-red-500 text-xs sm:text-sm">{errors.lastName.message?.toString()}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">Date of Birth</label>
                    <input type="date" {...register("dateOfBirth")} className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                    {errors.dateOfBirth && <p className="text-red-500 text-xs sm:text-sm">{errors.dateOfBirth.message?.toString()}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">Gender</label>
                    <select {...register("gender")} className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none">
                      <option value="">Select Gender...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    {errors.gender && <p className="text-red-500 text-xs sm:text-sm">{errors.gender.message?.toString()}</p>}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <hr className="my-2 border-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">Parent / Guardian Name <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <input type="text" {...register("parentName")} className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="Guardian Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">Contact Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <input type="tel" {...register("contactNumber")} className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="e.g. (555) 123-4567" />
                  </div>
                  <div className="space-y-2 sm:col-span-2 mt-4">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">Attending Clinician ID</label>
                    <input type="text" {...register("clinicianId")} className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="e.g. DOC-99" />
                    {errors.clinicianId && <p className="text-red-500 text-xs sm:text-sm">{errors.clinicianId.message?.toString()}</p>}
                  </div>
                </div>
              </div>

              {/* STEP 2: History */}
              <div className={cn("space-y-6 sm:space-y-8 animate-in fade-in duration-500", step !== 2 && "hidden")}>
                <div className="border-b border-slate-100 pb-4 sm:pb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-slate-400" /> Medical & Lifestyle History
                  </h2>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">Relevant Medical History</label>
                    <textarea {...register("medicalHistory")} rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none" placeholder="Previous diagnoses, medications, known allergies..."></textarea>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">Lifestyle & Environment</label>
                    <textarea {...register("lifestyleInfo")} rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none" placeholder="Living situation, school environment, daily routines..."></textarea>
                  </div>
                </div>
              </div>

              {/* STEP 3: Symptoms */}
              <div className={cn("space-y-6 sm:space-y-8 animate-in fade-in duration-500", step !== 3 && "hidden")}>
                <div className="border-b border-slate-100 pb-4 sm:pb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
                    <Stethoscope className="mr-2 h-5 w-5 text-slate-400" /> Reported Symptoms
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">Log specific observations and symptoms noted by parents or intake staff.</p>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  {symptomFields.map((field, index) => (
                    <div key={field.id} className="p-3 sm:p-4 border border-slate-200 rounded-xl bg-slate-50 relative">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase">Symptom</label>
                          <input type="text" {...register(`symptoms.${index}.symptom` as const)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="e.g. Delayed speech" />
                          {(errors.symptoms as any)?.[index]?.symptom && <p className="text-red-500 text-xs">{(errors.symptoms as any)[index]?.symptom?.message?.toString()}</p>}
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase">Duration</label>
                          <input type="text" {...register(`symptoms.${index}.duration` as const)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="e.g. 6 months" />
                          {(errors.symptoms as any)?.[index]?.duration && <p className="text-red-500 text-xs">{(errors.symptoms as any)[index]?.duration?.message?.toString()}</p>}
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase">Severity</label>
                          <select {...register(`symptoms.${index}.severity` as const)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                            <option value="Mild">Mild</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Severe">Severe</option>
                          </select>
                        </div>
                      </div>
                      {symptomFields.length > 1 && (
                         <button type="button" onClick={() => removeSymptom(index)} className="absolute -top-3 -right-3 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-colors">
                           <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                         </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => appendSymptom({ symptom: "", duration: "", severity: "Mild" })} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
                    <Plus className="h-4 w-4 mr-1" /> Add another symptom
                  </button>
                </div>
              </div>

              {/* STEPS 4+: Dynamically Generated Question Pages */}
              {questionPages.map((pageQuestions, pageIndex) => {
                const currentStepNumber = pageIndex + 4;
                return (
                  <div key={pageIndex} className={cn("space-y-8 sm:space-y-10 animate-in fade-in duration-500", step !== currentStepNumber && "hidden")}>
                    <div className="border-b border-slate-100 pb-4 sm:pb-6 mb-6 sm:mb-8">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center">
                        <Activity className="mr-2 h-5 w-5 text-slate-400" />
                        {currentScale.name} Observations (Page {pageIndex + 1} of {questionPages.length})
                      </h2>
                    </div>
                    
                    {pageQuestions.map((q) => {
                      const selectedValue = watch(q.id);
                      return (
                        <div key={q.id} className="space-y-4 pt-8 border-t border-slate-100 first:border-0 first:pt-0">
                          <label className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">{q.label}</label>
                          <div className={cn("grid gap-3 sm:gap-4", currentScale.options.length > 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2")}>
                            {currentScale.options.map((opt) => (
                              <button
                                type="button"
                                key={opt.val}
                                onClick={() => setValue(q.id, opt.val)}
                                className={cn(
                                  "p-4 sm:p-5 border rounded-xl flex flex-col items-start text-left transition-all",
                                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                                  selectedValue === opt.val ? "border-blue-600 bg-blue-50/50 shadow-[0_0_0_1px_#2563eb]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                )}
                              >
                                <div className="flex justify-between w-full items-center mb-1">
                                  <span className={cn("font-medium", selectedValue === opt.val ? "text-blue-900" : "text-slate-700")}>{opt.text}</span>
                                  {selectedValue === opt.val && <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 ml-2" />}
                                </div>
                                <span className="text-xs sm:text-sm text-slate-500">{opt.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {validationError && (
                <div className="mt-8 p-4 bg-red-50 border border-red-200 flex items-center text-red-600 rounded-lg text-sm font-medium">
                  <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                  {validationError}
                </div>
              )}
            </form>
          </div>

          {/* Navigation Controls */}
          <div className="bg-slate-50 px-5 sm:px-8 py-4 sm:py-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <button 
              type="button" 
              onClick={() => setStep(prev => Math.max(0, prev - 1))} 
              className={cn("w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 transition-colors", step === 0 && "opacity-0 pointer-events-none")}
            >
              Back
            </button>
            
            {step < totalSteps - 1 ? (
              <button type="button" onClick={handleNextStep} className="w-full sm:w-auto px-8 py-2.5 bg-slate-900 text-white rounded-lg font-medium shadow-sm hover:bg-slate-800 transition-colors">
                Continue
              </button>
            ) : (
              <button type="submit" form="assessment-form" disabled={isSubmitting} className="w-full sm:w-auto justify-center px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center">
                {isSubmitting ? "Generating Report..." : "Submit Preliminary Report"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
