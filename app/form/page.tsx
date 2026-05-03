"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileUpload,
  type FileUploadValue,
} from "@/components/ui/file-upload";
import { ModeRadio, type ModeValue } from "@/components/ui/mode-radio";
import { cn } from "@/lib/utils";
import type { ResumeJSON, TailorFormData, TailorMode } from "@/lib/types";
import { startReportPrefetch } from "@/lib/report-prefetch";
import { API_BASE } from "@/lib/api-base";

const formSchema = z.object({
  jobTitle: z
    .string()
    .min(1, "请输入岗位名称")
    .max(60, "岗位名称过长"),
  jd: z.string().min(20, "JD 至少 20 字"),
  mode: z.enum(["moderate", "aggressive"]),
});

type FormValues = z.infer<typeof formSchema>;

// 全流程 3 步 stepper：填表 → 访谈 → 报告（loading 是过渡态，不算独立 step）
const STEPS = [
  { id: 1, label: "填表" },
  { id: 2, label: "访谈" },
  { id: 3, label: "报告" },
];

export default function FormPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resume, setResume] = useState<FileUploadValue | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const parsedResumeRef = useRef<ResumeJSON | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!resume?.text) {
      parsedResumeRef.current = null;
      return;
    }
    const controller = new AbortController();
    fetch(`${API_BASE}/api/dev/parse-resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: resume.text }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          parsedResumeRef.current = json.data as ResumeJSON;
          console.info("[FORM] resume pre-parsed successfully");
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [resume?.text]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: "",
      jd: "",
      mode: "moderate",
    },
  });

  const jobTitleValue = watch("jobTitle") ?? "";
  const jdValue = watch("jd") ?? "";
  const modeValue = watch("mode") ?? "moderate";
  const jobTitleValid = jobTitleValue.length > 0;
  const jdLen = jdValue.length;
  const jdReady = jdLen >= 20;

  const onSubmit = (data: FormValues) => {
    if (isSubmitting) return;
    if (!resume?.text) {
      setResumeError("请先上传简历");
      return;
    }
    setResumeError(null);
    setIsSubmitting(true);

    const payload: TailorFormData = {
      jobTitle: data.jobTitle,
      jd: data.jd,
      resumeText: resume.text,
      resumeRef: resume.resumeRef,
      resumeFilename: resume.resumeFilename ?? resume.fileName,
      mode: data.mode as TailorMode,
      ...(parsedResumeRef.current && { parsedResume: parsedResumeRef.current }),
    };

    sessionStorage.setItem("tailor:form", JSON.stringify(payload));
    console.log("[FORM] resumeText length:", payload.resumeText.length);

    startReportPrefetch(payload);

    router.push("/interview");
  };

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

      <div className="mx-auto max-w-2xl px-5 pb-20 sm:px-8">
        <div
          className={cnFade(mounted, "mt-6 mb-10")}
          style={{ transitionDelay: "60ms" }}
        >
          <h1
            className="font-heading font-black leading-[1.1] tracking-tight text-[var(--navy-950)]"
            style={{ fontSize: "clamp(2.2rem, 5.5vw, 3.6rem)" }}
          >
            AI 简历精准修
            <br />
            <span className="text-[var(--blue-600)]">面试问答超一流</span>
          </h1>
          <div aria-hidden className="mt-3 h-[3px] w-12 rounded-full bg-[var(--blue-500)]" />
          <p className="mt-2 text-[14px] leading-[1.7] text-[var(--muted-foreground)] max-w-md">
            上传简历 + 贴入 JD，AI 逐条对照岗位要求，精准改写每一行。
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mt-5 flex flex-col gap-5"
        >
          <FieldCard
            num="01"
            label="目标岗位"
            mounted={mounted}
            delay={140}
          >
            <div className="relative">
              <Input
                id="jobTitle"
                placeholder="例如：产品经理 / 前端工程师 / 财务分析"
                autoComplete="off"
                className="h-11 border-[var(--border)] bg-white/80 px-4 pr-10 text-base sm:text-[15px] shadow-none transition-all duration-300 placeholder:text-[var(--muted-foreground)]/70 focus-visible:border-[var(--blue-500)] focus-visible:ring-[3px] focus-visible:ring-[var(--blue-500)]/12"
                {...register("jobTitle")}
              />
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--semantic-positive)] transition-all duration-200",
                  jobTitleValid
                    ? "scale-100 opacity-100"
                    : "scale-50 opacity-0"
                )}
              >
                <Check className="size-4" strokeWidth={3} />
              </span>
            </div>
            <HelperText error={errors.jobTitle?.message} />
          </FieldCard>

          <FieldCard
            num="02"
            label="岗位 JD"
            mounted={mounted}
            delay={200}
            hint={
              <span
                className={cn(
                  "flex items-center gap-1 font-mono text-[10px] tabular-nums transition-colors duration-300",
                  jdReady
                    ? "text-[var(--semantic-positive)]"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                {jdReady && <Check className="size-3" strokeWidth={3} />}
                {jdLen} / 20+
              </span>
            }
          >
            <textarea
              id="jd"
              rows={6}
              placeholder="把招聘网站 / 猎头消息里的整段 JD 复制进来。例如：3 年以上产品经理经验，负责 SaaS 工具类产品，熟悉用户增长指标，能独立撰写 PRD……"
              {...register("jd")}
              className="block min-h-[160px] w-full resize-y rounded-xl border border-[var(--border)] bg-white/80 px-4 py-3 text-base sm:text-[14px] leading-[1.7] outline-none transition-all duration-300 placeholder:text-[var(--muted-foreground)]/55 focus:border-[var(--blue-500)] focus:ring-[3px] focus:ring-[var(--blue-500)]/12"
            />
            <HelperText error={errors.jd?.message} />
          </FieldCard>

          <FieldCard
            num="03"
            label="上传个人简历"
            mounted={mounted}
            delay={260}
          >
            <FileUpload
              value={resume}
              onChange={(v) => {
                setResume(v);
                if (v?.text) setResumeError(null);
              }}
              accept=".pdf,.doc,.docx"
              maxSizeMB={5}
            />
            <HelperText error={resumeError ?? undefined} />
          </FieldCard>

          <FieldCard
            num="04"
            label="优化程度"
            mounted={mounted}
            delay={320}
          >
            <ModeRadio
              value={modeValue as ModeValue}
              onChange={(v) =>
                setValue("mode", v, { shouldValidate: true })
              }
            />
            <input type="hidden" {...register("mode")} />
            {errors.mode && (
              <HelperText error={errors.mode.message} />
            )}
          </FieldCard>

          <div
            className={cnFade(mounted, "mt-4 flex flex-col gap-3")}
            style={{ transitionDelay: "380ms" }}
          >
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="group relative h-14 w-full overflow-hidden rounded-xl bg-[var(--blue-600)] text-base font-semibold tracking-tight text-white shadow-[0_8px_28px_-8px_oklch(0.46_0.19_252/0.55)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-[var(--blue-500)] hover:shadow-[0_14px_36px_-8px_oklch(0.46_0.19_252/0.65)] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {/* 顶部 1px 高光 inset */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-white/30"
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <span className="size-1.5 animate-pulse rounded-full bg-white/80" />
                    正在准备…
                  </>
                ) : (
                  <>
                    生成我的定制简历
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </Button>
            <p className="text-center text-xs leading-relaxed text-[var(--muted-foreground)]">
              提交后进入 1–2 分钟 AI 访谈，补充经历细节效果更好。可跳过直接生成。
            </p>
          </div>
        </form>

        <p
          className={cnFade(
            mounted,
            "mt-10 text-center text-xs text-[var(--muted-foreground)]"
          )}
          style={{ transitionDelay: "440ms" }}
        >
          简历仅用于本次定制，不参与训练。
        </p>
      </div>
    </main>
  );
}

// ============================================================================
// Stepper —— 顶部 3 步进度
// ============================================================================

function Stepper({ mounted }: { mounted: boolean }) {
  const current = 0; // step 1 (填表) active

  return (
    <div
      className={cn(
        "mx-auto flex max-w-[420px] items-center transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        mounted
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2"
      )}
    >
      {STEPS.map((step, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-300",
                  isActive &&
                    "bg-[var(--blue-500)] text-white shadow-[0_0_0_4px_oklch(0.55_0.18_250/0.15),0_4px_12px_-2px_oklch(0.55_0.18_250/0.35)]",
                  isDone && "bg-[var(--blue-500)] text-white",
                  !isActive &&
                    !isDone &&
                    "border border-[var(--blue-200)] bg-white text-[var(--blue-400)]"
                )}
              >
                {isDone ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[11px] tracking-wide transition-colors duration-300",
                  isActive
                    ? "font-semibold text-[var(--navy-900)]"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mt-[-18px] h-px flex-1 transition-colors duration-300",
                  isDone
                    ? "bg-[var(--blue-500)]"
                    : "border-t border-dashed border-[var(--blue-200)]"
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ============================================================================
// FieldCard —— 阴影分层（静态 / hover / focus-within 三档）+ required 标记
// ============================================================================

function FieldCard({
  num,
  label,
  hint,
  required,
  children,
  mounted,
  delay,
}: {
  num: string;
  label: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  mounted: boolean;
  delay: number;
}) {
  return (
    <section
      className={cnFade(
        mounted,
        "rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition-shadow duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-md sm:p-6"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-[var(--blue-50)] font-mono text-[11px] font-bold tabular-nums text-[var(--blue-600)]">
            {num}
          </span>
          <span className="text-sm font-semibold text-[var(--navy-900)]">
            {label}
            {required && (
              <span
                className="ml-1 text-[var(--destructive)]"
                aria-hidden
              >
                *
              </span>
            )}
          </span>
        </div>
        {hint && <div>{hint}</div>}
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

// ============================================================================
// HelperText —— 永远预留 16px 高度，错误时填红字（避免布局抖动）
// ============================================================================

function HelperText({ error }: { error?: string }) {
  return (
    <p className="flex min-h-[16px] items-center gap-1.5 px-1 text-[11.5px] leading-tight">
      {error ? (
        <>
          <span className="size-1 shrink-0 rounded-full bg-[var(--destructive)]" />
          <span className="text-[var(--destructive)]">{error}</span>
        </>
      ) : (
        <span aria-hidden>&nbsp;</span>
      )}
    </p>
  );
}

function cnFade(mounted: boolean, base: string) {
  return cn(
    base,
    "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
  );
}
