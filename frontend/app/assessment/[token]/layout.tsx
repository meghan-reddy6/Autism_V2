export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 shadow-sm shrink-0">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <span className="font-bold text-xl text-indigo-600 tracking-tight">Clinical Assessment Portal</span>
          <span className="text-sm font-medium text-slate-500 flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Secure Connection
          </span>
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto p-6">
        {children}
      </main>
      <footer className="py-6 text-center text-sm text-slate-400">
        HIPAA Compliant • Secure Data Transmission
      </footer>
    </div>
  );
}
