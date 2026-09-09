"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/* The handful of form parts the admin screens share. Deliberately plain: this
   is an internal tool, and it should look like the site without pretending to
   be a page of it. */

const INPUT_CLASS =
  "min-h-11 w-full rounded-xl border border-stone-dark bg-warm-white px-3.5 text-sm text-charcoal outline-none placeholder:text-charcoal/35 focus:border-forest focus:ring-1 focus:ring-forest";

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="flex items-baseline gap-2">
        <Label>{label}</Label>
        {required && <span className="text-[11px] text-clay">required</span>}
        {hint && <span className="text-[11px] text-charcoal/40">{hint}</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={INPUT_CLASS}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(INPUT_CLASS, "resize-y py-2.5 leading-relaxed")}
    />
  );
}
