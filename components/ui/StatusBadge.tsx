"use client";

import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  // Generic
  active:           "bg-greeny/10 text-greeny border-greeny/30",
  inactive:         "bg-gray-100 text-gray-500 border-gray-200",
  pending:          "bg-yellow/10 text-yellow border-yellow/30",
  rejected:         "bg-red/10 text-red border-red/30",
  approved:         "bg-greeny/10 text-greeny border-greeny/30",
  completed:        "bg-greeny/10 text-greeny border-greeny/30",
  failed:           "bg-red/10 text-red border-red/30",
  cancelled:        "bg-gray-100 text-gray-500 border-gray-200",
  suspended:        "bg-red/10 text-red border-red/30",
  deleted:          "bg-red/10 text-red border-red/30",
  DELETED:          "bg-red/10 text-red border-red/30",
  incomplete:       "bg-gray-100 text-gray-500 border-gray-200",
  INCOMPLETE:       "bg-gray-100 text-gray-500 border-gray-200",

  // Uppercase equivalents
  ACTIVE:           "bg-greeny/10 text-greeny border-greeny/30",
  INACTIVE:         "bg-gray-100 text-gray-500 border-gray-200",
  PENDING:          "bg-yellow/10 text-yellow border-yellow/30",
  REJECTED:         "bg-red/10 text-red border-red/30",
  APPROVED:         "bg-greeny/10 text-greeny border-greeny/30",
  COMPLETED:        "bg-greeny/10 text-greeny border-greeny/30",
  FAILED:           "bg-red/10 text-red border-red/30",
  SUSPENDED:        "bg-red/10 text-red border-red/30",

  // HTTP methods
  GET:              "bg-blue/10 text-blue border-blue/30",
  POST:             "bg-greeny/10 text-greeny border-greeny/30",
  PATCH:            "bg-yellow/10 text-yellow border-yellow/30",
  PUT:              "bg-purple/10 text-purple border-purple/30",
  DELETE:           "bg-red/10 text-red border-red/30",

  // Offer/request
  clicked:          "bg-blue/10 text-blue border-blue/30",
  CLICKED:          "bg-blue/10 text-blue border-blue/30",
  pending_payment:  "bg-yellow/10 text-yellow border-yellow/30",
  PENDING_PAYMENT:  "bg-yellow/10 text-yellow border-yellow/30",
  quoted:           "bg-purple/10 text-purple border-purple/30",
  QUOTED:           "bg-purple/10 text-purple border-purple/30",

  // Savebox
  running:          "bg-blue/10 text-blue border-blue/30",
  RUNNING:          "bg-blue/10 text-blue border-blue/30",
  matured:          "bg-greeny/10 text-greeny border-greeny/30",
  MATURED:          "bg-greeny/10 text-greeny border-greeny/30",
  withdrawn:        "bg-gray-100 text-gray-500 border-gray-200",
  WITHDRAWN:        "bg-gray-100 text-gray-500 border-gray-200",

  // Equity
  open:             "bg-greeny/10 text-greeny border-greeny/30",
  OPEN:             "bg-greeny/10 text-greeny border-greeny/30",
  closed:           "bg-gray-100 text-gray-500 border-gray-200",
  CLOSED:           "bg-gray-100 text-gray-500 border-gray-200",
  funded:           "bg-blue/10 text-blue border-blue/30",
  FUNDED:           "bg-blue/10 text-blue border-blue/30",

  // Payout
  executed:         "bg-greeny/10 text-greeny border-greeny/30",
  EXECUTED:         "bg-greeny/10 text-greeny border-greeny/30",

  // Investment
  ongoing:          "bg-blue/10 text-blue border-blue/30",
  ONGOING:          "bg-blue/10 text-blue border-blue/30",
  settled:          "bg-greeny/10 text-greeny border-greeny/30",
  SETTLED:          "bg-greeny/10 text-greeny border-greeny/30",
  unsettled:        "bg-yellow/10 text-yellow border-yellow/30",
  UNSETTLED:        "bg-yellow/10 text-yellow border-yellow/30",

  // Invoice
  draft:            "bg-gray-100 text-gray-500 border-gray-200",
  DRAFT:            "bg-gray-100 text-gray-500 border-gray-200",
  sent:             "bg-blue/10 text-blue border-blue/30",
  SENT:             "bg-blue/10 text-blue border-blue/30",
  paid:             "bg-greeny/10 text-greeny border-greeny/30",
  PAID:             "bg-greeny/10 text-greeny border-greeny/30",
  overdue:          "bg-red/10 text-red border-red/30",
  OVERDUE:          "bg-red/10 text-red border-red/30",

  // Boolean-like
  true:             "bg-greeny/10 text-greeny border-greeny/30",
  false:            "bg-gray-100 text-gray-500 border-gray-200",
};

interface StatusBadgeProps {
  status: string | null | undefined;
  /** Override display label */
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const key = String(status ?? "");
  const style = STATUS_STYLES[key] ?? "bg-gray-100 text-gray-500 border-gray-200";
  const displayLabel = label ?? key.replace(/_/g, " ");

  return (
    <Badge variant="outline" className={`text-xs capitalize ${style} ${className ?? ""}`}>
      {displayLabel}
    </Badge>
  );
}
