"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  tone?: "default" | "danger" | "muted";
  className?: string;
};

export function Badge({ children, tone = "default", className = "" }: Props) {
  let toneClasses = "";
  if (tone === "danger") {
    toneClasses = "bg-red-500/10 text-red-200 border-red-500/40";
  } else if (tone === "muted") {
    toneClasses = "bg-white/5 text-gray-400 border-gray-600/60";
  } else {
    toneClasses = "bg-white/5 text-gray-200 border-gray-500/50";
  }

  return (
    <span
      className={`inline-flex items-center rounded-[8px] border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ${toneClasses} ${className}`}
    >
      {children}
    </span>
  );
}

