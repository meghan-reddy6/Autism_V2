"use client";

import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { token, user, logout } = useAuthStore();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const verifyAdmin = async () => {
      // 1. Give zustand a split second to rehydrate from localStorage if needed
      if (!token) {
        // Wait a tiny bit to see if hydration catches up
        await new Promise(r => setTimeout(r, 100));
        const currentToken = useAuthStore.getState().token;
        if (!currentToken && mounted) {
          setIsChecking(false);
          router.replace("/login");
          return;
        }
      }

      try {
        const response = await fetch('/api/v1/auth/me', {
          headers: { 'Authorization': `Bearer ${useAuthStore.getState().token}` }
        });
        
        const data = await response.json();
        
        if (mounted) {
          if (!response.ok || data.role !== "SUPER_ADMIN") {
            setIsChecking(false);
            router.replace("/");
          } else {
            setAuthorized(true);
            setIsChecking(false);
          }
        }
      } catch (err) {
        if (mounted) {
          setIsChecking(false);
          router.replace("/");
        }
      }
    };

    verifyAdmin();

    return () => { mounted = false; };
  }, [token, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return <>{children}</>;
}
