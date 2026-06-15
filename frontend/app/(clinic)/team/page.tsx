"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { Users, Loader2, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { UserTable } from "@/components/shared/UserTable";
import { UserModal } from "@/components/shared/UserModal";

export default function TeamManagementPage() {
  const { user } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", firstName: "", lastName: "", role: "DOCTOR" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);

  const isAuthorized = ["ORG_ADMIN", "SUPER_ADMIN"].includes(user?.role as string);

  useEffect(() => {
    if (isAuthorized) {
        loadTeam();
    } else {
        setLoading(false);
    }
  }, [isAuthorized]);

  async function loadTeam() {
    try {
      const [teamData, rolesData] = await Promise.all([
        fetchApi("/team"),
        fetchApi("/team/roles")
      ]);
      setTeamMembers(teamData);
      setRoles(rolesData.roles.filter((r: string) => r !== "SUPER_ADMIN"));
    } catch (err: any) {
      setError(err.message || "Failed to load team data");
    } finally {
      setLoading(false);
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsEditSubmitting(true);
    try {
      await fetchApi(`/team/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          email: editingUser.email,
          role: editingUser.role,
        })
      });
      await loadTeam();
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message || "Failed to update user");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetchApi("/team", {
        method: "POST",
        body: JSON.stringify(newUser)
      });
      await loadTeam();
      setIsModalOpen(false);
      setNewUser({ email: "", password: "", firstName: "", lastName: "", role: "DOCTOR" });
    } catch (err: any) {
      alert(err.message || "Failed to create team member");
    } finally {
      setIsSubmitting(false);
    }
  };

  async function handleToggleStatus(userId: string, currentStatus: boolean) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this team member?`)) return;
    setActionLoading(userId);
    try {
      await fetchApi("/team/bulk-action", {
        method: "POST",
        body: JSON.stringify({ action: currentStatus ? "deactivate" : "activate", userIds: [userId] })
      });
      await loadTeam();
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

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
          isSubmitting={isSubmitting} submitLabel={isSubmitting ? "Adding..." : "Add Member"} roles={roles} showPassword={true} theme="light"
        />
      )}

      {editingUser && (
        <UserModal 
          title="Edit Team Member" user={editingUser} onChange={setEditingUser} onSubmit={handleEditUser} onCancel={() => setEditingUser(null)}
          isSubmitting={isEditSubmitting} submitLabel={isEditSubmitting ? "Saving..." : "Save Changes"} roles={roles} showPassword={false} theme="light"
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
