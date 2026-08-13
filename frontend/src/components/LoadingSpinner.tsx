"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({
  size = "md",
  message,
  fullPage = false,
}: LoadingSpinnerProps) {
  const sizes = { sm: 16, md: 24, lg: 40 };
  const px = sizes[size];

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: "spin 0.8s linear infinite" }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#d5dbdb"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="#ff9900"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {message && <p className="text-sm text-[#545b64]">{message}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        {spinner}
      </div>
    );
  }
  return spinner;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-[#aab7b8]">{icon}</div>}
      <h3 className="text-base font-semibold text-[#16191f] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#545b64] mb-6 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
