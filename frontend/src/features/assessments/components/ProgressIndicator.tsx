import { CheckCircle2, Clock, PlayCircle } from "lucide-react";

export function ProgressIndicator({ status }: { status: string }) {
  const isCompleted = status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "COMPLETED";

  return (
    <div className="flex items-center space-x-2 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100 w-fit">
      <span className="text-sm font-medium text-slate-500">Status:</span>
      <div className={`flex items-center font-semibold text-sm px-3 py-1 rounded-full ${
        isCompleted 
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}>
        {isCompleted ? (
          <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Completed</>
        ) : (
          <><PlayCircle className="w-4 h-4 mr-1.5" /> In Progress</>
        )}
      </div>
    </div>
  );
}
