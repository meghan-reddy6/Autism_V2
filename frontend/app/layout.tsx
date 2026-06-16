import { Inter } from "next/font/google";
import { Activity, Users, Settings, FileText } from "lucide-react";
import React from "react";
import { ReactQueryProvider } from "@/lib/react-query";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 flex flex-col`}>
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
