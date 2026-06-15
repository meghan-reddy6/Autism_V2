"use client";

import { useEffect, useState } from "react";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { fetchApi } from "@/lib/api-client";
import { formatDate } from "@/lib/tailwindClasses";

export default function RecycleBinPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    fetchApi("/api/v1/recycle-bin/patients")
      .then((data) => setPatients(data.deleted_patients || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRestore = async (id: string) => {
    if (!confirm("Are you sure you want to restore this patient?")) return;
    try {
      await fetchApi(`/api/v1/recycle-bin/patients/${id}/restore`, { method: "POST" });
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to restore patient");
    }
  };

  const handlePurge = async (id: string) => {
    if (!confirm("WARNING: This will permanently delete the patient and all associated data. This action cannot be undone. Proceed?")) return;
    try {
      await fetchApi(`/api/v1/recycle-bin/patients/${id}/purge`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to purge patient");
    }
  };

  return (
    <div className="p-10 text-slate-200">
      <div className="flex items-center mb-6">
        <Trash2 className="w-8 h-8 text-rose-500 mr-3" />
        <h1 className="text-3xl font-bold text-white">Recycle Bin</h1>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading deleted records...</div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-slate-300">Recycle Bin is Empty</h3>
            <p className="text-slate-500 mt-2">No deleted records found.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-400">Patient Name</th>
                <th className="px-6 py-4 font-semibold text-slate-400">MRN</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Deleted Date</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{p.firstName} {p.lastName}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-sm">{p.mrn}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {p.deletedAt ? formatDate(p.deletedAt) : "Unknown"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRestore(p.id)}
                      className="inline-flex items-center px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-md text-sm font-medium transition-colors mr-3"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </button>
                    <button 
                      onClick={() => handlePurge(p.id)}
                      className="inline-flex items-center px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-md text-sm font-medium transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Purge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
