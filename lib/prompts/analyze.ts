/**
 * /api/tailor/analyze 的 prompt 资产
 * ———————————————
 * - 静态 SYSTEM + 静态 USER 模板头放前面（命中 MiniMax 自动 prefix cache）
 * - 动态 jobTitle / jd / resumeText / mode 拼到 user message 末尾
 * - validator 校验 schema：suggestions 长度 3-5 + interview 长度 5 + 字段非空 + 占位符泄漏检测
 *
 * Step 11：SYSTEM 中静态列出 moderate / aggressive 两套规则，
 *          USER prompt 末尾追加「本次优化程度：${mode}」明确告知，
 *          这样 SYSTEM 静态命中 prefix cache，模式仍能被真正区分。
 */

import type {
  TailorAnalyzeResult,
  TailorFormData,
  TailorInterviewQuestion,
  TailorSuggestion,
} from "@/lib/types";

// ============================================================================
// 静态 prompt（必须放前面，命中 prefix cache）
// ============================================================================

export const ANALYZE_SYSTEM_PROMPT = `你是一位资深 HR 顾问、简历教练与一线招聘官三重身份的专家，专门帮求职者把简历"对齐到目标 JD"。
本次任务：基于用户提供的【目标岗位 + JD + 简历原文】，输出**优化建议**与**面试问答预演**两块结构化数据。

## 输出 JSON Schema（字段含义，不是示例）

{
  "suggestions": [  // 数组，长度 3-5 条
    {
      "title":   // 一句不超过 14 字的中文短标题，描述这条建议的核心动作（如"突出 React 与组件化经验"）
      "problem": // 一段 30-80 字的中文描述，说明简历当前在 JD 视角下的具体问题（必须引用简历的真实段落或 JD 的具体关键词，不要空泛地说"匹配度不够"）
      "action":  // 一段 30-80 字的中文描述，告诉用户具体怎么改（动词开头，如"在工作经历前两条 highlights 中显式带出 X / Y / Z 关键字"）
      "example": // 一句 20-60 字的中文示例，演示改完后的成品句子或词组（不是抽象描述，是直接可拷贝到简历里的句子）
    }
  ],
  "interview": [  // 数组，长度严格等于 5 题，分布固定：3 道岗位技能题 + 1 道项目深挖题 + 1 道动机匹配题（顺序不限）
    {
      "question":     // 一句中文面试题，10-40 字，针对本次 JD + 简历，不要通用题
      "why":          // 30-60 字，说明面试官出这题的考察意图（针对 JD 哪个能力 / 简历哪段经历）
      "sampleAnswer": // 60-160 字，给出回答框架或要点，不要写完整稿（用"先 X，再 Y，最后 Z"或 STAR 结构提示即可）
      "keypoints":    // 数组 3-5 条，每条 4-12 字的中文短词，是回答时必须命中的关键词（如"LCP / TTI 等核心指标"）
    }
  ]
}

## 5 题面试问答的分布（必须严格按此组合）

- 第 1-3 题：**岗位技能题**（基于 JD 抽取的硬技能 / 工具 / 方法论，如 React、AB 测试、财务建模等）
- 第 4 题：**项目深挖题**（基于简历里"最相关于本 JD"的那段经历，挖一个细节，如"你在 X 项目里用 Y 解决 Z 时怎么权衡的？"）
- 第 5 题：**动机匹配题**（结合简历的个人经历 / 教育背景 / 兴趣方向，呼应 JD 提到的岗位职责或公司侧重点）

## 优化程度规则（user prompt 末尾会明确告知本次是 moderate 还是 aggressive，必须严格按对应一套执行）

### moderate（适中）
- **保留原经历的框架与顺序**：不重排工作经历 / 项目经历的先后
- **调整措辞、补量化指标、对齐 JD 关键词**：在已有 highlights 里换更精准的动词、显式带出 JD 要求的技术栈名词
- **不擅自重组结构 / 不改岗位标题 / 不编造数据**：example 中出现的所有数字、百分比、规模都必须能在简历原文 / JD 中找到出处
- 语气保守、克制，像在做"措辞润色"而非"重写"
- example 平均长度控制在 25-40 字，不要堆砌

### aggressive（激进）
- **可重组经历顺序**：在 action 中明确建议「把 X 经历前置 / 把 Y 经历后置」，按 JD 相关度从高到低重排
- **可删减不相关经历**：在 action 中明确建议「弱化 / 删除与 JD 无关的 X 段」（不要保护用户面子，直接说）
- **可改岗位标题让其更贴近目标岗**：前提是不偏离实际职责范围（如「内容编辑」可改成「内容运营专员」，但不能把「实习生」改成「负责人」）
- **可推测合理数字**：基于行业常识 / 同类项目常见量级（如电商类项目用户量、运营类项目转化率），但**必须在 example 末尾标注「（待核实）」三个字**
- 语气主动、强势，example 更长更具体（40-60 字），多用结果导向动词（"主导 / 推动 / 落地 / 沉淀"），整体更"卖"

## 红线（违反任意一条都视为本次任务失败）

1. **建议必须基于简历提到的具体内容 + JD 的具体关键词**，禁止给万金油（"建议突出团队协作"这种放在任何简历都成立的话不合格）
2. **moderate 模式下不要凭空虚构简历里没有的经历或数字**——如果简历里没出现的能力，只能在 action 里说"建议补一段 X 经历"，不能在 example 里直接编"主导了一个 1000 万用户的项目"
3. **aggressive 模式下推测的数字必须以「（待核实）」标注**，不标注就视为编造
4. **suggestions 长度必须 3-5 条；interview 长度严格 = 5**
5. **所有字符串字段必须是真实内容**，不能是 "..."、"<...>"、"字符串"、"待填" 之类的占位符
6. **必须按 user prompt 末尾明示的 mode 执行对应规则**，不要在 moderate 输出中混入"重组经历顺序" / "改岗位标题"等 aggressive 动作

## 风格

- 中文输出，专业但不端着，像资深 HR 给候选人一对一辅导的口吻
- 面试题要"具体到这份 JD + 这份简历"，避免"请讲一下你的优缺点"这种通用题
- example / sampleAnswer 要可执行，不要"建议结合具体场景描述"这种空话
`;

