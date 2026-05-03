/**
 * Tailor 章节预拉取单例
 * ———————————————
 * /form 页提交瞬间调 startReportPrefetch(formData)，把 2 个章节
 * （analyze / rewrite）的 fetch Promise 存在模块内；
 * /loading 页 mount 时调 consumeReportPrefetch(formData) 取出。
 *
 * 与 career-report 的差异：
 *   - career-report 6 章节 → 这里 2 章节
 *   - career-report 4 章节 prefetch + 2 章节 bg-runner（依赖 quizAnswers）
 *     → 这里访谈输入不进 prompt，2 章节都从 form 提交瞬间启动，无 bg-runner
 *
 * 仅在浏览器 SPA 生命周期内有效；刷新 / 硬跳转会丢失（消费方返回 null，
 * 降级到现场 fetch via report-client 的 callSection）。
 */

import type { TailorFormData } from "@/lib/types";

const PREFETCH_SECTIONS = [
  { key: "analyze", endpoint: "/api/tailor/analyze" },
  { key: "rewrite", endpoint: "/api/tailor/rewrite" },
] as const;

export type PrefetchSectionKey = (typeof PREFETCH_SECTIONS)[number]["key"];

interface PrefetchState {
  key: string;
  promises: Map<PrefetchSectionKey, Promise<unknown>>;
  controllers: Map<PrefetchSectionKey, AbortController>;
  startedAt: number;
}

let pending: PrefetchState | null = null;

function fingerprint(formData: TailorFormData): string {
  // resume-tailor 的指纹字段（去掉 career-report 的 targetEducation / targetCompany / targetCityTier）
  const resumeHash = formData.resumeText?.slice(0, 50) ?? "";
  return [
    formData.jobTitle,
    formData.jd,
    resumeHash,
    formData.mode,
  ].join("|");
}

function fetchSection(
  endpoint: string,
  formData: TailorFormData,
  signal: AbortSignal
): Promise<unknown> {
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formData }),
    signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        const err = new Error(j.error || `HTTP ${res.status}`);
        (err as Error & { status?: number }).status = res.status;
        throw err;
      }
      const json = (await res.json()) as { data?: unknown };
      return json.data;
    })
    .catch((e: unknown) => {
      throw e instanceof Error ? e : new Error("章节预拉取失败");
    });
}

export function startReportPrefetch(formData: TailorFormData): void {
  if (typeof window === "undefined") return;
  const key = fingerprint(formData);
  // 已有相同指纹的 pending：保留，不重复启动
  if (pending && pending.key === key) {
    console.info("[prefetch] start", { key: key.slice(0, 40), hit: true });
    return;
  }
  // 指纹不同：先清理旧的（abort），再启动新的
  clearReportPrefetch();

  const promises = new Map<PrefetchSectionKey, Promise<unknown>>();
  const controllers = new Map<PrefetchSectionKey, AbortController>();

  for (const section of PREFETCH_SECTIONS) {
    const controller = new AbortController();
    controllers.set(section.key, controller);
    const promise = fetchSection(section.endpoint, formData, controller.signal);
    // 挂一个 no-op 兜底，防止 Promise unhandled rejection warning；
    // 真正的错误仍会在消费方 await 时被看到
    promise.catch(() => {});
    promises.set(section.key, promise);
  }

  pending = {
    key,
    promises,
    controllers,
    startedAt: Date.now(),
  };
  console.info("[prefetch] start", {
    key: key.slice(0, 40),
    hit: false,
    sections: PREFETCH_SECTIONS.map((s) => s.key),
  });
}

export function consumeReportPrefetch(
  formData: TailorFormData
): Map<PrefetchSectionKey, Promise<unknown>> | null {
  if (typeof window === "undefined") return null;
  if (!pending) {
    console.info("[prefetch] consume", { hit: false, count: 0 });
    return null;
  }
  if (pending.key !== fingerprint(formData)) {
    // 指纹不匹配（用户改了表单又跳回来）：丢弃并 abort
    console.info("[prefetch] consume", {
      hit: false,
      reason: "fingerprint mismatch",
    });
    clearReportPrefetch();
    return null;
  }
  const out = pending.promises;
  console.info("[prefetch] consume", { hit: true, count: out.size });
  // 一次性消费：只清引用，不 abort（Promise 还要被消费方 await）
  pending = null;
  return out;
}

export function clearReportPrefetch(): void {
  if (!pending) return;
  console.warn("[prefetch] abort", {
    key: pending.key.slice(0, 40),
    elapsed: Date.now() - pending.startedAt,
  });
  for (const controller of pending.controllers.values()) {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  }
  pending = null;
}
