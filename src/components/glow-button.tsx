import type { ButtonHTMLAttributes, ReactNode } from "react";

export function GlowButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={`relative isolate inline-flex rounded-full p-px disabled:opacity-50 ${className}`}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-black">
        {children}
      </span>
      <span
        className="absolute inset-0 rounded-full opacity-90"
        style={{
          background:
            "radial-gradient(20.7% 50% at 50% 0%, hsl(172, 66%, 50%) 0%, rgba(20, 184, 166, 0) 100%)",
          filter: "blur(2px)",
        }}
      />
      <span className="absolute inset-[1px] rounded-full bg-black/5" />
    </button>
  );
}
