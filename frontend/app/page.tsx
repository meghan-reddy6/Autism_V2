import Link from "next/link";
import { Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-12">
      <div className="bg-blue-100 p-4 rounded-full mb-6">
        <Activity className="h-12 w-12 text-blue-600" />
      </div>
      <h1 className="text-4xl font-bold mb-4 text-slate-900 tracking-tight">Clinical SaaS Portal</h1>
      <p className="text-slate-500 mb-8 max-w-md text-center text-lg">
        Secure, scalable pre-assessment workflow and decision support.
      </p>
      <div className="flex gap-4">
        <Link href="/dashboard">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Go to Dashboard
          </button>
        </Link>
        <Link href="/assessments/new">
          <button className="bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm">
            New Assessment
          </button>
        </Link>
      </div>
    </div>
  );
}
