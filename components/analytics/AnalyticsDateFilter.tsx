"use client";

import { AdminAnalyticsWindow } from "@/lib/analyticsService";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const WINDOW_OPTIONS: { label: string; value: AdminAnalyticsWindow; days: number }[] = [
  { label: "7 days", value: "7d", days: 7 },
  { label: "30 days", value: "30d", days: 30 },
  { label: "90 days", value: "90d", days: 90 },
];

export interface AnalyticsDateFilterProps {
  window: AdminAnalyticsWindow;
  startDate: string;
  endDate: string;
  activeRange: number | null;
  onWindowChange: (window: AdminAnalyticsWindow, days: number) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function AnalyticsDateFilter({
  window,
  startDate,
  endDate,
  activeRange,
  onWindowChange,
  onStartDateChange,
  onEndDateChange,
}: AnalyticsDateFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Quick range options */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {WINDOW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onWindowChange(opt.value, opt.days)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
              activeRange === opt.days
                ? "bg-white shadow-sm text-gray-900 font-semibold"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom dates */}
      <div className="flex items-end gap-2">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-9 text-xs bg-white border-gray-200 w-36 shadow-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-9 text-xs bg-white border-gray-200 w-36 shadow-none"
          />
        </div>
      </div>
    </div>
  );
}
