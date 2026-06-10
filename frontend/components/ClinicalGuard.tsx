"use client";

import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const CLINICAL_ROLES = [
  "SUPER_ADMIN", 
  "PLATFORM_ADMIN", 
  "TENANT_ADMIN", 
  "CLINICAL_ADMIN", 
  "SUPERVISOR", 
  "THERAPIST", 
  "ASSESSOR", 
  "DATA_ENTRY", 
  "DOCTOR", 
  "PSYCHOLOGIST"
];

export function ClinicalGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // If the user isn't populated yet, AuthGuard will handle it.
    // We only care if user IS populated but their role is invalid.
    if (user) {
      const roleStr = user.role.replace("Role.", "");
      if (!CLINICAL_ROLES.includes(roleStr)) {
        router.replace("/unauthorized"); // Or back to public portal
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, router]);

  // Block rendering of the clinical children until we explicitly authorize them
  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500 font-medium">Verifying Clinical Access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
