/**
 * Resume Parser（Step 12）
 * ———————————————
 * 把 PDF/DOCX 提取出的纯文本简历 → ResumeJSON 结构化对象。
 *
 * 内部用 `callWithFallback`（MiniMax 主 + 讯飞 fallback）+ JSON mode + validator。
 * - SYSTEM / USER 静态部分前置（命中 MiniMax 自动 prefix cache）
 * - resumeText 拼到 user message 末尾（命中缓存的不变前缀）
 * - validator：ResumeJSONSchema.safeParse + 占位符泄漏检测 + basics.name 非空
 * - temperature 0.3（结构化任务用低温度）
 * - maxTokens 4000（解析需要稍长输出，含多段经历 + 项目 + 技能）
 */

import { callWithFallback } from "@/lib/report-shared";
import {
  PARSE_RESUME_SYSTEM_PROMPT,
  buildParseResumeUserPrompt,
} from "@/lib/prompts/parse-resume";
import { ResumeJSONSchema, type ResumeJSON } from "@/lib/types";

// 占位符模式：LLM 可能照抄 schema 描述里的 "..." / "<...>" / "字符串" 等
const PLACEHOLDER_PATTERNS = [
  /^\.\.\.$/,
  /^<.+>$/,
  /^字符串$/,
  /^数字$/,
  /^待填$/,
  /^todo$/i,
];

function isPlaceholder(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
}

/**
 * 递归扫描所有字符串叶子节点，看是否泄漏了占位符。
 * 注意：basics.name 即使是 "未知" 也不视为占位符（红线 #4 允许 fallback 到 "未知"）。
 */
function findPlaceholderLeak(obj: unknown, path: string): string | null {
  if (obj == null) return null;
  if (typeof obj === "string") {
    if (isPlaceholder(obj)) return `${path} 是占位符："${obj}"`;
    return null;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const issue = findPlaceholderLeak(obj[i], `${path}[${i}]`);
      if (issue) return issue;
    }
    return null;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const issue = findPlaceholderLeak(v, path ? `${path}.${k}` : k);
      if (issue) return issue;
    }
    return null;
  }
  return null;
}

/**
 * 校验 LLM 返回的解析结果是否合法。
 * 通过 → null
 * 失败 → 错误描述字符串（callWithFallback 据此切讯飞重试）
 */
export function validateParseResult(data: ResumeJSON): string | null {
  if (!data || typeof data !== "object") return "data 不是对象";

  // 1. Zod schema 校验
  const result = ResumeJSONSchema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue.path.join(".");
    return `Zod 校验失败：${path} - ${firstIssue.message}`;
  }

  // 2. basics.name 非空（最低保证）
  const name = data.basics?.name?.trim();
  if (!name) return "basics.name 为空";

  // 3. 占位符泄漏检测（递归扫所有字符串）
  const leak = findPlaceholderLeak(data, "");
  if (leak) return leak;

  return null;
}

/**
 * 主入口：解析简历文本 → ResumeJSON。
 *
 * @param resumeText 从 PDF/DOCX 提取的纯文本（建议预先清洗：去掉分页符、页眉页脚噪声）
 * @returns 符合 ResumeJSON 标准的结构化对象
 * @throws 双路 LLM 都失败时抛 MiniMax 原始错误
 */
export async function parseResumeToJson(resumeText: string): Promise<ResumeJSON> {
  if (!resumeText || !resumeText.trim()) {
    throw new Error("resumeText 不能为空");
  }

  const data = await callWithFallback<ResumeJSON>({
    systemPrompt: PARSE_RESUME_SYSTEM_PROMPT,
    userPrompt: buildParseResumeUserPrompt(resumeText),
    temperature: 0.3,
    maxTokens: 4000,
    validator: validateParseResult,
  });

  return data;
}
