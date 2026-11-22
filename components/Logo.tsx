import Link from "next/link";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm ${className}`}
      aria-hidden="true"
    >
      <svg className="h-[60%] w-[60%]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 7.5h9a3 3 0 0 1 0 6H6m0-6V6.8A1.8 1.8 0 0 1 7.8 5H18M6 7.5v9A2.5 2.5 0 0 0 8.5 19H18M9 13.5h.01"
        />
      </svg>
    </span>
  );
}

export function Logo({
  href,
  compact = false,
  className = "",
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  const content = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      {!compact && (
        <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Money Tracker <span className="text-emerald-700 dark:text-emerald-400">365</span>
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex" aria-label="Money Tracker 365 home">
      {content}
    </Link>
  );
}
