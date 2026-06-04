"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function AdminLogoutButton() {
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg text-rose-400 hover:bg-rose-950 hover:text-rose-300 transition-colors"
    >
      <LogOut className="w-5 h-5 mr-3 shrink-0" />
      <span>Sign Out</span>
    </button>
  );
}
