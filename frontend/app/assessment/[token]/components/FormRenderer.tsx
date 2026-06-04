"use client";
import { useState } from "react";
import { submitAssessmentResponses, saveDraftResponses } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

export function FormRenderer({ token, schema, initialStatus }: { token: string, schema: any, initialStatus: string }) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const isReadOnly = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(initialStatus);

  const handleChange = (field: string, value: any) => {
    if (isReadOnly) return;
    setResponses(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    if (isReadOnly) return;
    setSaving(true);
    try {
      const formatted = Object.keys(responses).map(k => ({ fieldName: k, value: responses[k] }));
      await saveDraftResponses(token, formatted);
    } catch (e) {
      console.error("Draft save failed", e);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSubmitting(true);
    try {
      const formatted = Object.keys(responses).map(k => ({ fieldName: k, value: responses[k] }));
      await submitAssessmentResponses(token, formatted);
      router.push(`/assessment/${token}/success`);
    } catch (e) {
      console.error("Submit failed", e);
      alert("Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  if (!schema || !schema.fields) {
    return <p className="text-slate-500 italic">No fields configured for this assessment.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {schema.fields.map((field: any, idx: number) => (
        <div key={idx} className="bg-slate-50 p-6 rounded-xl border border-slate-100">
          <label className="block text-slate-800 font-bold mb-2">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          
          {field.description && (
            <p className="text-sm text-slate-500 mb-4">{field.description}</p>
          )}

          {field.type === "text" && (
            <input
              type="text"
              required={field.required}
              disabled={isReadOnly}
              value={responses[field.name] || ""}
              onChange={e => handleChange(field.name, e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}

          {field.type === "textarea" && (
            <textarea
              required={field.required}
              disabled={isReadOnly}
              value={responses[field.name] || ""}
              onChange={e => handleChange(field.name, e.target.value)}
              rows={4}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}

          {field.type === "select" && (
            <select
              required={field.required}
              disabled={isReadOnly}
              value={responses[field.name] || ""}
              onChange={e => handleChange(field.name, e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">Select an option...</option>
              {(field.options || []).map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>
      ))}

      {!isReadOnly && (
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || submitting}
            className="px-6 py-3 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center transition-colors"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            Save Draft
          </button>
          
          <button
            type="submit"
            disabled={saving || submitting}
            className="px-8 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center transition-colors shadow-md shadow-indigo-200"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Submit Final Assessment
          </button>
        </div>
      )}
    </form>
  );
}
