"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

// 1. Define the Strict Data Schema for the entire 15-question CARS test
const assessmentSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  clinicianId: z.string().min(1, "Clinician ID is required"),
  ageMonths: z.number().min(12).max(216),

  // All 15 CARS Questions
  q1_relating: z.number().min(1).max(4),
  q2_imitation: z.number().min(1).max(4),
  q3_emotional: z.number().min(1).max(4),
  q4_bodyUse: z.number().min(1).max(4),
  q5_objectUse: z.number().min(1).max(4),
  q6_adaptation: z.number().min(1).max(4),
  q7_visual: z.number().min(1).max(4),
  q8_listening: z.number().min(1).max(4),
  q9_tasteSmellTouch: z.number().min(1).max(4),
  q10_fearNervousness: z.number().min(1).max(4),
  q11_verbal: z.number().min(1).max(4),
  q12_nonVerbal: z.number().min(1).max(4),
  q13_activityLevel: z.number().min(1).max(4),
  q14_intellectual: z.number().min(1).max(4),
  q15_generalImpressions: z.number().min(1).max(4),
});

type AssessmentData = z.infer<typeof assessmentSchema>;

// 2. Data Structure for the Questions to keep the UI code clean
const CARS_QUESTIONS = [
  { id: "q1_relating", label: "1. Relating to People" },
  { id: "q2_imitation", label: "2. Imitation" },
  { id: "q3_emotional", label: "3. Emotional Response" },
  { id: "q4_bodyUse", label: "4. Body Use" },
  { id: "q5_objectUse", label: "5. Object Use" },
  { id: "q6_adaptation", label: "6. Adaptation to Change" },
  { id: "q7_visual", label: "7. Visual Response" },
  { id: "q8_listening", label: "8. Listening Response" },
  {
    id: "q9_tasteSmellTouch",
    label: "9. Taste, Smell, and Touch Response and Use",
  },
  { id: "q10_fearNervousness", label: "10. Fear or Nervousness" },
  { id: "q11_verbal", label: "11. Verbal Communication" },
  { id: "q12_nonVerbal", label: "12. Nonverbal Communication" },
  { id: "q13_activityLevel", label: "13. Activity Level" },
  {
    id: "q14_intellectual",
    label: "14. Level and Consistency of Intellectual Response",
  },
  { id: "q15_generalImpressions", label: "15. General Impressions" },
] as const;

export default function AssessmentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0); // Step 0 is Demographics, 1-3 are questions
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<AssessmentData>({
    resolver: zodResolver(assessmentSchema),
    mode: "onChange",
  });

  const handleNextStep = async () => {
    // Validate current step before proceeding
    let fieldsToValidate: any[] = [];
    if (step === 0)
      fieldsToValidate = ["patientId", "clinicianId", "ageMonths"];
    if (step === 1)
      fieldsToValidate = CARS_QUESTIONS.slice(0, 5).map((q) => q.id);
    if (step === 2)
      fieldsToValidate = CARS_QUESTIONS.slice(5, 10).map((q) => q.id);

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  const onSubmit = async (data: AssessmentData) => {
    setIsSubmitting(true);
    try {
      // Map the flat form data into the item_scores dictionary the backend expects
      const itemScores: Record<string, number> = {};
      CARS_QUESTIONS.forEach((q) => {
        itemScores[q.id] = data[q.id as keyof AssessmentData] as number;
      });

      const response = await fetch(
        "http://localhost:8000/api/assessments/submit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: data.patientId,
            clinician_id: data.clinicianId,
            patient_age_months: data.ageMonths,
            scale_type: "CARS",
            item_scores: itemScores,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to submit");

      const result = await response.json();

      // Navigate to the results page with the dynamically returned scores
      router.push(
        `/assessments/${data.patientId}?score=${result.total_score}&ml=${result.ml_inference.risk_assessment}`,
      );
    } catch (error) {
      console.error("Submission failed", error);
      alert("Submission failed. Check backend logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render the radio buttons for a given question
  const renderQuestion = (q: (typeof CARS_QUESTIONS)[number]) => (
    <div
      key={q.id}
      className="space-y-4 pt-4 border-t border-slate-100 first:border-0 first:pt-0"
    >
      <label className="text-lg font-medium text-slate-800">{q.label}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { val: 1, text: "Normal" },
          { val: 2, text: "Mildly abnormal" },
          { val: 3, text: "Moderately abnormal" },
          { val: 4, text: "Severely abnormal" },
        ].map((opt) => (
          <label
            key={opt.val}
            className="flex items-start p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
          >
            <input
              type="radio"
              value={opt.val}
              {...register(q.id as keyof AssessmentData, {
                valueAsNumber: true,
              })}
              className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-700 font-medium">{opt.text}</span>
          </label>
        ))}
      </div>
      {errors[q.id as keyof AssessmentData] && (
        <p className="text-red-500 text-sm mt-1">Please select an option.</p>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          CARS Assessment Workflow
        </h1>
        <p className="text-slate-500 mt-2">
          Childhood Autism Rating Scale • 15 Items
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex gap-2 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${step >= i ? "bg-blue-600" : "bg-slate-200"}`}
          />
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
        <form
          id="assessment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8"
        >
          {/* STEP 0: Demographics */}
          <div className={step === 0 ? "block" : "hidden"}>
            <h2 className="text-xl font-semibold mb-6 text-slate-800">
              Patient Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Patient ID
                </label>
                <input
                  type="text"
                  {...register("patientId")}
                  className="w-full p-3 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. PAT-10492"
                />
                {errors.patientId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.patientId.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Clinician ID
                </label>
                <input
                  type="text"
                  {...register("clinicianId")}
                  className="w-full p-3 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. DOC-99"
                />
                {errors.clinicianId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.clinicianId.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Patient Age (Months)
                </label>
                <input
                  type="number"
                  {...register("ageMonths", { valueAsNumber: true })}
                  className="w-full p-3 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 42"
                />
                {errors.ageMonths && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.ageMonths.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* STEP 1: Q1 - Q5 */}
          <div className={step === 1 ? "block" : "hidden"}>
            <h2 className="text-xl font-semibold mb-6 text-slate-800">
              Behavioral Observations (1-5)
            </h2>
            <div className="space-y-8">
              {CARS_QUESTIONS.slice(0, 5).map(renderQuestion)}
            </div>
          </div>

          {/* STEP 2: Q6 - Q10 */}
          <div className={step === 2 ? "block" : "hidden"}>
            <h2 className="text-xl font-semibold mb-6 text-slate-800">
              Behavioral Observations (6-10)
            </h2>
            <div className="space-y-8">
              {CARS_QUESTIONS.slice(5, 10).map(renderQuestion)}
            </div>
          </div>

          {/* STEP 3: Q11 - Q15 */}
          <div className={step === 3 ? "block" : "hidden"}>
            <h2 className="text-xl font-semibold mb-6 text-slate-800">
              Behavioral Observations (11-15)
            </h2>
            <div className="space-y-8">
              {CARS_QUESTIONS.slice(10, 15).map(renderQuestion)}
            </div>
          </div>
        </form>

        {/* Navigation Controls */}
        <div className="flex justify-between border-t border-slate-100 mt-10 pt-6">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            className={`px-6 py-2 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 transition-colors ${step === 0 ? "invisible" : ""}`}
          >
            Previous
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition-colors"
            >
              Next Step
            </button>
          ) : (
            <button
              type="submit"
              form="assessment-form"
              disabled={isSubmitting}
              className="px-8 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? "Processing ML..." : "Submit & Analyze"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
