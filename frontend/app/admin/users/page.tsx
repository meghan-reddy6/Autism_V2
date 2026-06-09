"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { Users, Search, Loader2, ShieldAlert, CheckCircle2, XCircle, Trash2 } from "lucide-react";

export default function GlobalUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", firstName: "", lastName: "", role: "CLINICAL_ADMIN", tenantId: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const [usersData, orgsData, rolesData] = await Promise.all([
        fetchApi("/admin/users"),
        fetchApi("/admin/organizations"),
        fetchApi("/admin/roles")
      ]);
      setUsers(usersData);
      setTenants(orgsData);
      setRoles(rolesData.roles);
      if (orgsData.length > 0) {
        setNewUser(prev => ({ ...prev, tenantId: orgsData[0].id }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load users data");
    } finally {
      setLoading(false);
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetchApi("/admin/users", {
        method: "POST",
        body: JSON.stringify(newUser)
      });
      await loadUsers();
      setIsModalOpen(false);
      setNewUser({ email: "", password: "", firstName: "", lastName: "", role: "CLINICAL_ADMIN", tenantId: tenants[0]?.id || "" });
    } catch (err: any) {
      alert(err.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  async function handleToggleStatus(userId: string, currentStatus: boolean) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;
    
    setActionLoading(userId);
    try {
      await fetchApi("/super-admin/users/bulk-action", {
        method: "POST",
        body: JSON.stringify({
          action: currentStatus ? "deactivate" : "activate",
          userIds: [userId]
        })
      });
      await loadUsers();
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.")) return;
    
    setActionLoading(userId);
    try {
      await fetchApi(`/admin/users/${userId}`, {
        method: "DELETE"
      });
      await loadUsers();
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  }

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
          <h1 className="text-3xl font-bold text-white tracking-tight">Global Users</h1>
          <p className="text-slate-400 mt-2">Manage all platform users across tenants. Deactivate users to revoke access.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium">
          <Users className="w-4 h-4 mr-2" />
          Provision User
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Provision New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
                  <input required type="text" value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
                  <input required type="text" value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Temporary Password</label>
                  <input required type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="e.g. Welcome@123" className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none">
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Organization</label>
                <select value={newUser.tenantId} onChange={e => setNewUser({...newUser, tenantId: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none">
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 flex items-start">
          <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center bg-slate-900/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 placeholder-slate-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs">User</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs">Role</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs">Organization</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs">Status</th>
                <th className="py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 text-slate-300 font-bold">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-slate-500 mt-1">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-blue-900/30 text-blue-400 border border-blue-800/30">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                    {user.tenant ? user.tenant.name : "System"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isActive ? (
                      <span className="flex items-center text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center text-red-400 text-xs font-medium">
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleToggleStatus(user.id, user.isActive)}
                      disabled={actionLoading === user.id}
                      className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        user.isActive 
                          ? 'text-red-400 hover:bg-red-400/10 hover:text-red-300' 
                          : 'text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300'
                      }`}
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : user.isActive ? (
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      )}
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={actionLoading === user.id}
                      className="inline-flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors text-slate-400 hover:bg-slate-800 hover:text-white ml-2"
                      title="Permanently Delete User"
                    >
                      {actionLoading === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No users found.
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
