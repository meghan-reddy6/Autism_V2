"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { Building2, Plus, Users, Search, Loader2 } from "lucide-react";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrgs() {
      try {
        const data = await fetchApi("/admin/organizations");
        setOrgs(data);
      } catch (err: any) {
        setError(err.message || "Failed to load organizations");
      } finally {
        setLoading(false);
      }
    }
    loadOrgs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 border-b border-slate-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Organizations</h1>
          <p className="text-slate-400 mt-2">Manage clinic tenants across the CDSS platform.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Provision Tenant
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center bg-slate-900/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search organizations by name or NPI..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 placeholder-slate-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs">Organization Name</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs">Subscription</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs text-center">Users</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs text-center">Patients</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-blue-900/30 rounded-lg flex items-center justify-center border border-blue-800/30">
                        <Building2 className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-white">{org.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-1">NPI: {org.npiNumber || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800/30">
                      {org.subscriptionTier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center text-slate-300 font-medium">
                      <Users className="w-4 h-4 mr-2 text-slate-500" />
                      {org._count?.users || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-slate-300 font-medium">
                    {org._count?.patients || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No organizations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
