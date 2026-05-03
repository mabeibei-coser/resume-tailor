/**
 * /api/tailor/rewrite （Step 13 真实 LLM 实现）
 * ———————————————
 * 流程（plan v3.2）：
 *   formData (jobTitle / jd / resumeText / mode)
 *     ↓
 *   Step 1：parseResumeToJson(resumeText) → ResumeJSON           (lib/resume-parser.ts)
 *     ↓
 *   Step 2：MiniMax + 讯飞 fallback → DiffChange[]               (本文件 + lib/prompts/rewrite.ts)
 *     ↓
 *   Step 3：validateDiffChanges(changes, ctx) → 标 flagged        (lib/diff-validator.ts)
 *     ↓
 *   返回 { resume: ResumeJSON, changes: DiffChange[] }
 *
 * 失败兜底：双 LLM 都挂时返 fallback mock + `fallback: true` 标记，避免前端白屏。
 */
import { NextResponse } from "next/server";

import { callWithFallback } from "@/lib/report-shared";
import { parseResumeToJson } from "@/lib/resume-parser";
import { validateDiffChanges } from "@/lib/diff-validator";
import {
  REWRITE_SYSTEM_PROMPT,
  buildRewriteUserPrompt,
  validateRewriteResult,
} from "@/lib/prompts/rewrite";
import type {
  DiffChange,
  ResumeJSON,
  TailorFormData,
  TailorRewriteResult,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// 兜底 mock —— 双路 LLM 都挂时用，避免前端白屏
// ============================================================================

const FALLBACK_RESUME: ResumeJSON = {
  basics: {
    name: "未知",
    summary: "(LLM 服务暂不可用，已回退到通用兜底)",
  },
  work: [],
  education: [],
  skills: [],
};

// Step 24：mock changes 补足到 6 条，覆盖简历常见可优化字段（summary / highlights / skills / projects），
// 让前端 diff 视图有"满状态"可渲染，不至于只有 1-2 条空建议。
// 文案按"通用模板"风格 — 给降级用户一个"如果 AI 在线，应该这样改"的方向感。
// 注意：path 用真实简历常见结构，但 oldText 用通用占位（因为兜底场景下我们不知道用户原文）。
//      前端 diff applier 会跳过 path 不存在的 change（容错），不会因此崩溃。
const FALLBACK_CHANGES: DiffChange[] = [
  {
    path: "basics.summary",
    action: "replace",
    oldText: "(原 summary)",
    newText: "（AI 服务暂不可用 · 通用建议）summary 应包含『年限 + 主要方向 + 1 个最强业绩数字』，把 JD 最看重的能力放第一句。",
    reason: "兜底建议：summary 是 HR 第一眼，应针对 JD 排序自身能力。请稍后重试以获得基于您简历真实数据的改写。",
  },
  {
    path: "basics.label",
    action: "replace",
    oldText: "(原 label)",
    newText: "（通用建议）label 改成『目标岗位关键词 + 年限』格式，如『高级前端工程师 · 5 年 React』。",
    reason: "兜底建议：label 是简历顶部的『一句话定位』，要直接对齐目标岗位名而非现职岗位名。",
  },
  {
    path: "work[0].highlights[0]",
    action: "replace",
    oldText: "(原 highlight)",
    newText: "（通用建议）每条 highlight 用『动词 + 量化结果 + 业务影响』结构，避免『负责』『参与』开头。",
    reason: "兜底建议：HR 6 秒筛简历主要看 highlights 的结果导向程度。请稍后重试以获得针对您每条 highlight 的具体改写。",
  },
  {
    path: "work[0].highlights",
    action: "append",
    newText: "（通用建议）补一条『跨团队协作 / 推动落地』类成果，呼应大多数 JD 的软技能要求（待重试以获得 JD 关键词对齐）。",
    reason: "兜底建议：JD 普遍要求跨角色推动能力，简历里若没有这类经历应主动补一条真实案例。",
  },
  {
    path: "skills",
    action: "append",
    newText: "（通用建议）按『核心栈 / 工具链 / 加分项』三类拆分技能，每类 3-5 个关键词，JD 里出现过的词放第一位。",
    reason: "兜底建议：扁平的『熟练 / 了解』技能列表无法让 HR 快速判断你的硬技能与 JD 的匹配度。",
  },
  {
    path: "projects[0].highlights[0]",
    action: "replace",
    oldText: "(原 highlight)",
    newText: "（通用建议）项目类 highlight 重点说『你的角色 + 关键决策 + 业务收益』，避免只描述『做了什么』。",
    reason: "兜底建议：项目经历是面试官追问最多的部分，highlight 里要能直接拿到『为什么是你牵头』的论据。",
  },
];

// ============================================================================
// 工具：从 ResumeJSON + JD 抽 knownSkills，给 diff-validator 提升技能检测准确性
// ============================================================================

function extractKnownSkills(resume: ResumeJSON, jd: string): string[] {
  const skills = new Set<string>();

  // 1) 从 ResumeJSON.skills 抽
  for (const s of resume.skills ?? []) {
    if (s.name) skills.add(s.name);
    for (const k of s.keywords ?? []) skills.add(k);
  }

  // 2) 从 JD 简单分词：英文/数字单词、中文 2-4 字短语都加入
  // 主要是为了让 diff-validator 别把 JD 里出现过的技能误判成"虚构"
  const enWords = jd.match(/[A-Za-z][A-Za-z0-9.+#\-]*/g) ?? [];
  for (const w of enWords) {
    if (w.length >= 2) skills.add(w);
  }

  return Array.from(skills);
}

// ============================================================================
// 主入口
// ============================================================================

interface RequestBody {
  formData?: TailorFormData;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Body 解析失败：必须是 JSON" },
      { status: 400 }
    );
  }

  const formData = body.formData;
  if (
    !formData ||
    !formData.jobTitle ||
    !formData.jd ||
    !formData.resumeText
  ) {
    return NextResponse.json(
      { error: "formData 缺失必填字段（jobTitle / jd / resumeText）" },
      { status: 400 }
    );
  }

  // ——————————————————————————
  // Step 1：parseResumeToJson
  // ——————————————————————————
  let resume: ResumeJSON;
  try {
    resume = await parseResumeToJson(formData.resumeText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[rewrite] resume parser 失败，返回兜底 mock:", msg);
    const result: TailorRewriteResult & { fallback?: true } = {
      resume: FALLBACK_RESUME,
      changes: FALLBACK_CHANGES,
      fallback: true,
    };
    return NextResponse.json({ data: result });
  }

  // ——————————————————————————
  // Step 2：LLM 生成 changes
  // ——————————————————————————
  let llmChanges: DiffChange[];
  try {
    const llmResult = await callWithFallback<{ changes: DiffChange[] }>({
      systemPrompt: REWRITE_SYSTEM_PROMPT,
      userPrompt: buildRewriteUserPrompt(
        resume,
        formData.jd,
        formData.jobTitle,
        formData.mode,
      ),
      temperature: 0.5,
      maxTokens: 4500,
      validator: validateRewriteResult,
    });
    llmChanges = llmResult.changes;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[rewrite] 双 LLM 均失败，返回兜底 mock（保留真实 resume）:", msg);
    const result: TailorRewriteResult & { fallback?: true } = {
      resume,
      changes: FALLBACK_CHANGES,
      fallback: true,
    };
    return NextResponse.json({ data: result });
  }

  // ——————————————————————————
  // Step 3：validateDiffChanges 标 flagged
  // ——————————————————————————
  const knownSkills = extractKnownSkills(resume, formData.jd);
  const validated = validateDiffChanges(llmChanges, {
    resumeText: formData.resumeText,
    jd: formData.jd,
    knownSkills,
  });

  const result: TailorRewriteResult = {
    resume,
    changes: validated,
  };
  return NextResponse.json({ data: result });
}
