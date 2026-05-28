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
 * - 不虚构整段没干过的工作 / 学历 / 公司、不篡改经历核心动作
 * - newText 字数 ≤ oldText × 1.8
 * - moderate 夸大成分 < 15%、aggressive 夸大成分 < 30%（数据可基于简历内容合理推演，但要符合岗位 / 行业体量）
 *
 * Validator：
 * - 检查 changes 是数组、长度 ≥ 3
 * - 每个 change：path 非空 / action ∈ {replace,append,delete} / newText 非空非占位符 / reason 非空
 * - 路径白名单 / 字数倍率 / 虚构技能名 留给 lib/diff-validator.ts（路由层调用）
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
- basics.birthday / basics.hometown / basics.yearsOfExperience
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

### moderate（稳妥润色风格 · 夸大成分 < 15%）— 建议 5-12 条 changes
**用户期望**：对岗位、经历、业绩进行适当的润色美化，重点突出与目标岗位匹配的【能力 / 业绩 / 项目】，润色偏保守风格。

- **可重排经历顺序**：按 JD 相关度从高到低重排数组，但不改公司名、不改历史岗位、不改时间（这些字段在路径白名单里仍禁改）
- **只调措辞 / 补量化 / 对齐 JD 关键词**：换更精准的动词、显式带出 JD 要求的技术栈或方法论名词
- **适当增加数据**：newText 可补充合理范围内的量化指标（百分比、规模、人数、增长率等），**不要求出自原文**，但要符合候选人岗位 / 行业的合理体量
- **整体润色夸大成分 < 15%**：偏保守，不大改岗位描述、不在 newText 里塞简历里完全没出现过的硬技能词
- **不擅自删除经历**：可以 replace 让某条 highlight 更对齐，不要 delete 掉整段
- 大多数 changes 是 replace（占 70%+），少量 append（补一条与 JD 强相关但简历漏写的能力点）

### aggressive（激进风格重构 · 夸大成分 < 30%）— 建议 8-20 条 changes
**用户期望**：基于简历内容做联想、重构简历结构、增强 JD 所要求的匹配点，以数据说话，润色风格偏激进。

- **可基于简历内容做联想**：从简历真实经历出发延伸，把模糊职责具体化、把"参与"重构为"负责"、把抽象贡献量化为可读数据；联想必须能追溯到 ResumeJSON 里的某段真实经历
- **不可篡改经历核心动作 / 职责**：可大改措辞、可补量化、可联想包装，但 newText 描述的动作与原文必须是同一件事。
    - ✗ 反例："每日与客户邮件交流、处理售后问题" 改成 "主导建设客户数据中台、对接 1000 万 + 用户" —— 偷换了动作 + 数据明显失真
    - ✓ 正例："每日与客户邮件交流、处理售后问题" 改成 "高频邮件对接 200+ 客户需求、闭环跟进售后问题，平均响应时长压缩至 4 小时" —— 同一件事，措辞更利落 + 补合理数据
- **以数据说话**：newText 较多地使用百分比、规模、人数、增长率等可读数据；数据可基于简历内容合理推演，**不要求原文出处**，但要符合岗位 / 行业体量；整体夸大 < 30%
- **可 delete 与 JD 无关的弱经历**：在 reason 里写明为什么删（如"该 highlight 与 JD 用户增长方向无关，建议删除腾出篇幅"）
- **可改岗位描述（不改岗位名）**：basics.label 可大幅改写贴近目标岗，work[*].summary 可以重写让更贴 JD 视角，但仍以真实职责为底
- **可改 skills 类别名 / 重组关键词**：把 "专业技能" 拆成 "前端框架 / 后端 / 工具" 三类
- 整体语气主动、强势，多用结果导向动词（"主导 / 推动 / 落地 / 沉淀"）

## 红线（违反任意一条都视为本次任务失败）

1. **不虚构硬技能名**：newText 里出现的硬技能词（React / Python / SQL / Tableau / Power BI 等）必须能在原 ResumeJSON 或 JD 里找到出处，不能凭空加 "AI Agent / LangChain" 这种简历里完全没有的技能
2. **不编整段没干过的经历**：禁止在 newText 里说"2023 年主导了一个 X 项目"，除非 ResumeJSON 里真有这个时间和经历；不可虚构整段没干过的工作 / 学历 / 公司
3. **newText 字数 ≤ oldText × 1.8**：超过上限会被拦下；append 时 newText 不超过 50 字
4. **数据要符合岗位 / 行业体量**：moderate 夸大 < 15%、aggressive 夸大 < 30%；不可写"覆盖 1 亿用户"这种与候选人量级明显失真的数字
5. **不篡改经历的核心动作 / 职责**：可大改措辞、可补量化、可联想包装，但 newText 描述的动作 / 职责必须能追溯到 ResumeJSON 里同一段经历，不得把"邮件沟通"换成"数据中台建设"
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
    jd.length > 4500 ? jd.slice(0, 4500) + "\n...(已截断)" : jd;

  const modeLabel =
    mode === "aggressive"
      ? "激进风格重构（可基于简历内容做联想、可重组顺序、可改岗位描述、可建议删经历，以数据说话；夸大成分 < 30%）"
      : "稳妥润色风格（适当润色美化，可重排经历，适当增加数据；夸大成分 < 15%）";

  return [
    REWRITE_USER_TEMPLATE_HEAD,
    `【目标岗位】\n${jobTitle}`,
    `\n【优化偏好】\n${modeLabel}`,
    `\n【JD 原文】\n${jdSnippet}`,
    `\n【现有 ResumeJSON】\n${JSON.stringify(resume, null, 2)}`,
    `\n本次优化程度：${mode}（请严格按照 system 中「优化程度规则」对应一套规则执行；moderate 夸大成分 < 15%，aggressive 夸大成分 < 30%；两种模式都不得篡改经历核心动作、不得虚构整段没干过的工作）。`,
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

  // newText：delete 允许 null/undefined（iFlytek 对删除动作返回 null，等价于空串）
  // 其他 action 必须是非空非占位符字符串
  if (c.action !== "delete" && typeof c.newText !== "string")
    return `changes[${idx}].newText 不是字符串`;
  if (c.action !== "delete" && isPlaceholder(c.newText as string))
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
 * 注意：路径白名单 / 字数倍率 / 虚构技能 由 lib/diff-validator.ts 在路由层调用，
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
