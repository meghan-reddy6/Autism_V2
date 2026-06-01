import Link from "next/link";
import { Activity, UserPlus, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="bg-blue-100 p-4 rounded-full inline-block mb-6">
          <Activity className="h-12 w-12 text-blue-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 tracking-tight">Clinical SaaS Portal</h1>
        <p className="text-slate-500 max-w-lg mx-auto text-lg">
          Secure, scalable pre-assessment workflow and AI-powered decision support.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Patient Portal Card */}
        <Link href="/assessments/new" className="group block h-full">
          <div className="bg-white border-2 border-transparent hover:border-blue-500 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all h-full flex flex-col items-center text-center">
            <div className="bg-blue-50 p-4 rounded-full mb-6 group-hover:bg-blue-100 transition-colors">
              <UserPlus className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Take Assessment</h2>
            <p className="text-slate-500 mb-6 flex-grow">
              For parents and patients. Start a new secure clinical questionnaire. No account required.
            </p>
            <button className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg group-hover:bg-blue-700 transition-colors">
              Start Now
            </button>
          </div>
        </Link>

        {/* Clinician Portal Card */}
        <Link href="/login" className="group block h-full">
          <div className="bg-white border-2 border-transparent hover:border-indigo-500 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all h-full flex flex-col items-center text-center">
            <div className="bg-indigo-50 p-4 rounded-full mb-6 group-hover:bg-indigo-100 transition-colors">
              <Lock className="h-10 w-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Login</h2>
            <p className="text-slate-500 mb-6 flex-grow">
              For authorized clinicians and medical staff. Access dashboards and patient reports.
            </p>
            <button className="w-full bg-indigo-600 text-white font-medium py-3 rounded-lg group-hover:bg-indigo-700 transition-colors">
              Login to Portal
            </button>
          </div>
        </Link>
      </div>
    </div>
  );
}
