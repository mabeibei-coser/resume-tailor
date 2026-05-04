export interface BankQuestion {
  id: string;
  text: string;
  tag: "preference";
}

/**
 * Resume Tailor 访谈题库
 * 顺序：先简历优化诉求（更具体、更易作答 → 暖场），再 JD 补充。
 * id 与位置绑定（q1 = 第一题 / q2 = 第二题），改顺序时连同 text 一起换。
 */
export const INTERVIEW_QUESTION_BANK: BankQuestion[] = [
  {
    id: "q1",
    tag: "preference",
    text: "对于本次简历优化你有任何想法或者要求可以在这里告诉我。",
  },
  {
    id: "q2",
    tag: "preference",
    text: "对于这个岗位的信息你还有什么需要补充给我注意的嘛？",
  },
];

/**
 * Q2 fallback 题库 — 真 LLM 追问失败 / 超时（2s）时的兜底池。
 * 5 道追问覆盖简历改写常见聚焦点（量化指标 / 关键词 / 排版 / 经历取舍 / 行业画像），
 * 设计原则参考 ai-interview-question-design skill：开放式但有方向，每题 ≤ 50 字。
 * 顺序游标轮询保证 3 次连续 fallback 拿到 3 道不同题。
 */
export const Q2_FALLBACK_BANK: BankQuestion[] = [
  {
    id: "q2-quant",
    tag: "preference",
    text: "你希望简历里的成果用哪种方式量化？比如百分比、数值、规模，还是节省时间这种业务语言？",
  },
  {
    id: "q2-keyword",
    tag: "preference",
    text: "对照你贴的 JD，哪些关键词或技能你觉得现在简历里命中得不够？想优先补齐哪个方向？",
  },
  {
    id: "q2-layout",
    tag: "preference",
    text: "排版和长度上你最在意什么？是压到一页、模块顺序，还是某些段落要更显眼？",
  },
  {
    id: "q2-tradeoff",
    tag: "preference",
    text: "如果只能保留两段经历，你会留哪两段？哪些经历你觉得反而拖累了整体定位？",
  },
  {
    id: "q2-industry",
    tag: "preference",
    text: "目标公司更偏大厂、创业公司还是传统行业？语言风格和案例选择上你希望往哪边靠？",
  },
];

/** 模块级游标：进程存活期间顺序滚动，重启后从头来 */
let _cursor = 0;

/**
 * 顺序取下一道题（非随机）。
 * 每次调用游标向后推一位；exclude 不为空时自动跳过已用题，游标仍正确推进。
 */
export function pickNextQuestion(exclude?: string[]): BankQuestion {
  const bank = INTERVIEW_QUESTION_BANK;
  const n = bank.length;

  for (let i = 0; i < n; i++) {
    const q = bank[(_cursor + i) % n];
    if (!exclude?.includes(q.id)) {
      _cursor = (_cursor + i + 1) % n;
      return q;
    }
  }

  // 全部被排除（正常不会走到这里）：返回当前游标并推进
  const fallback = bank[_cursor];
  _cursor = (_cursor + 1) % n;
  return fallback;
}

/** Q2 fallback 池独立游标，与 Q1 题库游标互不干扰 */
let _q2Cursor = 0;

/**
 * 从 Q2 fallback 池顺序取下一道题。
 * exclude 仅对 Q2 池生效（一般不会用到，因为 page 只会 exclude q1，不会 exclude q2-*）。
 */
export function pickQ2Fallback(exclude?: string[]): BankQuestion {
  const bank = Q2_FALLBACK_BANK;
  const n = bank.length;

  for (let i = 0; i < n; i++) {
    const q = bank[(_q2Cursor + i) % n];
    if (!exclude?.includes(q.id)) {
      _q2Cursor = (_q2Cursor + i + 1) % n;
      return q;
    }
  }

  const fallback = bank[_q2Cursor];
  _q2Cursor = (_q2Cursor + 1) % n;
  return fallback;
}

/** @deprecated 使用 pickNextQuestion 代替 */
export function pickRandomQuestion(exclude?: string[]): BankQuestion {
  return pickNextQuestion(exclude);
}
