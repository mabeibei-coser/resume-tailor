"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileUpload,
  type FileUploadValue,
} from "@/components/ui/file-upload";
import { ModeRadio, type ModeValue } from "@/components/ui/mode-radio";
import { cn } from "@/lib/utils";
import type { TailorFormData, TailorMode } from "@/lib/types";
import { startReportPrefetch } from "@/lib/report-prefetch";

const formSchema = z.object({
  jobTitle: z
    .string()
    .min(1, "请输入岗位名称")
    .max(60, "岗位名称过长"),
  jd: z.string().min(20, "JD 至少 20 字"),
  mode: z.enum(["moderate", "aggressive"]),
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { num: "01", label: "目标岗位", caption: "Target" },
  { num: "02", label: "岗位 JD", caption: "Description" },
  { num: "03", label: "上传简历", caption: "Resume" },
  { num: "04", label: "优化程度", caption: "Mode" },
];

export default function FormPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resume, setResume] = useState<FileUploadValue | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const jdValue = watch("jd") ?? "";
  const modeValue = watch("mode") ?? "moderate";
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
    };

    sessionStorage.setItem("tailor:form", JSON.stringify(payload));
    console.log("[FORM] resumeText length:", payload.resumeText.length);

    startReportPrefetch(payload);

    router.push("/interview");
  };

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-[var(--blue-50)] via-white to-[var(--blue-100)]/40">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 -left-32 size-[28rem] rounded-full bg-[var(--blue-200)]/40 blur-3xl" />
        <div className="absolute top-[40%] -right-40 size-[32rem] rounded-full bg-[var(--blue-100)]/60 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[20%] size-[24rem] rounded-full bg-[var(--blue-100)]/50 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-[var(--blue-500)] text-white shadow-sm">
            <Sparkles className="size-4" strokeWidth={2.5} />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--navy-700)]">
            Resume · Tailor
          </span>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] sm:flex">
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--semantic-positive)]" />
          AI · Online
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
        <aside
          className={cnFade(
            mounted,
            "flex flex-col gap-10 lg:sticky lg:top-10 lg:h-fit lg:pt-4"
          )}
          style={{ transitionDelay: "60ms" }}
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--blue-200)] bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--blue-600)] backdrop-blur">
              <span className="size-1.5 rounded-full bg-[var(--blue-500)]" />
              Step 1 of 2 · 输入
            </span>
            <h1 className="mt-5 text-[clamp(2rem,4.4vw,2.875rem)] font-bold leading-[1.05] tracking-tight text-[var(--navy-900)]">
              开始一次
              <br />
              <span className="bg-gradient-to-r from-[var(--blue-600)] to-[var(--blue-400)] bg-clip-text text-transparent">
                精准的简历定制
              </span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-[1.7] text-[var(--muted-foreground)]">
              粘贴一段 JD，上传你的简历。AI 在 30 秒内对照岗位要求重写一份新版本，
              你可在下一步通过语音访谈补充关键经历。
            </p>

            <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--blue-600)]">
              <span>30 秒出初稿</span>
              <ArrowRight className="size-3.5" />
            </div>
          </div>

          <ol className="hidden flex-col gap-3 lg:flex">
            {STEPS.map((s, i) => (
              <li
                key={s.num}
                className={cnFade(
                  mounted,
                  "flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors"
                )}
                style={{ transitionDelay: `${120 + i * 60}ms` }}
              >
                <span className="font-mono text-xs tabular-nums text-[var(--blue-500)]/80">
                  {s.num}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-[var(--blue-200)] to-transparent" />
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-[var(--navy-800)]">
                    {s.label}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    {s.caption}
                  </span>
                </div>
              </li>
            ))}
          </ol>

          <div className="hidden rounded-2xl border border-[var(--blue-100)] bg-white/60 p-4 backdrop-blur lg:block">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Privacy
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--navy-700)]">
              简历仅用于本次定制，不参与训练。下载后即可关闭页面。
            </p>
          </div>
        </aside>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-5"
        >
          <FieldCard
            num="01"
            label="目标岗位"
            caption="Target Role"
            mounted={mounted}
            delay={140}
          >
            <Input
              id="jobTitle"
              placeholder="例如：产品经理 / 前端工程师 / 财务分析"
              autoComplete="off"
              className="h-12 border-[var(--border)] bg-white/80 px-4 text-base sm:text-[15px] shadow-none transition-all duration-300 placeholder:text-[var(--muted-foreground)]/70 focus-visible:border-[var(--blue-400)] focus-visible:ring-[3px] focus-visible:ring-[var(--blue-200)]/60"
              {...register("jobTitle")}
            />
            {errors.jobTitle && (
              <FieldError>{errors.jobTitle.message}</FieldError>
            )}
          </FieldCard>

          <FieldCard
            num="02"
            label="岗位 JD"
            caption="Job Description"
            mounted={mounted}
            delay={200}
            hint={
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums transition-colors duration-300",
                  jdReady
                    ? "text-[var(--semantic-positive)]"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                {jdLen} / 20+
              </span>
            }
          >
            <textarea
              id="jd"
              rows={9}
              placeholder="把招聘网站 / 猎头消息里的整段 JD 复制进来。

例如：
3 年以上产品经理经验，负责 SaaS 工具类产品，熟悉用户增长指标，
能独立撰写 PRD，对数据敏感，掌握 SQL 与基础 A/B 实验方法……"
              {...register("jd")}
              className="block min-h-[240px] w-full resize-y rounded-xl border border-[var(--border)] bg-white/80 px-4 py-3.5 text-base sm:text-[14px] leading-[1.7] outline-none transition-all duration-300 placeholder:text-[var(--muted-foreground)]/55 focus:border-[var(--blue-400)] focus:ring-[3px] focus:ring-[var(--blue-200)]/60"
            />
            {errors.jd && <FieldError>{errors.jd.message}</FieldError>}
          </FieldCard>

          <FieldCard
            num="03"
            label="上传个人简历"
            caption="Resume File"
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
            {resumeError && <FieldError>{resumeError}</FieldError>}
          </FieldCard>

          <FieldCard
            num="04"
            label="优化程度"
            caption="Tailor Mode"
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
            {errors.mode && <FieldError>{errors.mode.message}</FieldError>}
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
              <span
                aria-hidden
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <span className="size-1.5 animate-pulse rounded-full bg-white/80" />
                    正在提交…
                  </>
                ) : (
                  <>
                    开始优化
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </Button>
            <p className="text-center text-xs leading-relaxed text-[var(--muted-foreground)]">
              提交后将进入语音访谈（约 1–3 分钟），用来补充经历细节。
              <br />
              你也可以跳过访谈，直接生成简历。
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

function FieldCard({
  num,
  label,
  caption,
  hint,
  children,
  mounted,
  delay,
}: {
  num: string;
  label: string;
  caption: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  mounted: boolean;
  delay: number;
}) {
  return (
    <section
      className={cnFade(
        mounted,
        "rounded-2xl border border-[var(--blue-100)] bg-white/70 p-5 shadow-[0_2px_10px_-4px_oklch(0.55_0.18_250/0.08)] backdrop-blur transition-shadow duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_6px_22px_-8px_oklch(0.55_0.18_250/0.18)] sm:p-6"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs tabular-nums text-[var(--blue-500)]">
            {num}
          </span>
          <span className="text-sm font-semibold tracking-tight text-[var(--navy-800)]">
            {label}
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] sm:inline">
            {caption}
          </span>
        </div>
        {hint && <div>{hint}</div>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-[var(--destructive)]">
      <span className="size-1 rounded-full bg-[var(--destructive)]" />
      {children}
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
