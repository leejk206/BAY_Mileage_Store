"use client";

import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function NeonButton({ variant = "primary", className = "", ...rest }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-[8px] font-medium text-sm px-4 py-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50 disabled:pointer-events-none";

  const visual =
    variant === "ghost"
      ? "border border-white/20 bg-transparent text-gray-300 hover:bg-white/10"
      : "neon-button shimmer";

  return <button className={`${base} ${visual} ${className}`} {...rest} />;
}

