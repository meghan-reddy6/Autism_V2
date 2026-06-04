"use client";
import { useEffect, useState } from "react";
import { fetchAssessmentTemplate } from "@/lib/api-client";
import { FormRenderer } from "./components/FormRenderer";
import { ProgressIndicator } from "./components/ProgressIndicator";
import { AlertCircle, Loader2 } from "lucide-react";

export default function AssessmentPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessmentTemplate(params.token)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.token]);

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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">{data.templateName || "Clinical Assessment"}</h1>
        {data.patientFirstName && (
          <p className="text-slate-600 font-medium">For patient: {data.patientFirstName}</p>
        )}
      </div>
      
      <ProgressIndicator status={data.status} />
      
      <FormRenderer token={params.token} schema={data.schema} initialStatus={data.status} />
    </div>
  );
}
