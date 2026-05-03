// Step 14 · Diff Validator
// 对 LLM 输出的 DiffChange[] 做服务端校验
// 不合规标 flagged: true（不丢弃，让用户在报告页看到「AI 想改但被拦下」）

import { DiffChange, RESUME_PATH_FORBIDDEN_PATTERNS } from "./types";

export interface ValidateContext {
  resumeText: string;       // 原始简历文本
  jd: string;               // JD
  knownSkills?: string[];   // 已知技能词（可选，提升技能检测准确性）
}

// 字数倍率上限（plan v3.2）
const LENGTH_MULTIPLIER = 1.8;
// append 时 oldText 可能空，按 30 字符基线
const APPEND_BASELINE = 30;

// 国内常见技术词典（MVP，假阳尽量少 — 只列高频且不易和普通词混淆的）
const COMMON_TECH_SKILLS = [
  // 编程语言
  "python", "java", "javascript", "typescript", "go", "golang", "rust", "c++", "c#", "php", "ruby", "scala", "kotlin", "swift",
  // 前端
  "react", "vue", "angular", "svelte", "next.js", "nextjs", "nuxt", "tailwind", "webpack", "vite",
  // 后端
  "node.js", "nodejs", "express", "spring", "django", "flask", "fastapi", "rails",
  // 数据库
  "mysql", "postgresql", "postgres", "mongodb", "redis", "elasticsearch", "clickhouse", "sql",
  // 云 / 容器
  "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "aliyun", "tencent cloud",
  // AI / 数据
  "tensorflow", "pytorch", "keras", "spark", "hadoop", "kafka", "flink", "airflow",
  // 移动
  "react native", "flutter", "ios", "android",
  // 其他
  "graphql", "rest", "grpc", "oauth", "jwt", "git", "linux",
];

// ——————————————————————————
// 子函数：路径白名单校验
// ——————————————————————————

export function validatePath(path: string): { ok: boolean; reason?: string } {
  for (const pattern of RESUME_PATH_FORBIDDEN_PATTERNS) {
    if (pattern.test(path)) {
      return { ok: false, reason: "禁止越权修改身份字段" };
    }
  }
  return { ok: true };
}

// ——————————————————————————
// 子函数：字数上限校验
// ——————————————————————————

export function validateLength(change: DiffChange): { ok: boolean; reason?: string } {
  const baseline =
    change.action === "append"
      ? APPEND_BASELINE
      : (change.oldText?.length ?? APPEND_BASELINE);
  const limit = baseline * LENGTH_MULTIPLIER;
  if (change.newText.length > limit) {
    return {
      ok: false,
      reason: `新内容字数过长（>${LENGTH_MULTIPLIER}x）`,
    };
  }
  return { ok: true };
}

// ——————————————————————————
// 子函数：虚构数字检测
// ——————————————————————————

// 量化形式正则（覆盖中英文常见量化）
// 注：用顺序匹配 + 去重，避免 30% 同时被多个模式抽到
const QUANT_PATTERNS: RegExp[] = [
  /\d+(?:\.\d+)?%/g,             // 30% / 30.5%
  /\d+(?:\.\d+)?亿/g,             // 1.5亿
  /\d+(?:\.\d+)?万元?/g,          // 100万 / 100万元
  /\d+(?:\.\d+)?[xX×]/g,          // 3x / 3X / 3×
  /\d+(?:\.\d+)?\+/g,             // 50+
  /\d+(?:\.\d+)?万用户/g,         // 50万用户（注意：会和 50万 重叠，但下面去重处理）
];

function extractQuants(text: string): string[] {
  const found = new Set<string>();
  for (const re of QUANT_PATTERNS) {
    const matches = text.match(re);
    if (matches) {
      for (const m of matches) found.add(m);
    }
  }
  return Array.from(found);
}

