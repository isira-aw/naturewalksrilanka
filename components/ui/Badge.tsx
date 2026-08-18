import { cn } from "@/lib/utils/cn";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-forest/30 bg-forest/5 px-3 py-1 font-utility text-xs uppercase tracking-wide text-forest",
        className
      )}
    >
      {children}
    </span>
  );
}
