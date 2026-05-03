"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type ModeValue = "moderate" | "aggressive";

interface ModeOption {
  value: ModeValue;
  title: string;
  caption: string;
  description: string;
  glyph: React.ReactNode;
}

const OPTIONS: ModeOption[] = [
  {
    value: "moderate",
    title: "适中",
    caption: "Refine",
    description: "保留原经历事实，仅调整措辞顺序",
    glyph: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 12h6M14 12h6M4 7h12M4 17h16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    value: "aggressive",
    title: "激进",
    caption: "Reshape",
    description: "可重组段落、突出 JD 匹配点",
    glyph: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3c1.5 3 4.5 4.5 4.5 8.5A4.5 4.5 0 0 1 12 16a4.5 4.5 0 0 1-4.5-4.5C7.5 7.5 10.5 6 12 3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M12 19v2M9 20l-1 1M15 20l1 1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

interface ModeRadioProps {
  value: ModeValue;
  onChange: (value: ModeValue) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
}

export function ModeRadio({
  value,
  onChange,
  name = "mode",
  disabled,
  className,
}: ModeRadioProps) {
  return (
    <div
      role="radiogroup"
      aria-label="优化程度"
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "group relative flex cursor-pointer flex-col gap-2 rounded-2xl border bg-white p-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              active
                ? "border-[var(--blue-500)] bg-[var(--blue-50)]/60 shadow-[0_8px_28px_-12px_oklch(0.55_0.18_250/0.35)]"
                : "border-[var(--border)] hover:border-[var(--blue-300)] hover:shadow-[0_4px_18px_-12px_oklch(0.55_0.18_250/0.25)]",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              disabled={disabled}
              className="sr-only"
            />

            <div className="flex items-start justify-between">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl transition-colors duration-300",
                  active
                    ? "bg-[var(--blue-500)] text-white"
                    : "bg-[var(--blue-50)] text-[var(--blue-500)] group-hover:bg-[var(--blue-100)]"
                )}
              >
                <span className="size-5">{opt.glyph}</span>
              </div>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border transition-all duration-300",
                  active
                    ? "border-[var(--blue-500)] bg-[var(--blue-500)] text-white"
                    : "border-[var(--border)] bg-transparent text-transparent"
                )}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            </div>

            <div className="mt-1 flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                  {opt.title}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  {opt.caption}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                {opt.description}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
