"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Download,
  Loader2,
  Sparkles,
} from "lucide-react";

import type {
  DiffChange,
  TailorInterviewQuestion,
  TailorReport,
  TailorSuggestion,
} from "@/lib/types";

// ─────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────

type PrepareStatus = "idle" | "preparing" | "ready" | "error";

export default function ReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<TailorReport | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [prepareStatus, setPrepareStatus] = useState<PrepareStatus>("idle");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isiOS, setIsiOS] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined") {
      setIsiOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    }
  }, []);

  useEffect(() => {
    let raw: string | null = null;
    try { raw = sessionStorage.getItem("tailor:report"); } catch { raw = null; }
    if (!raw) { router.replace("/loading"); return; }
    try { setReport(JSON.parse(raw) as TailorReport); } catch { router.replace("/loading"); }
  }, [router]);

  const isFallback = Boolean((report as unknown as { fallback?: boolean })?.fallback);

  // 挂载即在后台预生成 docx，拿到 token 备用
  // fallback 模式下 LLM 没真正改写过简历，下载只会得到一份污染数据的 Word
  // → 直接跳过 prepare，UI 上把按钮锁成"AI 暂不可用"
  useEffect(() => {
    if (!report) return;
    if (isFallback) return;
    let cancelled = false;
    setPrepareStatus("preparing");
    setDownloadError(null);
    const url = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/tailor/docx/prepare`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: report.resume, changes: report.changes }),
    })
      .then(async (res) => {
        if (!res.ok) {
          let msg = `准备下载失败（${res.status}）`;
          try { const data = await res.json(); if (data?.error) msg = String(data.error); } catch { /* ignore */ }
          throw new Error(msg);
        }
        return res.json() as Promise<{ token: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        setToken(data.token);
        setPrepareStatus("ready");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setDownloadError(e instanceof Error ? e.message : "准备下载失败，请刷新重试");
        setPrepareStatus("error");
      });
    return () => { cancelled = true; };
  }, [report, isFallback]);

  function handleDownload() {
    if (isFallback || prepareStatus !== "ready" || !token) return;
    const url = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/tailor/docx?token=${encodeURIComponent(token)}`;
    // 用 location.href 触发原生 attachment 下载流（避开 blob: 沙箱拦截 + iOS Safari 文件类型识别）
    window.location.href = url;
  }

  if (!report) return <SkeletonPage />;

  const visibleChanges = report.changes.filter((c) => !c.flagged);

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[var(--background)] pb-28">
      {/* 编辑感背景：单层暖白渐晕 + 极淡颗粒（替换原双蓝紫渐变） */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_35%_at_50%_-8%,oklch(0.93_0.025_245/0.35),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Header */}
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <button
          type="button"
          onClick={() => router.push("/form")}
          className="group inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--blue-600)]"
        >
          <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          重新输入
        </button>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-[var(--blue-500)] text-white shadow-sm">
            <Sparkles className="size-4" strokeWidth={2.5} />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--navy-700)]">
            Tailor · Report
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        {/* Fallback banner */}
        {isFallback && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">当前为模板版报告（API 服务繁忙）</p>
              <p className="mt-1 text-xs leading-[1.6] text-amber-800">
                AI 服务暂时不可用，已生成通用模板版本；建议稍后重试以获取针对性建议。
              </p>
              <button
                type="button"
                onClick={() => router.push("/form")}
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50"
              >
                重新填写并重试
              </button>
            </div>
          </div>
        )}

        {/* Hero — editorial：思源宋体大数字 + 时间戳 eyebrow + 单行 meta */}
        <Reveal mounted={mounted} delay={40}>
          <HeroSection
            count={report.suggestions.length}
            interviewCount={report.interview.length}
          />
        </Reveal>

        {/* Content sections */}
        <div className="space-y-12">
          <Reveal mounted={mounted} delay={140}>
            <SuggestionsBlock suggestions={report.suggestions} />
          </Reveal>
          <Reveal mounted={mounted} delay={240}>
            <InterviewBlock questions={report.interview} />
          </Reveal>
        </div>
      </div>

      {/* Sticky download bar */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        {downloadError && (
          <div className="flex items-start gap-2 border-t border-[var(--semantic-danger)]/20 bg-[var(--semantic-danger)]/5 px-5 py-2.5 text-xs text-[var(--semantic-danger)] sm:px-8">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span className="flex-1">
              <span className="font-medium">下载失败：</span>
              {downloadError}
            </span>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="shrink-0 rounded-md border border-[var(--semantic-danger)]/40 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-[var(--semantic-danger)]/5"
            >
              刷新页面
            </button>
          </div>
        )}
        {isiOS && prepareStatus === "ready" && (
          <div className="border-t border-amber-200/60 bg-amber-50/80 px-5 py-2 text-[11px] leading-[1.5] text-amber-800 sm:px-8">
            iPhone 用户：点击后会打开预览，请点右上角「分享」→「存到文件」
          </div>
        )}
        <div className="mx-auto max-w-3xl px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="flex items-center gap-4 rounded-2xl border border-[var(--blue-100)] bg-white/90 px-5 py-4 shadow-[0_-4px_20px_-4px_oklch(0.55_0.18_250/0.08)] backdrop-blur-xl sm:px-6">
            <div className="hidden flex-1 sm:block">
              <p className="text-sm font-medium text-[var(--navy-900)]">
                {isFallback ? "AI 服务暂不可用" : "简历定制完成"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {isFallback
                  ? "本次为通用建议版，无法生成定制 Word，请稍后重试"
                  : "Word 格式，可直接编辑，一键投递"}
              </p>
            </div>
            <button
              type="button"
              onClick={isFallback ? () => router.push("/form") : handleDownload}
              disabled={!isFallback && prepareStatus !== "ready"}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--navy-950)] px-6 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.4)] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:ml-auto sm:w-auto sm:min-w-[160px]"
            >
              {isFallback ? (
                <><AlertTriangle className="size-4" />重新填写并重试</>
              ) : prepareStatus === "preparing" ? (
                <><Loader2 className="size-4 animate-spin" />正在准备…</>
              ) : prepareStatus === "error" ? (
                <><AlertTriangle className="size-4" />准备失败</>
              ) : (
                <><Download className="size-4" />下载定制简历</>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────

function SkeletonPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[var(--background)] pb-32">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <div className="h-4 w-16 animate-pulse rounded-full bg-[var(--muted)]/60" />
        <div className="h-7 w-36 animate-pulse rounded-lg bg-[var(--muted)]/60" />
      </header>
      <div className="mx-auto max-w-4xl space-y-10 px-5 sm:px-8">
        <div className="space-y-4">
          <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--muted)]/50" />
          <div className="h-8 w-72 animate-pulse rounded-xl bg-[var(--muted)]/50" />
          <div className="flex gap-2 pt-1">
            <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--muted)]/40" />
            <div className="h-7 w-28 animate-pulse rounded-full bg-[var(--muted)]/40" />
            <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--muted)]/40" />
          </div>
        </div>
        {[7, 5, 4].map((rows, i) => (
          <div key={i} className="rounded-2xl border border-[var(--blue-100)] bg-white/70 p-5 sm:p-6">
            <div className="mb-1 flex items-baseline gap-3">
              <div className="h-3 w-6 animate-pulse rounded-full bg-[var(--blue-100)]" />
              <div className="h-5 w-24 animate-pulse rounded-lg bg-[var(--muted)]/50" />
            </div>
            <div className="mb-4 mt-2 h-px animate-pulse rounded-full bg-[var(--blue-100)]" />
            <div className="space-y-2.5">
              {Array.from({ length: rows }).map((_, j) => (
                <div
                  key={j}
                  className="h-3.5 animate-pulse rounded-md bg-[var(--muted)]/40"
                  style={{ width: `${60 + ((i * 9 + j * 13) % 35)}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────

function Reveal({
  mounted,
  delay,
  children,
}: {
  mounted: boolean;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Hero（editorial 风格）
// ─────────────────────────────────────────────────

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) { setValue(0); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function HeroSection({
  count,
  interviewCount,
}: {
  count: number;
  interviewCount: number;
}) {
  const animatedCount = useCountUp(count, 1100);
  const animatedInterview = useCountUp(interviewCount, 1100);
  const [today] = useState(todayDateString);

  return (
    <div className="mb-10 border-b border-[var(--report-border)] pb-8 sm:mb-12 sm:pb-10">
      {/* Eyebrow：横线 + 状态 + 日期 */}
      <div className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        <span aria-hidden className="h-px w-6 bg-[var(--report-border)]" />
        <span>分析完成</span>
        <span aria-hidden className="text-[var(--report-divider)]">·</span>
        <span className="tabular-nums">{today}</span>
      </div>

      {/* 两条平行 stat —— 同字号 + 数字蓝色微强调，宽度不够时自然换行 */}
      <h1
        className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5 font-heading text-[22px] font-bold leading-[1.35] tracking-tight text-[var(--navy-900)] sm:text-[28px]"
        aria-label={`${count} 处优化已完成，${interviewCount} 道面试题已就绪`}
      >
        <span>
          <span className="tabular-nums text-[var(--blue-600)]">{animatedCount}</span>
          {" "}处优化已完成
        </span>
        <span>
          <span className="tabular-nums text-[var(--blue-600)]">{animatedInterview}</span>
          {" "}道面试题已就绪
        </span>
      </h1>

      {/* Subtitle */}
      <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
        AI 对照 JD 逐条检查，以下是具体问题和改法
      </p>
    </div>
  );
}

function SectionHeader({
  num,
  title,
  count,
}: {
  num: string;
  title: string;
  count?: number;
}) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="flex min-w-0 items-end gap-3 sm:gap-4">
          {/* 章节编号：思源宋体大号 + ghost 色（不抢标题，但视觉锚点强） */}
          <span
            aria-hidden
            className="font-heading text-[56px] font-black leading-[0.85] tabular-nums text-[var(--navy-900)]/15 sm:text-[72px]"
          >
            {num}
          </span>
          <h2 className="pb-1 font-heading text-xl font-bold tracking-tight text-[var(--navy-900)] sm:pb-2 sm:text-2xl">
            {title}
          </h2>
        </div>
        {typeof count === "number" && (
          <span className="shrink-0 pb-2 font-mono text-xs tabular-nums text-[var(--muted-foreground)]">
            {count} 项
          </span>
        )}
      </div>
      <div className="h-px bg-[var(--report-divider)]" />
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--blue-100)] bg-white/40 px-4 py-8 text-center text-sm text-[var(--muted-foreground)]/80">
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Block 1 · 优化建议
// ─────────────────────────────────────────────────

function SuggestionsBlock({ suggestions }: { suggestions: TailorSuggestion[] }) {
  return (
    <section>
      <SectionHeader num="01" title="简历问题项" count={suggestions.length} />
      {suggestions.length === 0 ? (
        <EmptyHint>该模块暂无数据</EmptyHint>
      ) : (
        <div className="grid gap-3">
          {suggestions.map((s, i) => (
            <SuggestionCard key={i} suggestion={s} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

function SuggestionCard({ suggestion: s, index: i }: { suggestion: TailorSuggestion; index: number }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-[var(--blue-100)] bg-white p-5 shadow-[0_1px_8px_-4px_oklch(0.55_0.18_250/0.07)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--blue-200)] hover:shadow-[0_6px_22px_-6px_oklch(0.55_0.18_250/0.14)] sm:p-6">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] font-mono text-[11px] font-bold tabular-nums text-[var(--blue-600)]">
        {i + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-[var(--navy-900)] sm:text-base">
            {s.title}
          </h3>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
            <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 6L5 8.5L9.5 3.5" />
            </svg>
            已优化
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-[1.65] text-[var(--report-ink-muted)]">
          {s.problem}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Block 2 · 改写明细 diff list
// ─────────────────────────────────────────────────

function ChangesBlock({ changes }: { changes: DiffChange[] }) {
  return (
    <section>
      <SectionHeader num="02" title="改写明细" count={changes.length} />
      {changes.length === 0 ? (
        <EmptyHint>暂无改写建议</EmptyHint>
      ) : (
        <div className="grid gap-3">
          {changes.map((c, i) => (
            <ChangeRow key={i} change={c} />
          ))}
        </div>
      )}
    </section>
  );
}

const ACTION_BADGE: Record<string, string> = {
  replace:
    "border-[var(--blue-200)] bg-[var(--blue-50)] text-[var(--blue-700)]",
  append:
    "border-[oklch(0.88_0.08_155)] bg-[oklch(0.97_0.02_155)] text-[oklch(0.40_0.12_155)]",
  delete:
    "border-[var(--semantic-danger)]/30 bg-[var(--semantic-danger)]/8 text-[var(--semantic-danger)]",
};
const ACTION_LABEL: Record<string, string> = {
  replace: "修改",
  append: "新增",
  delete: "删除",
};

function formatChangeText(text: string | undefined | null): string | null {
  if (!text?.trim()) return null;
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(t);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const o = parsed as Record<string, unknown>;
        if (typeof o.name === "string") {
          const kws = Array.isArray(o.keywords) ? (o.keywords as unknown[]).join("、") : "";
          return kws ? `${o.name}（${kws}）` : o.name;
        }
      }
    } catch { /* not JSON */ }
  }
  return text;
}

function ChangeRow({ change }: { change: DiffChange }) {
  const flagged = !!change.flagged;
  const badgeCls = ACTION_BADGE[change.action] ?? ACTION_BADGE.replace;
  const actionLabel = ACTION_LABEL[change.action] ?? change.action;
  const displayOld = formatChangeText(change.oldText);
  const displayNew = formatChangeText(change.newText);

  return (
    <div
      className={`relative rounded-2xl border p-4 sm:p-5 ${
        flagged
          ? "border-2 border-amber-300 bg-amber-50/30"
          : "border-[var(--blue-100)] bg-white/80"
      }`}
    >
      {flagged && (
        <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-amber-800">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
          AI 想改但被安全规则拦下——不计入下载版本，仅供参考
        </div>
      )}

      {/* Path + action */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <code className="font-mono text-[11px] text-[var(--report-ink-muted)]">{change.path}</code>
        <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${badgeCls}`}>
          {actionLabel}
        </span>
      </div>

      {/* Old / new */}
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">原句</p>
          <div className="min-h-[3rem] rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-[13px] leading-[1.65] text-[var(--report-ink-soft)] whitespace-pre-wrap break-words">
            {displayOld ? (
              displayOld
            ) : (
              <span className="italic opacity-60">（空 / 新增）</span>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${flagged ? "text-amber-700" : "text-[var(--blue-600)]"}`}>
            新句
          </p>
          <div
            className={`min-h-[3rem] rounded-xl border p-3 text-[13px] leading-[1.65] whitespace-pre-wrap break-words ${
              flagged
                ? "border-amber-200 bg-amber-50/50 text-amber-900"
                : "border-[var(--blue-200)] bg-[var(--blue-50)]/60 text-[var(--navy-900)]"
            }`}
          >
            {displayNew ? (
              displayNew
            ) : (
              <span className="italic opacity-60">（删除）</span>
            )}
          </div>
        </div>
      </div>

      {/* Reason */}
      <p className="mt-3 text-[12px] leading-[1.6] text-[var(--report-ink-muted)]">
        <span className="mr-2 font-mono text-[9px] uppercase tracking-[0.18em] opacity-70">理由</span>
        {change.reason}
      </p>

      {flagged && change.flagReason && (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12px] text-amber-800">
          <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-600" />
          <span>
            <span className="font-medium">拦下原因：</span>
            {change.flagReason}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Block 3 · 面试问答（折叠）
// ─────────────────────────────────────────────────

function InterviewBlock({ questions }: { questions: TailorInterviewQuestion[] }) {
  return (
    <section>
      <SectionHeader num="02" title="该岗位高频面试问答" count={questions.length} />
      {questions.length === 0 ? (
        <EmptyHint>该模块暂无数据</EmptyHint>
      ) : (
        <>
          <p className="mb-4 text-sm leading-[1.7] text-[var(--muted-foreground)]">
            基于你的简历和目标 JD，以下是最可能被问到的问题及参考答案。
          </p>
          <div className="grid gap-2.5">
            {questions.map((q, i) => (
              <InterviewItem key={i} question={q} index={i} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function InterviewItem({ question: q, index: i }: { question: TailorInterviewQuestion; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-2xl border transition-colors duration-200 ${
        open ? "border-[var(--blue-200)] bg-white" : "border-[var(--blue-100)] bg-white/80"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 p-4 text-left sm:p-5"
        aria-expanded={open}
      >
        <span className="mt-0.5 font-mono text-xs font-bold tabular-nums text-[var(--blue-500)]">
          Q{i + 1}
        </span>
        <span className="flex-1 text-sm font-medium leading-[1.6] text-[var(--navy-900)] sm:text-[15px]">
          {q.question}
        </span>
        <ChevronDown
          className={`mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-[var(--report-divider)] px-4 pb-5 pt-4 sm:px-5">
          {q.why && (
            <p className="mb-3.5 text-[12px] leading-[1.7] text-[var(--report-ink-muted)]">
              <span className="mr-2 font-mono text-[9px] uppercase tracking-[0.2em] opacity-70">为什么问</span>
              {q.why}
            </p>
          )}
          <div className="rounded-xl border border-[var(--blue-100)] bg-[var(--blue-50)]/60 p-3.5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--blue-600)]">参考回答</p>
            <p className="whitespace-pre-wrap text-[13px] leading-[1.7] text-[var(--navy-800)]">{q.sampleAnswer}</p>
          </div>
          {q.keypoints && q.keypoints.length > 0 && (
            <div className="mt-3.5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                关键点
              </p>
              <div className="flex flex-wrap gap-1.5">
                {q.keypoints.map((k, ki) => (
                  <span
                    key={ki}
                    className="rounded-full border border-[var(--blue-100)] bg-white px-2.5 py-0.5 text-[12px] text-[var(--navy-800)]"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
