import { cn } from "@/lib/utils/cn";

/**
 * One heading treatment for every wizard step — icon, question, optional hint —
 * so moving between steps feels like one form rather than seven screens.
 */
export function StepHeading({
  icon: Icon,
  title,
  hint,
  as = "h2",
  className,
}: {
  icon: (props: { className?: string }) => React.ReactNode;
  title: string;
  hint?: string;
  as?: "h2" | "legend";
  className?: string;
}) {
  const Title = as;
  return (
    <div className={cn("w-full", className)}>
      <Title className="flex items-center gap-3 font-display text-2xl text-charcoal md:text-[1.75rem]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
          <Icon className="h-5 w-5" />
        </span>
        {title}
      </Title>
      {hint && <p className="mt-3 text-sm leading-relaxed text-charcoal/60">{hint}</p>}
    </div>
  );
}
