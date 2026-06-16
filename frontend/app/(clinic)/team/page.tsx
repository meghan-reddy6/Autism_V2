"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { Users, Loader2, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { UserTable } from "@/components/shared/UserTable";
import { UserModal } from "@/components/shared/UserModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function TeamManagementPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", firstName: "", lastName: "", role: "DOCTOR" });
  const [editingUser, setEditingUser] = useState<any>(null);

  const isAuthorized = ["ORG_ADMIN", "SUPER_ADMIN"].includes(user?.role as string);

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['teamData'],
    queryFn: async () => {
      const [teamData, rolesData] = await Promise.all([
        fetchApi("/team"),
        fetchApi("/team/roles")
      ]);
      return {
        teamMembers: teamData,
        roles: rolesData.roles.filter((r: string) => r !== "SUPER_ADMIN")
      };
    },
    enabled: isAuthorized
  });

  const teamMembers = data?.teamMembers || [];
  const roles = data?.roles || [];
  const error = queryError ? (queryError as Error).message : "";

  const editUserMutation = useMutation({
    mutationFn: async (updatedUser: any) => {
      await fetchApi(`/team/${updatedUser.id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['teamData'] });
      setEditingUser(null);
    },
    onError: (err: any) => alert(err.message || "Failed to update user")
  });

  const createUserMutation = useMutation({
    mutationFn: async (userToCreate: any) => {
      await fetchApi("/team", {
        method: "POST",
        body: JSON.stringify(userToCreate)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamData'] });
      setIsModalOpen(false);
      setNewUser({ email: "", password: "", firstName: "", lastName: "", role: "DOCTOR" });
    },
    onError: (err: any) => alert(err.message || "Failed to create team member")
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string, currentStatus: boolean }) => {
      await fetchApi("/team/bulk-action", {
        method: "POST",
        body: JSON.stringify({ action: currentStatus ? "deactivate" : "activate", userIds: [userId] })
      });
    },
    onMutate: (variables) => setActionLoading(variables.userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamData'] }),
    onError: (err: any) => alert(err.message || "Action failed"),
    onSettled: () => setActionLoading(null)
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
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this team member?`)) return;
    toggleStatusMutation.mutate({ userId, currentStatus });
  };

  if (!isAuthorized) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <div className="bg-red-50 text-red-600 p-8 rounded-xl border border-red-200 text-center">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-xl font-bold">Unauthorized Access</h2>
            <p className="mt-2">Only Organization Administrators can manage the team.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center items-center h-full min-h-[500px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Team Management</h1>
          <p className="text-slate-500 mt-2">Manage clinic staff, roles, and access.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm font-medium">
          <Users className="w-4 h-4 mr-2" /> Add Team Member
        </button>
      </div>

      {isModalOpen && (
        <UserModal 
          title="Add Team Member" user={newUser} onChange={setNewUser} onSubmit={handleCreateUser} onCancel={() => setIsModalOpen(false)}
          isSubmitting={createUserMutation.isPending} submitLabel={createUserMutation.isPending ? "Adding..." : "Add Member"} roles={roles} showPassword={true} theme="light"
        />
      )}

      {editingUser && (
        <UserModal 
          title="Edit Team Member" user={editingUser} onChange={setEditingUser} onSubmit={handleEditUser} onCancel={() => setEditingUser(null)}
          isSubmitting={editUserMutation.isPending} submitLabel={editUserMutation.isPending ? "Saving..." : "Save Changes"} roles={roles} showPassword={false} theme="light"
        />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 flex items-start">
          <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" /><p>{error}</p>
        </div>
      )}

      <UserTable 
        users={teamMembers} loading={loading} actionLoading={actionLoading} currentUserId={user?.id}
        onEdit={setEditingUser} onToggleStatus={handleToggleStatus} theme="light"
      />
    </div>
  );
}
