import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 text-center max-w-lg w-full">
        <div className="bg-emerald-100 p-4 rounded-full inline-block mb-6">
          <CheckCircle className="h-16 w-16 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Assessment Submitted</h1>
        <p className="text-slate-600 mb-8 text-lg">
          Thank you for completing the assessment. Your responses have been securely sent to your clinician for review. 
          They will contact you with the results and next steps.
        </p>
        <Link href="/">
          <button className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Return to Home
          </button>
        </Link>
      </div>
    </div>
  );
}
