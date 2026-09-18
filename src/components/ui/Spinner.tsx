"use client";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

const sizes = { sm: 16, md: 22, lg: 32 };

export function Spinner({ size = "md", color, className = "" }: SpinnerProps) {
  const px = sizes[size];
  const stroke = color ?? "var(--brand-500)";

  return (
    <>
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
        style={{ animation: "pax-spin .75s linear infinite", flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="3" opacity=".2" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <style>{`
        @keyframes pax-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
