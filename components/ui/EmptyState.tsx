"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className ?? ""}`}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-blue/5 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-blue/40" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
      {message && (
        <p className="text-sm text-gray-500 max-w-xs">{message}</p>
      )}
      {actionLabel && onAction && (
        <Button
          className="mt-5 bg-blue hover:bg-darkBlue text-white"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
