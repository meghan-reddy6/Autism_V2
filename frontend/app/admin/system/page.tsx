"use client";

import { useEffect, useState } from "react";
import { Server, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

export default function SystemHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/v1/super-admin/system/health")
      .then((data) => {
        setHealth(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-white">Loading system diagnostics...</div>;

  return (
    <div className="p-10 text-slate-200">
      <h1 className="text-3xl font-bold text-white mb-6">System Health</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex items-center">
          <Server className="w-12 h-12 text-blue-500 mr-4" />
          <div>
            <h3 className="text-lg font-semibold text-white">API Server</h3>
            <div className="flex items-center mt-1">
              {health?.status === "healthy" ? (
                <><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" /><span className="text-emerald-500 font-medium">Operational</span></>
              ) : (
                <><AlertCircle className="w-4 h-4 text-rose-500 mr-2" /><span className="text-rose-500 font-medium">Degraded</span></>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex items-center">
          <Database className="w-12 h-12 text-indigo-500 mr-4" />
          <div>
            <h3 className="text-lg font-semibold text-white">Database</h3>
            <div className="flex items-center mt-1">
              {health?.database === "connected" ? (
                <><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" /><span className="text-emerald-500 font-medium">Connected</span></>
              ) : (
                <><AlertCircle className="w-4 h-4 text-rose-500 mr-2" /><span className="text-rose-500 font-medium">Disconnected</span></>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Platform Version</h2>
        <div className="bg-slate-900 rounded p-4 font-mono text-blue-400">
          v{health?.version || "Unknown"}
        </div>
      </div>
    </div>
  );
}
