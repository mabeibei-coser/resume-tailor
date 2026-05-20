"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

import { generateTailor, type SectionProgress } from "@/lib/report-client";
import type { TailorFormData } from "@/lib/types";
import { API_BASE } from "@/lib/api-base";
import { cn } from "@/lib/utils";

const PHASES = [
  "解析岗位 JD…",
  "匹配你的经历…",
  "起草优化建议…",
  "整理面试问答…",
];

// 每阶段约 4 秒，4 阶段共 16 秒铺满典型生成时间；超时则停在最后一阶段
const PHASE_DURATION_MS = 4000;

export default function LoadingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [progress, setProgress] = useState(0); // 0-100 的伪进度
  const [mounted, setMounted] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 真实 fetch
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
          // 后台仍并发拉 analyze + rewrite，但 UI 不再分两个 task 显示
          // 只用 progress 的 fallback 状态决定是否展示降级 banner
          onProgress: (sections: SectionProgress[]) => {
            if (sections.some((s) => s.status === "fallback")) {
              setFallback(true);
            }
          },
        });
        sessionStorage.setItem("tailor:report", JSON.stringify(report));
        // 后台存档（fire-and-forget，存档失败不影响用户跳转）
        // ⚠️ 必须带 API_BASE 前缀：生产部署在 /a100 子路径下，裸 /api 会丢前缀
        fetch(`${API_BASE}/api/tailor/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formData: fd, report }),
        }).catch(() => {/* 存档失败静默处理 */});
        setDone(true);
        // 让用户看到 100% / 完成态再跳
        setTimeout(() => router.push("/report"), 700);
      } catch (e) {
        console.error("[loading] generateTailor failed:", e);
        setError(e instanceof Error ? e.message : "生成失败");
      } finally {
        clearTimeout(slowTimer);
      }
    })();
  }, [router]);

  // 阶段文案轮播（done 后停）
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setPhaseIdx((i) => Math.min(i + 1, PHASES.length - 1));
    }, PHASE_DURATION_MS);
    return () => clearInterval(t);
  }, [done]);

  // 伪进度：渐近 95%，done 时跳 100
  useEffect(() => {
    if (done) {
      setProgress(100);
      return;
    }
    const t = setInterval(() => {
      setProgress((p) => p + (95 - p) * 0.04);
    }, 250);
    return () => clearInterval(t);
  }, [done]);

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[var(--background)]">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.88_0.05_240/0.4),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_105%,oklch(0.94_0.015_60/0.3),transparent)]" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-start px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-[var(--blue-500)] text-white shadow-sm">
            <Sparkles className="size-4" strokeWidth={2.5} />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--navy-700)]">
            Resume · Tailor
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col px-5 pb-16 sm:px-8">
        {/* 中央 hero —— 单一焦点，不堆装饰 */}
        <div
          className={cn(
            "flex min-h-[60vh] flex-col items-center justify-center text-center transition-opacity duration-700",
            mounted ? "opacity-100" : "opacity-0"
          )}
        >
          <PulseHalo done={done} />

          {/* eyebrow —— 与 /form 的 "RESUME TAILOR" mono 标签呼应 */}
          <p className="mt-10 text-xs font-medium uppercase tracking-[0.22em] text-[var(--blue-500)]">
            {done ? "Done" : "Generating"}
          </p>

          <h1
            className="mt-3 font-bold leading-[1.08] tracking-tight text-[var(--navy-950)]"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}
          >
            {done ? "已为你定制完成" : "正在为你定制简历"}
          </h1>

          {/* 阶段文案轮播 / 完成态 */}
          <div className="relative mt-4 h-6 w-full">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 flex items-center justify-center gap-1.5 text-[14px] text-[var(--semantic-positive)]"
                >
                  <CheckCircle2 className="size-4" strokeWidth={2.5} />
                  正在跳转报告页…
                </motion.div>
              ) : (
                <motion.div
                  key={phaseIdx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 flex items-center justify-center gap-2 text-[14px] text-[var(--muted-foreground)]"
                >
                  <span
                    aria-hidden
                    className="inline-block size-1.5 rounded-full bg-[var(--blue-500)] motion-safe:animate-pulse"
                  />
                  {PHASES[phaseIdx]}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 极简进度条带 shimmer */}
          <ProgressBar progress={progress} done={done} />

          <p className="mt-4 text-[11.5px] tracking-wide text-[var(--muted-foreground)]/75">
            {done ? "100% · 完成" : "约 30 秒 · 请稍候"}
          </p>
        </div>

        {/* 边界状态 banner */}
        {slowWarning && !fallback && !error && !done && <BannerSlow />}
        {fallback && !error && <BannerFallback router={router} />}
        {error && <BannerError error={error} router={router} />}
      </div>
    </main>
  );
}

// ============================================================================
// 中央光晕：脉冲圈 + 中心 brand mark
// ============================================================================

function PulseHalo({ done }: { done: boolean }) {
  return (
    <div className="relative flex size-[112px] items-center justify-center sm:size-[128px]">
      {/* 2 道脉冲圈，交错触发 */}
      {!done && (
        <>
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-[var(--blue-300)]/50"
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: [0.55, 1.6], opacity: [0.55, 0] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-[var(--blue-300)]/50"
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: [0.55, 1.6], opacity: [0.55, 0] }}
            transition={{
              duration: 2.4,
              delay: 1.2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          {/* 静态光晕底层 */}
          <span
            aria-hidden
            className="absolute inset-2 rounded-full bg-[var(--blue-200)]/30 blur-xl"
          />
        </>
      )}

      {/* 中心 brand mark */}
      <motion.div
        className={cn(
          "relative flex size-[64px] items-center justify-center rounded-2xl text-white sm:size-[72px]",
          done
            ? "bg-[var(--semantic-positive)]"
            : "bg-gradient-to-br from-[var(--blue-500)] to-[var(--blue-600)]"
        )}
        style={{
          boxShadow: done
            ? "0 8px 32px -8px oklch(0.55 0.15 155 / 0.55)"
            : "0 12px 36px -8px oklch(0.55 0.18 250 / 0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
        animate={done ? { scale: [1, 1.08, 1] } : { scale: [1, 1.04, 1] }}
        transition={{
          duration: done ? 0.6 : 2.4,
          repeat: done ? 0 : Infinity,
          ease: "easeInOut",
        }}
      >
        {done ? (
          <CheckCircle2 className="size-9 sm:size-10" strokeWidth={2.2} />
        ) : (
          <Sparkles className="size-9 sm:size-10" strokeWidth={2} />
        )}
      </motion.div>
    </div>
  );
}

// ============================================================================
// 进度条：渐近 95% + done 跳 100，带 shimmer
// ============================================================================

function ProgressBar({
  progress,
  done,
}: {
  progress: number;
  done: boolean;
}) {
  return (
    <div className="mt-8 h-[4px] w-[220px] overflow-hidden rounded-full bg-[var(--blue-100)]/70 sm:w-[260px]">
      <motion.div
        className="relative h-full rounded-full bg-gradient-to-r from-[var(--blue-500)] to-[var(--blue-400)]"
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {!done && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent via-white/55 to-transparent"
            animate={{ x: ["-200%", "100%"] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

// ============================================================================
// Banners
// ============================================================================

function BannerSlow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 flex w-full items-start gap-2 rounded-xl border border-[var(--blue-200)] bg-white/70 p-3 text-[12px] text-[var(--navy-800)] backdrop-blur"
    >
      <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-[var(--blue-500)]" />
      <p className="leading-[1.6]">
        生成比预期慢一些，AI 服务正在处理你的请求，请继续等待…
      </p>
    </motion.div>
  );
}

function BannerFallback({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 flex w-full items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50/80 p-3.5 text-[12px] text-amber-900 backdrop-blur"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
      <div className="flex-1 leading-[1.6]">
        <p className="font-medium">服务繁忙，已为你生成模板版报告</p>
        <p className="mt-0.5 text-amber-800/85">
          可作参考；建议稍后重试以获取针对性建议。
        </p>
        <button
          type="button"
          onClick={() => router.push("/form")}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-400/60 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
        >
          重新填写并重试
        </button>
      </div>
    </motion.div>
  );
}

function BannerError({
  error,
  router,
}: {
  error: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 flex w-full items-start gap-2 rounded-xl border border-[var(--semantic-danger)]/30 bg-[var(--semantic-danger)]/5 p-3.5 text-[13px] text-[var(--semantic-danger)] backdrop-blur"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="leading-[1.6]">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/form")}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-[var(--semantic-danger)]/40 bg-white px-2.5 py-1 text-xs font-medium hover:bg-[var(--semantic-danger)]/5"
        >
          重新填写并重试
        </button>
      </div>
    </motion.div>
  );
}
