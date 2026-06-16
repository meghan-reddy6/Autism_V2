"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api-client";
import { Users, Loader2, ShieldAlert } from "lucide-react";
import { UserTable } from "@/components/shared/UserTable";
import { UserModal } from "@/components/shared/UserModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function GlobalUsersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", firstName: "", lastName: "", role: "ORG_ADMIN", tenantId: "" });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['adminUsersData'],
    queryFn: async () => {
      const [usersData, orgsData, rolesData] = await Promise.all([
        fetchApi("/admin/users"), fetchApi("/admin/organizations"), fetchApi("/admin/roles")
      ]);
      return { users: usersData, tenants: orgsData, roles: rolesData.roles };
    }
  });

  const users = data?.users || [];
  const tenants = data?.tenants || [];
  const roles = data?.roles || [];

  // Update new user default tenant if tenants load
  useEffect(() => {
    if (tenants.length > 0 && !newUser.tenantId) {
      setNewUser(prev => ({ ...prev, tenantId: tenants[0].id }));
    }
  }, [tenants, newUser.tenantId]);

  const editUserMutation = useMutation({
    mutationFn: async (updatedUser: any) => {
      await fetchApi(`/admin/users/${updatedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          role: updatedUser.role,
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersData'] });
      setEditingUser(null);
    },
    onError: (err: any) => alert(err.message || "Failed to update user")
  });

  const createUserMutation = useMutation({
    mutationFn: async (userToCreate: any) => {
      await fetchApi("/admin/users", { method: "POST", body: JSON.stringify(userToCreate) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersData'] });
      setIsModalOpen(false);
      setNewUser({ email: "", password: "", firstName: "", lastName: "", role: "ORG_ADMIN", tenantId: tenants[0]?.id || "" });
    },
    onError: (err: any) => alert(err.message || "Failed to create user")
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string, currentStatus: boolean }) => {
      await fetchApi("/super-admin/users/bulk-action", {
        method: "POST",
        body: JSON.stringify({ action: currentStatus ? "deactivate" : "activate", userIds: [userId] })
      });
    },
    onMutate: (variables) => { setActionLoading(variables.userId); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminUsersData'] }); },
    onError: (err: any) => alert(err.message || "Action failed"),
    onSettled: () => { setActionLoading(null); }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await fetchApi(`/admin/users/${userId}`, { method: "DELETE" });
    },
    onMutate: (userId) => { setActionLoading(userId); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminUsersData'] }); },
    onError: (err: any) => alert(err.message || "Failed to delete user"),
    onSettled: () => { setActionLoading(null); }
  });

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) editUserMutation.mutate(editingUser);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUser);
  };

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;
    toggleStatusMutation.mutate({ userId, currentStatus });
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.")) return;
    deleteUserMutation.mutate(userId);
  };

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
          isSubmitting={createUserMutation.isPending} submitLabel={createUserMutation.isPending ? "Creating..." : "Create User"} roles={roles} tenants={tenants} showPassword={true} theme="dark"
        />
      )}

      {editingUser && (
        <UserModal 
          title="Edit User" user={editingUser} onChange={setEditingUser} onSubmit={handleEditUser} onCancel={() => setEditingUser(null)}
          isSubmitting={editUserMutation.isPending} submitLabel={editUserMutation.isPending ? "Saving..." : "Save Changes"} roles={roles} theme="dark"
        />
      )}

      {queryError && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 flex items-start">
          <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" /><p>{(queryError as Error).message || "Failed to load users data"}</p>
        </div>
      )}

      <UserTable 
        users={users} loading={loading} actionLoading={actionLoading} showTenant={true}
        onEdit={setEditingUser} onToggleStatus={handleToggleStatus} onDelete={handleDeleteUser} theme="dark"
      />
    </div>
  );
}
