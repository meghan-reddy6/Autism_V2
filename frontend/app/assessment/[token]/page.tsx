"use client";
import { fetchAssessmentTemplate } from "@/lib/api-client";
import { FormRenderer } from "@/features/assessments/components/FormRenderer";
import { ProgressIndicator } from "@/features/assessments/components/ProgressIndicator";
import { AlertCircle, Loader2 } from "lucide-react";
import { getAssessmentSchema } from "@/lib/assessment-forms";
import { useQuery } from "@tanstack/react-query";

export default function AssessmentPage({ params }: { params: { token: string } }) {
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['assessmentTemplate', params.token],
    queryFn: async () => {
      return fetchAssessmentTemplate(params.token);
    },
    enabled: !!params.token
  });

  const error = queryError ? (queryError as Error).message : "";

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-xl flex items-start mt-10">
        <AlertCircle className="text-red-500 w-6 h-6 mr-3 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-red-800">Unable to load assessment</h3>
          <p className="text-red-600 mt-1">{error || "Invalid or expired token."}</p>
        </div>
      </div>
    );
  }

  const schema = getAssessmentSchema(data.scaleType || data.templateName); // Fallback for old data
  if (!schema) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-xl flex items-start mt-10">
        <AlertCircle className="text-red-500 w-6 h-6 mr-3 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-red-800">Invalid Assessment Type</h3>
          <p className="text-red-600 mt-1">This assessment type is not supported.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">{schema?.title || data.templateName || "Clinical Assessment"}</h1>
        {data.patientFirstName && (
          <p className="text-slate-600 font-medium">For patient: {data.patientFirstName}</p>
        )}
      </div>
      
      <ProgressIndicator status={data.status} />
      
      <FormRenderer token={params.token} schema={schema} initialStatus={data.status} />
    </div>
  );
}
