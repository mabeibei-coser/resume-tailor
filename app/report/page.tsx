"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Download,
  Loader2,
  MessageSquare,
  Sparkles,
  Zap,
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

  // 挂载即在后台预生成 docx，拿到 token 备用
  useEffect(() => {
    if (!report) return;
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
  }, [report]);

  function handleDownload() {
    if (prepareStatus !== "ready" || !token) return;
    const url = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/tailor/docx?token=${encodeURIComponent(token)}`;
    // 用 location.href 触发原生 attachment 下载流（避开 blob: 沙箱拦截 + iOS Safari 文件类型识别）
    window.location.href = url;
  }

  if (!report) return <SkeletonPage />;

  const visibleChanges = report.changes.filter((c) => !c.flagged);
  const isFallback = Boolean((report as unknown as { fallback?: boolean }).fallback);

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[var(--background)] pb-28">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.88_0.05_240/0.4),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_105%,oklch(0.94_0.015_60/0.3),transparent)]" />
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

        {/* Hero + stats strip */}
        <Reveal mounted={mounted} delay={40}>
          <div className="mb-10 border-b border-[var(--border)] pb-8">
            <p className="mb-3 text-xs font-medium tracking-[0.2em] uppercase text-[var(--blue-500)]">
              分析完成
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--navy-950)] sm:text-3xl">
              已找到{" "}
              <span className="text-[var(--blue-600)]">{report.suggestions.length} 处</span>
              {" "}可优化内容
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              AI 对照 JD 逐条检查，以下是具体问题和改法
            </p>

            {/* Stats chips */}
            <div className="mt-5 flex flex-wrap gap-3">
              <StatChip icon={<Zap className="size-3" />} count={report.suggestions.length} label="项问题已修复" />
              <StatChip icon={<MessageSquare className="size-3" />} count={report.interview.length} label="道面试题备好了" />
            </div>
          </div>
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
              <p className="text-sm font-medium text-[var(--navy-900)]">简历定制完成</p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Word 格式，可直接编辑，一键投递
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={prepareStatus !== "ready"}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--navy-950)] px-6 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.4)] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:ml-auto sm:w-auto sm:min-w-[160px]"
            >
              {prepareStatus === "preparing" ? (
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

function StatChip({
  icon,
  count,
  label,
  badge,
  warning,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  badge?: string;
  warning?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur ${
        warning
          ? "border-amber-200 bg-amber-50/80 text-amber-900"
          : "border-[var(--blue-100)] bg-white/80 text-[var(--navy-800)]"
      }`}
    >
      <span className={warning ? "text-amber-600" : "text-[var(--blue-500)]"}>{icon}</span>
      <span className={`font-mono tabular-nums ${warning ? "text-amber-700" : "text-[var(--blue-600)]"}`}>
        {count}
      </span>
      {label}
      {badge && (
        <span className="ml-0.5 rounded-full bg-amber-100 px-1.5 font-mono text-[10px] text-amber-700">
          {badge}
        </span>
      )}
    </span>
  );
}

function SectionHeader({
  num,
  title,
  caption,
  count,
}: {
  num: string;
  title: string;
  caption: string;
  count?: number;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs tabular-nums text-[var(--blue-500)]">{num}</span>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-2xl">{title}</h2>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] sm:inline">
            {caption}
          </span>
        </div>
        {typeof count === "number" && (
          <span className="font-mono text-xs tabular-nums text-[var(--blue-500)]">{count} 项</span>
        )}
      </div>
      <div className="mt-2.5 h-px bg-gradient-to-r from-[var(--blue-200)] via-[var(--blue-100)] to-transparent" />
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
      <SectionHeader num="01" title="简历问题项" caption="Issues" count={suggestions.length} />
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
      <SectionHeader num="02" title="改写明细" caption="Diff" count={changes.length} />
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
      <SectionHeader num="02" title="该岗位高频面试问答" caption="Interview" count={questions.length} />
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
