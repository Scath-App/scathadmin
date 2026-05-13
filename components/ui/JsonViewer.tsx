"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface JsonViewerProps {
  data: unknown;
  collapsed?: boolean;
  label?: string;
  className?: string;
}

export function JsonViewer({ data, collapsed = true, label = "JSON", className }: JsonViewerProps) {
  const [open, setOpen] = useState(!collapsed);

  return (
    <div className={`rounded-lg border border-gray-200 overflow-hidden ${className ?? ""}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {label}
      </button>
      {open && (
        <pre className="text-xs bg-gray-50/50 p-3 overflow-x-auto text-gray-700 leading-relaxed max-h-64 overflow-y-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
