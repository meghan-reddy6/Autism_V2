import * as React from "react"
import { cn } from "@/lib/tailwindClasses"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-indigo-600 text-white hover:bg-indigo-700": variant === "default",
          "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200": variant === "secondary",
          "border-transparent bg-rose-500 text-white hover:bg-rose-600": variant === "destructive",
          "text-slate-950 border-slate-200": variant === "outline",
          "border-transparent bg-emerald-100 text-emerald-800": variant === "success",
          "border-transparent bg-amber-100 text-amber-800": variant === "warning",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
