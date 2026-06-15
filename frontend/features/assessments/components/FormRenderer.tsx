import { useState } from "react";
import { submitAssessmentResponses } from "@/lib/api-client";
import { AssessmentFormSchema } from "@/lib/assessment-forms";
import { CheckCircle, Loader2 } from "lucide-react";

export function FormRenderer({ 
  token, 
  schema, 
  initialStatus 
}: { 
  token: string; 
  schema: AssessmentFormSchema; 
  initialStatus: string; 
}) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});

  const isCompleted = status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "COMPLETED" || status === "APPROVED" || status === "ARCHIVED";

  if (isCompleted) {
    return (
      <div className="py-12 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Assessment Complete</h2>
        <p className="text-slate-600 mt-2">Thank you. Your responses have been submitted to the clinic.</p>
      </div>
    );
  }

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const formattedResponses = Object.entries(formData).map(([fieldName, value]) => ({
        fieldName,
        value
      }));

      await submitAssessmentResponses(token, formattedResponses);
      setStatus("SUBMITTED");
    } catch (err: any) {
      setError(err.message || "Failed to submit assessment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      {schema.fields.map((field, index) => (
        <div key={field.name} className="bg-slate-50 p-6 rounded-xl border border-slate-100">
          <label className="block text-slate-800 font-semibold mb-4 text-lg">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          
          {field.type === "select" && field.options && (
            <div className="space-y-3">
              {field.options.map(option => (
                <label key={option} className="flex items-center p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                  <input 
                    type="radio" 
                    name={field.name}
                    value={option}
                    required={field.required}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-slate-700">{option}</span>
                </label>
              ))}
            </div>
          )}
          
          {field.type === "text" && (
            <textarea
              name={field.name}
              required={field.required}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              rows={3}
            />
          )}
        </div>
      ))}

      <div className="pt-6 border-t border-slate-200">
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {saving && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          Submit Assessment
        </button>
      </div>
    </form>
  );
}