export const ANALYZE_USER_TEMPLATE_HEAD = `以下是本次需要分析的【目标岗位】【JD 原文】【简历原文】【优化偏好】，请按 system 中定义的 JSON schema 输出。再次强调：必须严格基于以下材料，禁止虚构。\n\n`;

// ============================================================================
// 动态 user prompt 构造器
// ============================================================================

export function buildAnalyzeUserPrompt(formData: TailorFormData): string {
  const modeLabel =
    formData.mode === "aggressive"
      ? "激进（可大幅重组措辞、补强对齐 JD 的描述方式）"
      : "适中（保留原有经历，仅调整表达与关键词侧重）";

  // 简历过长时截断，控制输入 token（与 career-report buildBaseContext 一致）
  const resumeSnippet =
    formData.resumeText.length > 2000
      ? formData.resumeText.slice(0, 2000) + "\n...(已截断)"
      : formData.resumeText;

  const jdSnippet =
    formData.jd.length > 1500
      ? formData.jd.slice(0, 1500) + "\n...(已截断)"
      : formData.jd;

  return [
    ANALYZE_USER_TEMPLATE_HEAD,
    `【目标岗位】\n${formData.jobTitle}`,
    `\n【优化偏好】\n${modeLabel}`,
    `\n【JD 原文】\n${jdSnippet}`,
    `\n【简历原文】\n${resumeSnippet}`,
    `\n本次优化程度：${formData.mode}（请严格按照 system 中「优化程度规则」对应一套规则执行；moderate 不得擅自重组经历或编数字，aggressive 推测的数字必须标注「（待核实）」）。`,
  ].join("\n");
}

// ============================================================================
// Validator
// ============================================================================

// 占位符模式：LLM 可能照抄 schema 描述里的"..."或"<...>"等
const PLACEHOLDER_PATTERNS = [
  /^\.\.\.$/,
  /^<.+>$/,
  /^字符串$/,
  /^数字$/,
  /^待填$/,
  /^todo$/i,
  /^null$/i,
];

function isPlaceholder(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
}

