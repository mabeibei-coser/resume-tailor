"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ModeValue = "moderate" | "aggressive";

/*
 * 适中图标：精密笔尖 + 一条小修改线
 * 视觉语义：精准打磨、轻微润色
 */
function IconModerate({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect
        x="8"
        y="6"
        width="24"
        height="28"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M14 15h12M14 20h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M14 25h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* 小笔 — 在文档上做精确标注 */}
      <path
        d="M28 22l-6 6-1.5.5.5-1.5 6-6z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M28 22l-6 6-1.5.5.5-1.5 6-6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M26 24l2-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/*
 * 激进图标：文档碎裂/重组 — 箭头穿过文档
 * 视觉语义：打散重组、大幅改写
 */
function IconAggressive({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={className}
    >
      {/* 左半文档（被拆开） */}
      <path
        d="M8 9a3 3 0 0 1 3-3h7l-2 17H9a3 3 0 0 1-3-3V9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        opacity="0.45"
      />
      {/* 右半文档（被拆开） */}
      <path
        d="M24 23l2-17h5a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3h-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        opacity="0.45"
      />
      {/* 中心闪电 — 变革力量 */}
      <path
        d="M22 8l-5 10h5l-3 14 10-16h-6l4-8h-5Z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M22 8l-5 10h5l-3 14 10-16h-6l4-8h-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
      {/* ─── 适中 ─── */}
      <ModeCard
        name={name}
        value="moderate"
        active={value === "moderate"}
        onChange={onChange}
        disabled={disabled}
        icon={<IconModerate className="size-9" />}
        title="适中"
        badge="推荐"
        badgeClass="bg-emerald-50 text-emerald-700 border-emerald-200"
        description="保留原经历，精准匹配 JD，整体风格稳妥"
        accentClass="border-l-[var(--blue-500)]"
        activeClass="border-[var(--blue-400)] bg-gradient-to-br from-[var(--blue-50)]/80 to-white shadow-[0_4px_20px_-6px_oklch(0.55_0.18_250/0.25)]"
        iconBg="bg-[var(--blue-50)] text-[var(--blue-600)]"
        iconBgActive="bg-[var(--blue-500)] text-white"
      />

      {/* ─── 激进 ─── */}
      <ModeCard
        name={name}
        value="aggressive"
        active={value === "aggressive"}
        onChange={onChange}
        disabled={disabled}
        icon={<IconAggressive className="size-9" />}
        title="激进"
        badge="仅参考"
        badgeClass="bg-amber-50 text-amber-700 border-amber-200"
        description="重组结构、补强匹配点，大幅度改写"
        accentClass="border-l-amber-400"
        activeClass="border-amber-300 bg-gradient-to-br from-amber-50/80 to-white shadow-[0_4px_20px_-6px_oklch(0.62_0.14_55/0.25)]"
        iconBg="bg-amber-50 text-amber-600"
        iconBgActive="bg-amber-500 text-white"
      />
    </div>
  );
}

function ModeCard({
  name,
  value,
  active,
  onChange,
  disabled,
  icon,
  title,
  badge,
  badgeClass,
  description,
  accentClass,
  activeClass,
  iconBg,
  iconBgActive,
}: {
  name: string;
  value: ModeValue;
  active: boolean;
  onChange: (v: ModeValue) => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
  accentClass: string;
  activeClass: string;
  iconBg: string;
  iconBgActive: string;
}) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer items-start gap-4 rounded-2xl border-l-[3px] border border-[var(--border)] bg-white p-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-5",
        active
          ? cn(accentClass, activeClass)
          : cn(
              "border-l-transparent",
              "hover:border-[var(--blue-200)] hover:shadow-[0_2px_12px_-4px_oklch(0.55_0.18_250/0.12)]"
            ),
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={active}
        onChange={() => onChange(value)}
        disabled={disabled}
        className="sr-only"
      />

      {/* 图标 */}
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
          active ? iconBgActive : iconBg
        )}
      >
        {icon}
      </div>

      {/* 文字区 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
            {title}
          </span>
          <span
            className={cn(
              "rounded-md border px-1.5 py-px text-[10px] font-medium",
              badgeClass
            )}
          >
            {badge}
          </span>
        </div>
        <p className="mt-1 text-xs leading-[1.6] text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>

      {/* 选中指示器 */}
      <div
        className={cn(
          "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
          active
            ? value === "aggressive"
              ? "border-amber-500 bg-amber-500"
              : "border-[var(--blue-500)] bg-[var(--blue-500)]"
            : "border-[var(--border)]"
        )}
      >
        {active && (
          <svg
            viewBox="0 0 12 12"
            className="size-2.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 6L5 8.5L9.5 3.5" />
          </svg>
        )}
      </div>
    </label>
  );
}
