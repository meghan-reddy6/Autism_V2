import React from "react";

export interface UserModalProps {
  title: string;
  user: any;
  onChange: (user: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  roles: string[];
  tenants?: any[];
  showPassword?: boolean;
  theme?: "light" | "dark";
}

export function UserModal({
  title,
  user,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
  roles,
  tenants,
  showPassword = false,
  theme = "light"
}: UserModalProps) {
  const isDark = theme === "dark";

  const overlayClasses = isDark ? "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" : "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm";
  const modalClasses = isDark ? "bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl" : "bg-white border border-slate-200 p-6 rounded-xl w-full max-w-md shadow-2xl";
  const titleClasses = isDark ? "text-xl font-bold text-white mb-4" : "text-xl font-bold text-slate-800 mb-4";
  const labelClasses = isDark ? "block text-sm font-medium text-slate-300 mb-1" : "block text-sm font-medium text-slate-700 mb-1";
  const inputClasses = isDark 
    ? "w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-blue-500 outline-none" 
    : "w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:border-indigo-500 outline-none";
  
  const cancelBtnClasses = isDark ? "px-4 py-2 text-slate-300 hover:text-white" : "px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md";
  const submitBtnClasses = isDark 
    ? "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
    : "px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50";

  return (
    <div className={overlayClasses}>
      <div className={modalClasses}>
        <h2 className={titleClasses}>{title}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>First Name</label>
              <input required type="text" value={user.firstName || ""} onChange={e => onChange({...user, firstName: e.target.value})} className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Last Name</label>
              <input required type="text" value={user.lastName || ""} onChange={e => onChange({...user, lastName: e.target.value})} className={inputClasses} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Email</label>
              <input required type="email" value={user.email || ""} onChange={e => onChange({...user, email: e.target.value})} className={inputClasses} />
            </div>
            {showPassword ? (
              <div>
                <label className={labelClasses}>Temp Password</label>
                <input required type="text" value={user.password || ""} onChange={e => onChange({...user, password: e.target.value})} placeholder="Welcome@123" className={inputClasses} />
              </div>
            ) : (
              <div>
                <label className={labelClasses}>Role</label>
                <select value={user.role || ""} onChange={e => onChange({...user, role: e.target.value})} className={inputClasses}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
          </div>
          
          {showPassword && (
             <div>
               <label className={labelClasses}>Role</label>
               <select value={user.role || ""} onChange={e => onChange({...user, role: e.target.value})} className={inputClasses}>
                 {roles.map(r => <option key={r} value={r}>{r}</option>)}
               </select>
             </div>
          )}

          {tenants && tenants.length > 0 && (
            <div>
              <label className={labelClasses}>Organization</label>
              <select value={user.tenantId || ""} onChange={e => onChange({...user, tenantId: e.target.value})} className={inputClasses}>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onCancel} className={cancelBtnClasses}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className={submitBtnClasses}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
