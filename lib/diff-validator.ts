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
// 短字段（标签、技能名、短 highlight）至少给 40 字基线
// 否则 aggressive 模式补一句量化数据就立刻超 1.8x 被 FLAG
// （如原文 "客户信息整理" 12 字 × 1.8 = 22 字，根本写不下"主导…维护 500+ 份…准确率 100%" 这种数据导向重写）
const APPEND_BASELINE = 40;

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
  // append: 用 APPEND_BASELINE
  // replace/delete: 取 max(oldText.length, APPEND_BASELINE)
  //   —— 长字段（>40 字）正常 1.8x 限制灌水
  //   —— 短字段（<40 字标签 / 技能名 / 短 highlight）给 40 字基线，让 aggressive 模式补量化数据有空间
  const baseline =
    change.action === "append"
      ? APPEND_BASELINE
      : Math.max(change.oldText?.length ?? 0, APPEND_BASELINE);
  const limit = baseline * LENGTH_MULTIPLIER;
  if (change.newText.length > limit) {
    return {
      ok: false,
      reason: `新内容字数过长（>${LENGTH_MULTIPLIER}x of ${baseline}字基线）`,
    };
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
    // 顺序检查：路径 → 字数 → 技能
    // 命中第一个就停（一个 change 一个 flagReason 就够，不堆叠）
    // 注：原 validateNumbers（虚构数字检测）已移除——新策略允许 AI 基于简历内容合理推演数据
    // （moderate 夸大 < 15%、aggressive 夸大 < 30%），数据合理性由 prompt 总量上限兜底，不再卡数字出处
    const checks: Array<(c: DiffChange) => { ok: boolean; reason?: string }> = [
      (c) => validatePath(c.path),
      (c) => validateLength(c),
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
