import Link from "next/link";
import {
  Activity,
  UserPlus,
  Lock,
  Sparkles,
  ShieldCheck,
  Heart,
} from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(59,130,246,0.35),transparent_18%),radial-gradient(circle_at_90%_20%,rgba(236,72,153,0.28),transparent_20%),radial-gradient(circle_at_80%_90%,rgba(34,211,238,0.22),transparent_22%)]" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="relative mb-12 w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/10 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="absolute -top-7 left-10 rounded-3xl border border-white/20 bg-slate-900/70 p-3 text-cyan-200 shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="absolute top-8 right-10 rounded-3xl border border-white/20 bg-slate-900/70 p-3 text-sky-300 shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="absolute -bottom-7 left-16 rounded-3xl border border-white/20 bg-slate-900/70 p-3 text-pink-300 shadow-lg">
            <Heart className="h-6 w-6" />
          </div>
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-xl shadow-sky-500/20">
              <Activity className="h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Clinical SaaS Portal
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-200">
              Secure, scalable pre-assessment workflow and AI-powered decision
              support for clinicians and families.
            </p>
          </div>
        </div>

        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
          <Link href="/assessments/new" className="group block h-full">
            <div className="flex h-full flex-col items-center rounded-[1.75rem] border border-white/10 bg-white/95 p-8 shadow-lg shadow-slate-950/10 transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-700 shadow-md">
                <UserPlus className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Take Assessment</h2>
              <p className="text-slate-600 mb-6 flex-grow text-center">
                For parents and patients. Start a secure clinical questionnaire to
                capture early insights.
              </p>
              <button className="w-full rounded-2xl bg-cyan-600 py-3 text-white transition-colors hover:bg-cyan-700">
                Start Now
              </button>
            </div>
          </Link>

          <Link href="/login" className="group block h-full">
            <div className="flex h-full flex-col items-center rounded-[1.75rem] border border-white/10 bg-white/95 p-8 shadow-lg shadow-slate-950/10 transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-50 text-violet-700 shadow-md">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Admin Login</h2>
              <p className="text-slate-600 mb-6 flex-grow text-center">
                For authorized clinicians and medical staff. Access dashboards,
                patient records, and reports.
              </p>
              <button className="w-full rounded-2xl bg-violet-600 py-3 text-white transition-colors hover:bg-violet-700">
                Login to Portal
              </button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
