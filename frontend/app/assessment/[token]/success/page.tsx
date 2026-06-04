import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 mt-10 text-center max-w-2xl mx-auto">
      <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h1 className="text-3xl font-bold text-slate-800 mb-4">Assessment Submitted</h1>
      <p className="text-slate-600 text-lg mb-8">
        Thank you. Your responses have been securely transmitted to your clinical team. You may now close this window.
      </p>
      <Link href="/" className="inline-block px-6 py-3 font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
        Return to Home
      </Link>
    </div>
  );
}
