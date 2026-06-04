"use client";

import Link from "next/link";
import { Activity, ShieldCheck, HeartPulse, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/50 flex flex-col font-sans relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-[120px]"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-indigo-100/50 blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm h-20 flex items-center px-8 shrink-0">
        <div className="flex items-center space-x-3 max-w-6xl mx-auto w-full">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
            <HeartPulse className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-2xl text-slate-800 tracking-tight">Autism Assessment Tool</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-6xl mx-auto w-full">
        <div className="inline-flex items-center px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold rounded-full mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
          System Online
        </div>
        
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">SAT</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-16 leading-relaxed font-medium">
          Select your designated secure portal below to authenticate into the clinical system.
        </p>

        {/* Portal Cards */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
          
          {/* Staff Portal */}
          <Link href="/login" className="group flex flex-col text-left bg-white border border-slate-200/60 p-8 rounded-3xl shadow-lg shadow-slate-200/20 hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">Staff Portal</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed flex-1">
              For authorized Clinicians and Super Admins. Conduct assessments, review AI insights, and manage system configuration.
            </p>
            <div className="flex items-center text-blue-600 font-bold text-sm tracking-wide">
              SECURE LOGIN <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Assessment Portal */}
          <div className="group flex flex-col text-left bg-white border border-slate-200/60 p-8 rounded-3xl shadow-lg shadow-slate-200/20 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <HeartPulse className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-indigo-700 transition-colors">Assessment Portal</h2>
            <p className="text-slate-500 font-medium mb-6 leading-relaxed flex-1">
              For patients completing clinical assessments. Access requires a unique, secure token sent by your clinic.
            </p>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                let tokenStr = new FormData(e.currentTarget).get('token')?.toString().trim();
                if (tokenStr) {
                  if (tokenStr.includes('/assessment/')) {
                    tokenStr = tokenStr.split('/assessment/').pop() || tokenStr;
                  }
                  window.location.href = `/assessment/${tokenStr}`;
                }
              }}
              className="flex flex-col gap-3 z-10"
            >
              <input 
                type="text" 
                name="token"
                placeholder="Enter Secure Token..." 
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
              />
              <button 
                type="submit" 
                className="w-full text-center text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                Access Assessment
              </button>
            </form>
          </div>

        </div>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 py-6 text-center border-t border-slate-200/60 bg-white/50 backdrop-blur-sm">
        <p className="text-sm font-medium text-slate-400">
          © {new Date().getFullYear()} Sapphire Stream Technologies. Strict Hospital Environment Only.
        </p>
      </footer>
    </div>
  );
}