export function validateNumbers(
  change: DiffChange,
  ctx: ValidateContext
): { ok: boolean; reason?: string } {
  const quants = extractQuants(change.newText);
  if (quants.length === 0) return { ok: true };

  // 原始上下文 = 简历 + JD + oldText（如果有）
  const haystack = `${ctx.resumeText}\n${ctx.jd}\n${change.oldText ?? ""}`;

  for (const q of quants) {
    if (!haystack.includes(q)) {
      return {
        ok: false,
        reason: `虚构数字 ${q}：在原文/JD 中未出现`,
      };
    }
  }
  return { ok: true };
}

// ——————————————————————————
// 子函数：虚构技能检测
// ——————————————————————————

// 抽出 newText 中提到的硬技能词
// MVP 简化策略：
//   1) 大写开头的英文词 / 词组（≥3 字母）：React / Python / TensorFlow
//   2) 全大写缩写（≥2 字母）：SQL / API / GPU
//   3) 国内常见技术词典里的词（不区分大小写匹配）
function extractSkillTerms(text: string): string[] {
  const terms = new Set<string>();

  // 大写开头英文词（可包含点号 / 减号，如 Next.js / React-Native）
  const capRe = /\b[A-Z][a-zA-Z]{2,}(?:[.\-][a-zA-Z]+)*\b/g;
  let m: RegExpExecArray | null;
  while ((m = capRe.exec(text))) {
    terms.add(m[0]);
  }

  // 全大写缩写（2-6 字母）
  const upRe = /\b[A-Z]{2,6}\b/g;
  while ((m = upRe.exec(text))) {
    terms.add(m[0]);
  }

  // 国内常见技术词典（不区分大小写匹配出现的原始形式）
  for (const skill of COMMON_TECH_SKILLS) {
    const escaped = skill.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = text.match(re);
    if (matches) {
      for (const x of matches) terms.add(x);
    }
  }

  return Array.from(terms);
}

// 简单普通词黑名单：避免大写开头英文误抓人名 / 普通词
// 比如 "Skill" / "Project" 这种会被 capRe 抽到，但显然不是技能
const NON_SKILL_BLACKLIST = new Set([
  "Skill", "Skills", "Project", "Projects", "Experience", "Education",
  "Summary", "Profile", "Contact", "Work", "Job", "Title", "Name",
  "Description", "Highlight", "Highlights",
  // 常见英文文本词
  "The", "This", "That", "There", "Their", "Use", "Used", "Using",
  "And", "But", "For", "With", "From", "Into", "Over", "Under",
]);

export function validateSkills(
  change: DiffChange,
  ctx: ValidateContext
): { ok: boolean; reason?: string } {
  const terms = extractSkillTerms(change.newText);
  if (terms.length === 0) return { ok: true };

  const haystackLower = `${ctx.resumeText}\n${ctx.jd}\n${change.oldText ?? ""}`.toLowerCase();
  const knownLower = new Set(
    (ctx.knownSkills ?? []).map((s) => s.toLowerCase())
  );

  for (const term of terms) {
    // 跳过黑名单
    if (NON_SKILL_BLACKLIST.has(term)) continue;

    const lower = term.toLowerCase();
    if (knownLower.has(lower)) continue;
    if (haystackLower.includes(lower)) continue;

    return {
      ok: false,
      reason: `虚构技能 ${term}：原文未体现`,
    };
  }
  return { ok: true };
}

// ——————————————————————————
// 主函数
// ——————————————————————————

export function validateDiffChanges(
  changes: DiffChange[],
  ctx: ValidateContext
): DiffChange[] {
  return changes.map((change) => {
    // 顺序检查：路径 → 字数 → 数字 → 技能
    // 命中第一个就停（一个 change 一个 flagReason 就够，不堆叠）
    const checks: Array<(c: DiffChange) => { ok: boolean; reason?: string }> = [
      (c) => validatePath(c.path),
      (c) => validateLength(c),
      (c) => validateNumbers(c, ctx),
      (c) => validateSkills(c, ctx),
    ];

    for (const check of checks) {
      const result = check(change);
      if (!result.ok) {
        return {
          ...change,
          flagged: true,
          flagReason: result.reason,
        };
      }
    }

    return change;
  });
}
