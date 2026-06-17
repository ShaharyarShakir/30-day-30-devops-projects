"use client";

interface InvestigateButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export function InvestigateButton({
  onClick,
  isLoading = false,
}: InvestigateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Investigating..." : "Investigate Cluster"}
    </button>
  );
}
