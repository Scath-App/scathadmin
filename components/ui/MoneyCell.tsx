"use client";

/** Format an amount in kobo to a naira string: ₦1,234.56 */
export function formatNaira(kobo: number | null | undefined): string {
  if (kobo == null || isNaN(kobo)) return "₦0.00";
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Format a value that is already in naira (fee revenue report) */
export function formatNairaRaw(naira: number | null | undefined): string {
  if (naira == null || isNaN(naira)) return "₦0.00";
  return `₦${Number(naira).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface MoneyCellProps {
  /** Amount in kobo */
  kobo?: number | null;
  /** Amount already in naira (no conversion) */
  naira?: number | null;
  className?: string;
}

/**
 * Table cell for monetary values.
 * Pass `kobo` for kobo→naira conversion or `naira` for pre-converted values.
 * Renders right-aligned monospace text.
 */
export function MoneyCell({ kobo, naira, className }: MoneyCellProps) {
  const display =
    naira != null ? formatNairaRaw(naira) : formatNaira(kobo);

  return (
    <span
      className={`font-mono text-sm tabular-nums text-gray-900 ${className ?? ""}`}
    >
      {display}
    </span>
  );
}
