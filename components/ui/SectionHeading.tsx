import { cn } from "@/lib/utils/cn";

export function SectionHeading({
  eyebrow,
  title,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {eyebrow && (
        <p className="mb-3 font-utility text-xs uppercase tracking-[0.2em] text-forest">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl leading-tight text-charcoal md:text-5xl">
        {title}
      </h2>
    </div>
  );
}
