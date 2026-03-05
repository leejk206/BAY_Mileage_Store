"use client";

import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

export function SectionHeader({ title, subtitle, rightSlot }: Props) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        )}
      </div>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </div>
  );
}

