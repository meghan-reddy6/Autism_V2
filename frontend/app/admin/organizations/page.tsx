"use client";

import { useState } from "react";
import { fetchApi } from "@/src/core/api/api-client";
import { Building2, Plus, Users, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/src/core/ui/tailwindClasses";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", subscriptionTier: "Enterprise", maxUsers: 500, maxStorageGB: 100 });
  const router = useRouter();

  const { data: orgs = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['adminOrganizations'],
    queryFn: async () => {
      return fetchApi("/admin/organizations");
    }
  });

  const createOrgMutation = useMutation({
    mutationFn: async (orgData: typeof newOrg) => {
      return fetchApi("/admin/organizations", {
        method: "POST",
        body: JSON.stringify(orgData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrganizations'] });
      setIsModalOpen(false);
      setNewOrg({ name: "", subscriptionTier: "Enterprise", maxUsers: 500, maxStorageGB: 100 });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to create organization");
    }
  });

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    createOrgMutation.mutate(newOrg);
  };

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
        <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Provision Tenant
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Provision New Tenant</h2>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Organization Name</label>
                <input required type="text" value={newOrg.name} onChange={e => setNewOrg({...newOrg, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Subscription Tier</label>
                <select value={newOrg.subscriptionTier} onChange={e => setNewOrg({...newOrg, subscriptionTier: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none">
                  <option>Enterprise</option>
                  <option>Professional</option>
                  <option>Basic</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Max Users</label>
                  <input required type="number" value={newOrg.maxUsers} onChange={e => setNewOrg({...newOrg, maxUsers: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Storage (GB)</label>
                  <input required type="number" value={newOrg.maxStorageGB} onChange={e => setNewOrg({...newOrg, maxStorageGB: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white">Cancel</button>
                <button type="submit" disabled={createOrgMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {createOrgMutation.isPending ? "Creating..." : "Create Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs text-center">Status</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs text-center">Users</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs text-center">Patients</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {orgs.map((org: any) => (
                <tr 
                  key={org.id} 
                  onClick={() => router.push(`/admin/organizations/${org.id}`)}
                  className="hover:bg-slate-900/50 transition-colors cursor-pointer"
                >
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
                    <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded bg-slate-800 border ${org.status === 'ACTIVE' ? 'text-green-400 border-green-900/50' : 'text-rose-400 border-rose-900/50'}`}>
                      {org.status || 'ACTIVE'}
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
                    {formatDate(org.createdAt)}
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
