"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { Users, Loader2, ShieldAlert } from "lucide-react";
import { UserTable } from "@/components/shared/UserTable";
import { UserModal } from "@/components/shared/UserModal";

export default function GlobalUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", firstName: "", lastName: "", role: "ORG_ADMIN", tenantId: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const [usersData, orgsData, rolesData] = await Promise.all([
        fetchApi("/admin/users"), fetchApi("/admin/organizations"), fetchApi("/admin/roles")
      ]);
      setUsers(usersData);
      setTenants(orgsData);
      setRoles(rolesData.roles);
      if (orgsData.length > 0) setNewUser(prev => ({ ...prev, tenantId: orgsData[0].id }));
    } catch (err: any) {
      setError(err.message || "Failed to load users data");
    } finally {
      setLoading(false);
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsEditSubmitting(true);
    try {
      await fetchApi(`/admin/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          email: editingUser.email,
          role: editingUser.role,
        })
      });
      await loadUsers();
      setEditingUser(null);
    } catch (err: any) { alert(err.message || "Failed to update user"); }
    finally { setIsEditSubmitting(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetchApi("/admin/users", { method: "POST", body: JSON.stringify(newUser) });
      await loadUsers();
      setIsModalOpen(false);
      setNewUser({ email: "", password: "", firstName: "", lastName: "", role: "ORG_ADMIN", tenantId: tenants[0]?.id || "" });
    } catch (err: any) { alert(err.message || "Failed to create user"); }
    finally { setIsSubmitting(false); }
  };

  async function handleToggleStatus(userId: string, currentStatus: boolean) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;
    setActionLoading(userId);
    try {
      await fetchApi("/super-admin/users/bulk-action", {
        method: "POST",
        body: JSON.stringify({ action: currentStatus ? "deactivate" : "activate", userIds: [userId] })
      });
      await loadUsers();
    } catch (err: any) { alert(err.message || "Action failed"); }
    finally { setActionLoading(null); }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.")) return;
    setActionLoading(userId);
    try {
      await fetchApi(`/admin/users/${userId}`, { method: "DELETE" });
      await loadUsers();
    } catch (err: any) { alert(err.message || "Failed to delete user"); }
    finally { setActionLoading(null); }
  }

  if (loading) return <div className="flex justify-center items-center h-full min-h-[500px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="p-8">
      <div className="mb-8 border-b border-slate-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Global Users</h1>
          <p className="text-slate-400 mt-2">Manage all platform users across tenants. Deactivate users to revoke access.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium">
          <Users className="w-4 h-4 mr-2" /> Provision User
        </button>
      </div>

      {isModalOpen && (
        <UserModal 
          title="Provision New User" user={newUser} onChange={setNewUser} onSubmit={handleCreateUser} onCancel={() => setIsModalOpen(false)}
          isSubmitting={isSubmitting} submitLabel={isSubmitting ? "Creating..." : "Create User"} roles={roles} tenants={tenants} showPassword={true} theme="dark"
        />
      )}

      {editingUser && (
        <UserModal 
          title="Edit User" user={editingUser} onChange={setEditingUser} onSubmit={handleEditUser} onCancel={() => setEditingUser(null)}
          isSubmitting={isEditSubmitting} submitLabel={isEditSubmitting ? "Saving..." : "Save Changes"} roles={roles} theme="dark"
        />
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 flex items-start">
          <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" /><p>{error}</p>
        </div>
      )}

      <UserTable 
        users={users} loading={loading} actionLoading={actionLoading} showTenant={true}
        onEdit={setEditingUser} onToggleStatus={handleToggleStatus} onDelete={handleDeleteUser} theme="dark"
      />
    </div>
  );
}
