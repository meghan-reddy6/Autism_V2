import { Inter } from "next/font/google";
import { Activity, Users, Settings, FileText } from "lucide-react";
import React from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex h-screen overflow-hidden`}>
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <Activity className="h-6 w-6 text-blue-600 mr-3" />
            <span className="font-bold text-slate-800 text-lg">NeuroScout</span>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <NavItem icon={<Users />} label="Patient Roster" active={false} />
            <NavItem icon={<FileText />} label="Assessments" active={true} />
            <NavItem
              icon={<Settings />}
              label="ML Configuration"
              active={false}
            />
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}

function NavItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactElement;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href="/"
      className={`flex items-center px-3 py-2 rounded-md transition-colors ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {React.cloneElement(icon, { className: "h-5 w-5 mr-3" })}
      <span className="font-medium">{label}</span>
    </a>
  );
}
