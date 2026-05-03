/**
 * /api/tailor/rewrite 的 prompt 资产（Step 13）
 * ———————————————
 * 任务：基于 ResumeJSON + JD + mode → 输出 DiffChange[]
 *
 * Prefix cache 友好：
 * - 静态 SYSTEM 在最前
 * - 静态 USER 模板头紧随其后
 * - 动态 jobTitle / jd / resume JSON / mode 拼到 user message 末尾
 *
 * 红线（写在 SYSTEM）：
 * - 路径白名单（禁改 basics.name / work[*].name / position / startDate / endDate / education[*].institution|area|studyType|startDate|endDate）
 * - 不虚构技能 / 不编日期 / 不编公司
 * - newText 字数 ≤ oldText × 1.8
 * - 推测的数字必须末尾标「（待核实）」（aggressive 才允许推测）
 *
 * Validator：
 * - 检查 changes 是数组、长度 ≥ 3
 * - 每个 change：path 非空 / action ∈ {replace,append,delete} / newText 非空非占位符 / reason 非空
 * - 路径白名单 / 字数倍率 / 虚构检测留给 lib/diff-validator.ts（路由层调用）
 */

import type { DiffChange, ResumeJSON, TailorMode } from "@/lib/types";

// ============================================================================
// 静态 SYSTEM PROMPT（命中 prefix cache）
// ============================================================================

export const REWRITE_SYSTEM_PROMPT = `你是一位资深简历改写顾问，专门帮求职者把【已结构化的 ResumeJSON】对齐到目标 JD。
本次任务：基于用户提供的【目标岗位 + JD + 现有 ResumeJSON + 优化程度 mode】，输出**精确到字段路径的 DiffChange 数组**，描述要怎么改这份简历。

## 输出 JSON Schema（字段含义，不是示例）

{
  "changes": [  // 数组，moderate 建议 5-12 条；aggressive 建议 8-20 条；最少 3 条
    {
      "path":     // 要改的字段路径，用点 + 方括号语法（详见下方"路径规则"）；不能为空
      "action":   // "replace" | "append" | "delete" 三选一
      "oldText":  // action=replace/delete 时必填：被改前的原文（直接拷贝 ResumeJSON 里的字符串）；action=append 时省略
      "newText":  // 改后的内容（action=delete 时也必须非空，可填空字符串说明意图）；不能是占位符
      "reason":   // 30-80 字中文，说明为什么要改这条（必须引用 JD 关键词或简历真实段落，不要空泛）
    }
  ]
}

## 路径规则（path 字段语法）

- 顶层字段直接写：basics.summary / basics.label
- 数组按下标：work[0].summary / work[1].summary / education[0].score
- 数组的字符串子项也按下标：work[0].highlights[2] / work[1].highlights[0] / projects[0].highlights[1]
- 整个数组追加（append 才用）：work[0].highlights / projects[0].highlights / skills[0].keywords
- 整个 skills 数组追加新技能类别：skills（append 时表示新增一个 skill 对象）

## 路径白名单（**违反任意一条该 change 会被拦下**）

**禁止改**（这些字段是身份相关或事实，不能由 AI 越权改写）：
- basics.name
- work[*].name（公司名）
- work[*].position（历史岗位）
- work[*].startDate / work[*].endDate
- education[*].institution / .area / .studyType / .startDate / .endDate

**允许改**（围绕这些字段写 changes）：
- basics.summary / basics.label
- work[*].summary / work[*].highlights / work[*].highlights[N]
- projects[*].description / projects[*].highlights / projects[*].highlights[N] / projects[*].keywords
- skills / skills[*].keywords / skills[*].name / skills[*].level
- 其他非禁止字段

## 优化程度规则（user prompt 末尾会明确告知本次是 moderate 还是 aggressive，必须严格按对应一套执行）

### moderate（适中）— 建议 5-12 条 changes
- **保留经历框架与顺序**：不改公司、不改历史岗位、不改时间，不重组数组顺序
- **只调措辞 / 补量化 / 对齐 JD 关键词**：在已有 highlights 里换更精准的动词、显式带出 JD 要求的技术栈或方法论名词
- **基于原文已有的数字补量化**：原文有 "降到 1.4s" 这种数据可以保留并强化措辞，但不能凭空捏新的数字
- **不擅自删除经历**：可以 replace 让某条 highlight 更对齐，不要 delete 掉整段
- 大多数 changes 是 replace（占 70%+），少量 append（补一条与 JD 强相关但简历漏写的能力点）

### aggressive（激进）— 建议 8-20 条 changes
- **可大幅重写措辞 / 大量推测合理数字**：基于行业常识 / 同类项目常见量级（如电商类项目用户量、运营类项目转化率），但**推测的数字必须在 newText 末尾标注「（待核实）」三个字**，否则视为编造
- **可 delete 与 JD 无关的弱经历**：在 reason 里写明为什么删（如"该 highlight 与 JD 用户增长方向无关，建议删除腾出篇幅"）
- **可改岗位描述（不改岗位名）**：basics.label 可大幅改写贴近目标岗，work[*].summary 可以重写让更贴 JD 视角
- **可改 skills 类别名 / 重组关键词**：把 "专业技能" 拆成 "前端框架 / 后端 / 工具" 三类
- 整体语气主动、强势，多用结果导向动词（"主导 / 推动 / 落地 / 沉淀"）

## 红线（违反任意一条都视为本次任务失败）

1. **不虚构技能名**：newText 里出现的硬技能词（React / Python / SQL / Tableau / Power BI 等）必须能在原 ResumeJSON 或 JD 里找到出处，不能凭空加 "AI Agent / LangChain" 这种简历里没有的技能
2. **不编日期 / 公司经历**：禁止在 newText 里说"2023 年主导了一个 X 项目"，除非 ResumeJSON 里真有这个时间和经历
3. **newText 字数 ≤ oldText × 1.8**：超过上限会被拦下；append 时 newText 不超过 50 字
4. **moderate 模式不得编数字**：原文没有的百分比 / 万元 / 倍数 / 用户数都不能出现在 moderate 的 newText 里
5. **aggressive 模式推测的数字必须标注「（待核实）」**：如 "推动新用户首单转化提升至 18%（待核实）" — 不标注就视为编造
6. **changes 长度 ≥ 3**：不能返回空数组或 1-2 条敷衍
7. **所有字符串字段必须真实**，不能是 "..."、"<...>"、"字符串"、"待填" 等占位符
8. **path 必须真实存在于 ResumeJSON**：不要写 "work[5].highlights[10]" 但 ResumeJSON 里只有 2 段 work；不存在的下标会让前端 applier 失败

## 风格

- 中文输出，专业但不端着
- reason 要"具体到这份 JD + 这份简历"，避免"建议突出团队协作"这种万金油
- newText 要可直接拷贝进简历的成品句，不是"建议结合具体场景描述"这种空话
- oldText 必须**逐字拷贝**自 ResumeJSON 的原文，不要"复述大意"（前端要做精确字符串匹配做高亮）
`;

