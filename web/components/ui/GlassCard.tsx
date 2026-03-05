"use client";

import { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
};

export function GlassCard({ children, className = "" }: GlassCardProps) {
  // Default padded surface for all card-like panels.
  // 기본 패딩: p-6. 필요 시 className으로 Tailwind 패딩 유틸을 명시적으로 덮어쓴다(e.g. `p-3` or `p-0`).
  return <div className={`glass p-6 ${className}`}>{children}</div>;
}

