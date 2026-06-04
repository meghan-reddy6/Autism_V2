import { CheckCircle2 } from "lucide-react";

export function ProgressIndicator({ status }: { status: string }) {
  if (["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(status)) {
    return (
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center text-green-700 mb-8">
        <CheckCircle2 className="w-5 h-5 mr-3" />
        <span className="font-medium">This assessment has already been submitted and cannot be edited.</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-between text-sm text-slate-500 font-medium mb-8 pb-4 border-b border-slate-100">
      <span>Status: <span className="text-indigo-600 capitalize">{status.replace("_", " ").toLowerCase()}</span></span>
      <span>Auto-saving enabled</span>
    </div>
  );
}
