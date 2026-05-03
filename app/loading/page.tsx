"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Circle, AlertTriangle } from "lucide-react";
import {
  generateTailor,
  type SectionProgress,
} from "@/lib/report-client";
import type { TailorFormData } from "@/lib/types";

export default function LoadingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<SectionProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let formData: TailorFormData | null = null;
    try {
      const raw = sessionStorage.getItem("tailor:form");
      if (!raw) {
        router.replace("/form");
        return;
      }
      formData = JSON.parse(raw) as TailorFormData;
      if (!formData?.jobTitle || !formData?.jd || !formData?.resumeText) {
        router.replace("/form");
        return;
      }
    } catch {
      router.replace("/form");
      return;
    }

    const fd = formData;
    const slowTimer = setTimeout(() => setSlowWarning(true), 90_000);
    (async () => {
      try {
        const report = await generateTailor(fd, {
          onProgress: (p) => setProgress(p),
        });
        sessionStorage.setItem("tailor:report", JSON.stringify(report));
        setDone(true);
        // 让用户看到完成态再跳
        setTimeout(() => router.push("/report"), 600);
      } catch (e) {
        // generateTailor 内部已 fallback，到这里只剩极端情况
        console.error("[loading] generateTailor failed:", e);
        setError(e instanceof Error ? e.message : "生成失败");
      } finally {
        clearTimeout(slowTimer);
      }
    })();
  }, [router]);

  const hasFallback = progress.some((p) => p.status === "fallback");

  return (
    <main className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center bg-[var(--background)] px-4 py-10">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.88_0.05_240/0.4),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_105%,oklch(0.94_0.015_60/0.3),transparent)]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 text-center"
      >
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          正在为你定制简历...
        </h1>
        <p className="text-sm text-muted-foreground">
          AI 正在分析岗位 JD 与你的简历，请稍候
        </p>
      </motion.div>

      <div className="w-full space-y-3">
        <AnimatePresence>
          {progress.map((p) => (
            <SectionCard key={p.key} progress={p} />
          ))}
        </AnimatePresence>
        {progress.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            正在准备...
          </div>
        )}
      </div>

      {slowWarning && !hasFallback && !error && !done && (
        <div className="mt-6 flex w-full items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
          <p>生成比预期慢一些，正在等待 AI 服务响应，请继续等待…</p>
        </div>
      )}

      {hasFallback && !error && (
        <div className="mt-6 flex w-full items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p>服务繁忙，已为你生成模板版报告，可作为参考。</p>
            <button
              type="button"
              onClick={() => router.push("/form")}
              className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
            >
              重新填写并重试
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 flex w-full items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => router.push("/form")}
              className="mt-2 inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-white px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/5"
            >
              重新填写并重试
            </button>
          </div>
        </div>
      )}

      {done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex items-center gap-2 text-sm text-emerald-600"
        >
          <CheckCircle2 className="size-5" />
          已完成，正在跳转...
        </motion.div>
      )}
    </main>
  );
}

function SectionCard({ progress }: { progress: SectionProgress }) {
  const isLoading = progress.status === "loading";
  const isDone =
    progress.status === "completed" ||
    progress.status === "fallback" ||
    progress.status === "skipped";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
        isLoading
          ? "border-blue-300 bg-blue-50/60"
          : isDone
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-border bg-card"
      }`}
    >
      <StatusIcon status={progress.status} />
      <div className="flex-1 text-sm font-medium">{progress.label}</div>
      <span
        className={`shrink-0 text-xs ${
          isLoading
            ? "text-blue-700"
            : progress.status === "fallback"
            ? "text-amber-700"
            : isDone
            ? "text-emerald-700"
            : "text-muted-foreground"
        }`}
      >
        {statusText(progress.status)}
      </span>
    </motion.div>
  );
}

function StatusIcon({ status }: { status: SectionProgress["status"] }) {
  if (status === "completed") {
    return <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />;
  }
  if (status === "fallback") {
    return <AlertTriangle className="size-5 shrink-0 text-amber-500" />;
  }
  if (status === "loading") {
    return <Loader2 className="size-5 shrink-0 animate-spin text-blue-500" />;
  }
  return <Circle className="size-5 shrink-0 text-muted-foreground/40" />;
}

function statusText(status: SectionProgress["status"]): string {
  switch (status) {
    case "pending":
      return "排队中";
    case "loading":
      return "生成中";
    case "completed":
      return "已完成";
    case "fallback":
      return "已降级";
    case "skipped":
      return "已跳过";
    default:
      return "";
  }
}