export const REWRITE_USER_TEMPLATE_HEAD = `以下是结构化简历、岗位要求、优化程度，请按 system 中定义的 JSON schema 输出 changes 数组。再次强调：必须严格基于 ResumeJSON 内容 + JD 关键词，禁止虚构。oldText 必须逐字拷贝自 ResumeJSON 原文。\n\n`;

// ============================================================================
// 动态 user prompt 构造器（动态部分在尾，prefix cache 友好）
// ============================================================================

export function buildRewriteUserPrompt(
  resume: ResumeJSON,
  jd: string,
  jobTitle: string,
  mode: TailorMode,
): string {
  // ResumeJSON 一般 1-3KB，不截断；JD 长时截断（与 analyze 保持一致）
  const jdSnippet =
    jd.length > 1500 ? jd.slice(0, 1500) + "\n...(已截断)" : jd;

  const modeLabel =
    mode === "aggressive"
      ? "激进（可重写措辞 / 推测数字必须标「待核实」/ 可删与 JD 无关的弱经历 / 可改岗位描述）"
      : "适中（保留经历框架与顺序，只调措辞 + 补量化 + 对齐 JD 关键词）";

  return [
    REWRITE_USER_TEMPLATE_HEAD,
    `【目标岗位】\n${jobTitle}`,
    `\n【优化偏好】\n${modeLabel}`,
    `\n【JD 原文】\n${jdSnippet}`,
    `\n【现有 ResumeJSON】\n${JSON.stringify(resume, null, 2)}`,
    `\n本次优化程度：${mode}（请严格按照 system 中「优化程度规则」对应一套规则执行；moderate 不得编数字、不得删经历；aggressive 推测的数字必须以「（待核实）」结尾，否则视为虚构）。`,
  ].join("\n");
}

// ============================================================================
// Validator
// ============================================================================

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

const VALID_ACTIONS = new Set(["replace", "append", "delete"]);

function checkChange(c: DiffChange, idx: number): string | null {
  if (!c || typeof c !== "object") return `changes[${idx}] 不是对象`;

  // path
  if (typeof c.path !== "string" || !c.path.trim())
    return `changes[${idx}].path 为空或不是字符串`;

  // action
  if (typeof c.action !== "string" || !VALID_ACTIONS.has(c.action))
    return `changes[${idx}].action 非法："${c.action}"（必须是 replace / append / delete）`;

  // newText：必须是字符串。delete 允许空串（表示删除原文），但其他 action 必须非空且非占位符
  if (typeof c.newText !== "string")
    return `changes[${idx}].newText 不是字符串`;
  if (c.action !== "delete" && isPlaceholder(c.newText))
    return `changes[${idx}].newText 是占位符或空串："${c.newText}"`;

  // reason
  if (typeof c.reason !== "string" || isPlaceholder(c.reason))
    return `changes[${idx}].reason 是占位符或空串："${c.reason}"`;

  // oldText：replace/delete 时应该有；append 时省略也允许
  if (c.action === "replace" || c.action === "delete") {
    if (typeof c.oldText !== "string" || !c.oldText.trim())
      return `changes[${idx}].oldText 为空（${c.action} 操作必须提供 oldText）`;
  }

  return null;
}

interface RewriteResult {
  changes: DiffChange[];
}

/**
 * 校验 LLM 返回的 rewrite 结果。
 * 通过 → null
 * 失败 → 错误描述（callWithFallback 据此切讯飞重试）
 *
 * 注意：路径白名单 / 字数倍率 / 虚构数字 / 虚构技能 由 lib/diff-validator.ts 在路由层调用，
 *      这里只做"格式 / 字段非空 / 占位符" 三类基础校验。
 */
export function validateRewriteResult(data: RewriteResult): string | null {
  if (!data || typeof data !== "object") return "data 不是对象";

  if (!Array.isArray(data.changes)) return "changes 不是数组";

  if (data.changes.length < 3)
    return `changes 长度 ${data.changes.length}（要求 ≥ 3）`;

  for (let i = 0; i < data.changes.length; i++) {
    const issue = checkChange(data.changes[i], i);
    if (issue) return issue;
  }

  return null;
}