function checkSuggestion(s: TailorSuggestion, idx: number): string | null {
  if (!s || typeof s !== "object") return `suggestion[${idx}] 不是对象`;
  for (const field of ["title", "problem", "action", "example"] as const) {
    const v = s[field];
    if (typeof v !== "string") return `suggestion[${idx}].${field} 不是字符串`;
    if (isPlaceholder(v))
      return `suggestion[${idx}].${field} 是占位符或空串："${v}"`;
  }
  return null;
}

function checkInterview(q: TailorInterviewQuestion, idx: number): string | null {
  if (!q || typeof q !== "object") return `interview[${idx}] 不是对象`;
  for (const field of ["question", "why", "sampleAnswer"] as const) {
    const v = q[field];
    if (typeof v !== "string") return `interview[${idx}].${field} 不是字符串`;
    if (isPlaceholder(v))
      return `interview[${idx}].${field} 是占位符或空串："${v}"`;
  }
  if (!Array.isArray(q.keypoints))
    return `interview[${idx}].keypoints 不是数组`;
  if (q.keypoints.length < 2)
    return `interview[${idx}].keypoints 少于 2 条（实际 ${q.keypoints.length}）`;
  for (let i = 0; i < q.keypoints.length; i++) {
    const k = q.keypoints[i];
    if (typeof k !== "string")
      return `interview[${idx}].keypoints[${i}] 不是字符串`;
    if (isPlaceholder(k))
      return `interview[${idx}].keypoints[${i}] 是占位符或空串："${k}"`;
  }
  return null;
}

/**
 * 校验 LLM 返回的 TailorAnalyzeResult。
 * 通过 → 返回 null。
 * 失败 → 返回错误描述（callWithFallback 会据此切讯飞重试）。
 */
export function validateAnalyzeResult(data: TailorAnalyzeResult): string | null {
  if (!data || typeof data !== "object") return "data 不是对象";

  // suggestions: 3-5 条
  if (!Array.isArray(data.suggestions))
    return "suggestions 不是数组";
  if (data.suggestions.length < 3 || data.suggestions.length > 5)
    return `suggestions 长度 ${data.suggestions.length}（要求 3-5）`;
  for (let i = 0; i < data.suggestions.length; i++) {
    const issue = checkSuggestion(data.suggestions[i], i);
    if (issue) return issue;
  }

  // interview: 严格 5 条
  if (!Array.isArray(data.interview))
    return "interview 不是数组";
  if (data.interview.length !== 5)
    return `interview 长度 ${data.interview.length}（要求严格 = 5）`;
  for (let i = 0; i < data.interview.length; i++) {
    const issue = checkInterview(data.interview[i], i);
    if (issue) return issue;
  }

  return null;
}

/**
 * Step 11 mode-aware 轻量警告（不阻断流程）：
 * - moderate 模式：example 出现具体数字（百分比 / 倍数 / 万元 / 人 / 月）但未带「待核实」 → console.warn
 * - aggressive 模式：example 出现数字但未标「待核实」 → console.warn（提醒模型违规）
 *
 * 完整的 diff-validator（路径白名单 / 字数 ≤ 1.8x / 虚构检测）在 Step 14 实现，
 * 这里只是给开发期一个粗筛信号。
 */
const NUMERIC_PATTERN = /\d+(?:\.\d+)?\s*(?:%|倍|万|千|亿|w|k|人|月|周|天|小时|秒)/i;
const TBD_MARK = /[（(]\s*待核实\s*[)）]/;

export function warnModeViolations(
  data: TailorAnalyzeResult,
  mode: "moderate" | "aggressive",
): void {
  if (!data?.suggestions) return;
  for (let i = 0; i < data.suggestions.length; i++) {
    const example = data.suggestions[i]?.example ?? "";
    const hasNumber = NUMERIC_PATTERN.test(example);
    const hasTBDMark = TBD_MARK.test(example);
    if (mode === "moderate" && hasNumber && !hasTBDMark) {
      console.warn(
        `[analyze validator][moderate] suggestion[${i}].example 含具体数字但 moderate 模式不应推测：「${example}」`,
      );
    }
    if (mode === "aggressive" && hasNumber && !hasTBDMark) {
      console.warn(
        `[analyze validator][aggressive] suggestion[${i}].example 含数字但未标「（待核实）」：「${example}」`,
      );
    }
  }
}
