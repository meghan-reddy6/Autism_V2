import React from "react";
import { Search, Loader2, CheckCircle2, XCircle, Trash2, Edit } from "lucide-react";

export interface UserTableProps {
  users: any[];
  loading: boolean;
  actionLoading: string | null;
  currentUserId?: string;
  showTenant?: boolean;
  theme?: "light" | "dark";
  onEdit: (user: any) => void;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onDelete?: (userId: string) => void;
}

export function UserTable({
  users,
  loading,
  actionLoading,
  currentUserId,
  showTenant = false,
  theme = "light",
  onEdit,
  onToggleStatus,
  onDelete
}: UserTableProps) {
  const isDark = theme === "dark";

  const containerClasses = isDark 
    ? "bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl"
    : "bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm";
    
  const searchContainerClasses = isDark
    ? "p-4 border-b border-slate-800 flex items-center bg-slate-900/50"
    : "p-4 border-b border-slate-100 flex items-center bg-slate-50";

  const searchInputClasses = isDark
    ? "w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 placeholder-slate-600"
    : "w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400";

  const theadClasses = isDark ? "bg-slate-900 border-b border-slate-800" : "bg-slate-50 border-b border-slate-200";
  const thClasses = isDark ? "py-4 px-6 font-semibold text-slate-400 tracking-wider uppercase text-xs" : "py-4 px-6 font-semibold text-slate-700 tracking-wider uppercase text-xs";
  const tbodyClasses = isDark ? "divide-y divide-slate-800/50" : "divide-y divide-slate-100";
  const trClasses = isDark ? "hover:bg-slate-900/50 transition-colors" : "hover:bg-slate-50 transition-colors";

  const avatarClasses = isDark 
    ? "h-10 w-10 flex-shrink-0 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 text-slate-300 font-bold"
    : "h-10 w-10 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200 text-indigo-700 font-bold";

  const textPrimaryClasses = isDark ? "text-white" : "text-slate-900";
  const textSecondaryClasses = isDark ? "text-slate-500" : "text-slate-500";
  
  const roleBadgeClasses = isDark
    ? "px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-blue-900/30 text-blue-400 border border-blue-800/30"
    : "px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100";

  const activeClasses = isDark ? "flex items-center text-emerald-400 text-xs font-medium" : "flex items-center text-emerald-600 text-xs font-medium";
  const inactiveClasses = isDark ? "flex items-center text-red-400 text-xs font-medium" : "flex items-center text-red-600 text-xs font-medium";

  const editBtnClasses = isDark
    ? "inline-flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors text-blue-400 hover:bg-blue-400/10 hover:text-blue-300 mr-2"
    : "inline-flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 mr-2";

  return (
    <div className={containerClasses}>
      <div className={searchContainerClasses}>
        <div className="relative w-full max-w-md">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input 
            type="text" 
            placeholder="Search users by name or email..." 
            className={searchInputClasses}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          <thead className={theadClasses}>
            <tr>
              <th className={thClasses}>User</th>
              <th className={thClasses}>Role</th>
              {showTenant && <th className={thClasses}>Organization</th>}
              <th className={thClasses}>Status</th>
              <th className={`${thClasses} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className={tbodyClasses}>
            {users.map((user) => (
              <tr key={user.id} className={trClasses}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={avatarClasses}>
                      {user.firstName?.[0] || ""}{user.lastName?.[0] || ""}
                    </div>
                    <div className="ml-4">
                      <div className={`text-sm font-semibold ${textPrimaryClasses}`}>{user.firstName} {user.lastName}</div>
                      <div className={`text-xs mt-1 ${textSecondaryClasses}`}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={roleBadgeClasses}>{user.role}</span>
                </td>
                {showTenant && (
                  <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                    {user.tenant ? user.tenant.name : "System"}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isActive ? (
                    <span className={activeClasses}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active</span>
                  ) : (
                    <span className={inactiveClasses}><XCircle className="w-3.5 h-3.5 mr-1" /> Inactive</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => onEdit(user)}
                    className={editBtnClasses}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </button>
                  
                  <button 
                    onClick={() => onToggleStatus(user.id, user.isActive)}
                    disabled={actionLoading === user.id || user.id === currentUserId}
                    className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      user.isActive 
                        ? (isDark ? 'text-red-400 hover:bg-red-400/10 hover:text-red-300' : 'text-red-600 hover:bg-red-50 hover:text-red-700')
                        : (isDark ? 'text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700')
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                  
                  {onDelete && (
                    <button 
                      onClick={() => onDelete(user.id)}
                      disabled={actionLoading === user.id}
                      className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors ml-2 ${
                        isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="Permanently Delete User"
                    >
                      {actionLoading === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={showTenant ? 5 : 4} className={`px-6 py-12 text-center ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
