"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type ModeValue = "moderate" | "aggressive";

interface ModeOption {
  value: ModeValue;
  title: string;
  badge: string;
  badgeTone: "positive" | "warning";
  description: string;
  glyph: React.ReactNode;
}

// 适中：羽毛笔 — 轻触、精准、克制
const GlyphModerate = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M20 4C16 4 10 7 8 14l-4 6h4l1-3c1 .5 2 .5 3 0l1 3h4l-4-6c2-4 4-6 7-7l.5-.5A1 1 0 0 0 20 4Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M8 14c1-2 2.5-3 4-3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// 激进：闪电 — 强力、破局、彻底改写
const GlyphAggressive = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M13 2L4.5 13H11L9.5 22L20 10H13.5L15 2H13Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

const OPTIONS: ModeOption[] = [
  {
    value: "moderate",
    title: "适中",
    badge: "推荐",
    badgeTone: "positive",
    description: "保留原经历，精准匹配 JD，整体风格稳妥",
    glyph: GlyphModerate,
  },
  {
    value: "aggressive",
    title: "激进",
    badge: "仅参考",
    badgeTone: "warning",
    description: "重组结构、补强匹配点，大幅度改写",
    glyph: GlyphAggressive,
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
      className={cn("grid grid-cols-2 gap-3", className)}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        const isAggressive = opt.value === "aggressive";
        return (
          <label
            key={opt.value}
            className={cn(
              "group relative flex cursor-pointer flex-col gap-2.5 rounded-2xl border bg-white p-3.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-4",
              active
                ? isAggressive
                  ? "border-amber-400 bg-amber-50/50 shadow-[0_8px_28px_-12px_oklch(0.62_0.14_55/0.35)]"
                  : "border-[var(--blue-500)] bg-[var(--blue-50)]/60 shadow-[0_8px_28px_-12px_oklch(0.55_0.18_250/0.35)]"
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

            {/* 图标 + 选中圈 */}
            <div className="flex items-start justify-between">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl transition-colors duration-300",
                  active
                    ? isAggressive
                      ? "bg-amber-500 text-white"
                      : "bg-[var(--blue-500)] text-white"
                    : isAggressive
                    ? "bg-amber-50 text-amber-500 group-hover:bg-amber-100"
                    : "bg-[var(--blue-50)] text-[var(--blue-500)] group-hover:bg-[var(--blue-100)]"
                )}
              >
                <span className="size-[18px]">{opt.glyph}</span>
              </div>
              <span
                className={cn(
                  "flex size-4.5 items-center justify-center rounded-full border transition-all duration-300",
                  active
                    ? isAggressive
                      ? "border-amber-400 bg-amber-400 text-white"
                      : "border-[var(--blue-500)] bg-[var(--blue-500)] text-white"
                    : "border-[var(--border)] bg-transparent text-transparent"
                )}
              >
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            </div>

            {/* 标题 + badge + 描述 */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                  {opt.title}
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-mono text-[9px] font-medium",
                    opt.badgeTone === "positive"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  )}
                >
                  {opt.badge}
                </span>
              </div>
              <p className="text-[11px] leading-[1.55] text-[var(--muted-foreground)]">
                {opt.description}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
