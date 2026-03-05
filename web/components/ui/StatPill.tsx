"use client";

import { ReactNode } from "react";

type Props = {
  label: string;
  value?: ReactNode;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function StatPill({ label, value, icon, className = "", children }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-[8px] border border-white/15 bg-black/40 px-3 py-1 text-[0.8rem] text-gray-200 ${className}`}
    >
      {icon && <span className="text-[0.8rem]">{icon}</span>}
      <span className="uppercase tracking-[0.05em] text-[11px] font-semibold text-gray-400">
        {label}
      </span>
      <span className="font-medium text-[0.8rem] text-purple-200">
        {value ?? children}
      </span>
    </div>
  );
}

