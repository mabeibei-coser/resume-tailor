/**
 * Tailor report 客户端聚合器
 * ———————————————
 * /loading 页 mount 时调 generateTailor(formData) →
 *   1. 先 consumeReportPrefetch 拿 in-flight Promise
 *   2. 没拿到就现场 fetch
 *   3. 并发拿 analyze + rewrite 结果，组装成 TailorReport
 *
 * 失败兜底走静态 mock，不抛异常给 UI（避免白屏）。
 */
import type {
  TailorAnalyzeResult,
  TailorFormData,
  TailorReport,
  TailorRewriteResult,
} from "@/lib/types";
import {
  consumeReportPrefetch,
  type PrefetchSectionKey,
} from "@/lib/report-prefetch";

const SECTION_CONFIG: {
  key: PrefetchSectionKey;
  endpoint: string;
  label: string;
}[] = [
  { key: "analyze", endpoint: "/api/tailor/analyze", label: "分析建议 + 面试问答" },
  { key: "rewrite", endpoint: "/api/tailor/rewrite", label: "改写简历 + Diff" },
];

export type SectionStatus =
  | "pending"
  | "loading"
  | "completed"
  | "fallback"
  | "skipped";

export interface SectionProgress {
  key: PrefetchSectionKey;
  label: string;
  status: SectionStatus;
  error?: string;
}

export interface GenerateTailorOptions {
  onProgress?: (progress: SectionProgress[]) => void;
  useMockOnly?: boolean;
}

// 与 analyze/rewrite stub 的 mock 对齐的最小兜底（防 LLM 全挂时白屏）
const ANALYZE_FALLBACK: TailorAnalyzeResult = {
  suggestions: [
    {
      title: "暂未生成针对性建议",
      problem: "当前 LLM 服务暂不可用，已回退到通用建议。",
      action: "稍后重试，或联系管理员。",
      example: "—",
    },
  ],
  interview: [
    {
      question: "请做一段 1 分钟的自我介绍。",
      why: "通用题，万能开局。",
      sampleAnswer: "STAR 结构 + 重点放在最近一段经历。",
      keypoints: ["现状", "经历亮点", "为何来面试"],
    },
  ],
};

const REWRITE_FALLBACK: TailorRewriteResult = {
  resume: { basics: { name: "" }, work: [], education: [], skills: [] },
  changes: [],
};

async function callSection<T>(
  endpoint: string,
  formData: TailorFormData
): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formData }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    const err = new Error(j.error || `HTTP ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  const json = (await res.json()) as { data?: T };
  if (!json.data) throw new Error("响应缺少 data 字段");
  return json.data;
}

export async function generateTailor(
  formData: TailorFormData,
  options: GenerateTailorOptions = {}
): Promise<TailorReport> {
  const prefetched = consumeReportPrefetch(formData);

  const progress: SectionProgress[] = SECTION_CONFIG.map((s) => ({
    key: s.key,
    label: s.label,
    status: "pending",
  }));

  const update = () => options.onProgress?.([...progress]);
  update();

  const tasks = SECTION_CONFIG.map((section, idx) => async () => {
    progress[idx].status = "loading";
    update();

    // 优先消费 prefetch
    const prefetchedPromise = prefetched?.get(section.key);
    if (prefetchedPromise !== undefined && !options.useMockOnly) {
      try {
        const data = await prefetchedPromise;
        console.info(`[tailor] ${section.key} consumed in-flight`);
        progress[idx].status = "completed";
        update();
        return { key: section.key, data };
      } catch (prefetchErr) {
        console.warn(
          `[tailor] prefetch failed for ${section.key}, falling back:`,
          prefetchErr
        );
        // 落到下面现场 fetch
      }
    }

    // 现场 fetch（无 prefetch / prefetch 失败 / useMockOnly）
    try {
      if (options.useMockOnly) throw new Error("forced mock");
      const data = await callSection(section.endpoint, formData);
      console.info(`[tailor] ${section.key} fetched fresh`);
      progress[idx].status = "completed";
      update();
      return { key: section.key, data };
    } catch (e) {
      console.warn(`[tailor] ${section.key} failed, using fallback:`, e);
      progress[idx].status = "fallback";
      progress[idx].error = e instanceof Error ? e.message : String(e);
      update();
      return {
        key: section.key,
        data: section.key === "analyze" ? ANALYZE_FALLBACK : REWRITE_FALLBACK,
      };
    }
  });

  // 2 章节全并发
  const results = await Promise.all(tasks.map((t) => t()));
  const map = new Map<PrefetchSectionKey, unknown>();
  for (const r of results) map.set(r.key, r.data);

  const analyze = (map.get("analyze") as TailorAnalyzeResult) ?? ANALYZE_FALLBACK;
  const rewrite = (map.get("rewrite") as TailorRewriteResult) ?? REWRITE_FALLBACK;

  return {
    suggestions: analyze.suggestions,
    interview: analyze.interview,
    resume: rewrite.resume,
    changes: rewrite.changes,
  };
}

export { SECTION_CONFIG };
