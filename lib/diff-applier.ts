// Step 16 · Diff Applier（保守导出版）
// 把 DiffChange[] 应用到 ResumeJSON，返回新的 ResumeJSON。不 mutate 原对象（深拷贝）。
//
// 设计原则（2026-05 修复「工作经历串行 + 漏出待核实」后）：
// applyDiffChanges 是 LLM 改写意见落地成 docx 的最后一道关。LLM 给的 path 下标
// 经常数错，delete 会让数组下标整体错位，跨段搬运会把 A 公司的经历搬到 B 公司。
// 这一层只做「安全的、可证明不破坏结构」的改动，定位不到 / 不安全的一律保留原文：
//   ① 带「待核实」标记的改写 → 跳过（保守导出：编造 / 未核实内容不进 docx）
//   ② delete → 一律跳过（删除是结构破坏 + 经历丢失的主要来源）
//   ③ replace 数组元素 → 靠 oldText 内容定位，不信任 LLM 给的下标
//   ④ 任何 change 的 newText 若原本属于另一段经历 → 跳过（拦截跨段搬运）

import { DiffChange, ResumeJSON } from "./types";

// ——————————————————————————
// 路径解析：把 "work[0].highlights[2]" 拆成 ["work", 0, "highlights", 2]
// ——————————————————————————

export function parsePath(path: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  const re = /(\w+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) tokens.push(m[1]);
    else if (m[2] !== undefined) tokens.push(parseInt(m[2], 10));
  }
  return tokens;
}

// 辅助：按 tokens 取值（找不到返回 undefined）
export function getValueByPath(
  obj: unknown,
  tokens: Array<string | number>,
): unknown {
  let cur: unknown = obj;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof t === "number") {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[t];
    } else {
      if (typeof cur !== "object") return undefined;
      cur = (cur as Record<string, unknown>)[t];
    }
  }
  return cur;
}

// 辅助：按 tokens 设置值（中间节点不存在则失败，不创建）
export function setValueByPath(
  obj: unknown,
  tokens: Array<string | number>,
  value: unknown,
): boolean {
  if (tokens.length === 0) return false;
  let cur: unknown = obj;
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    if (cur === null || cur === undefined) return false;
    if (typeof t === "number") {
      if (!Array.isArray(cur)) return false;
      cur = cur[t];
    } else {
      if (typeof cur !== "object") return false;
      cur = (cur as Record<string, unknown>)[t];
    }
  }
  if (cur === null || cur === undefined) return false;
  const last = tokens[tokens.length - 1];
  if (typeof last === "number") {
    if (!Array.isArray(cur)) return false;
    cur[last] = value;
  } else {
    if (typeof cur !== "object") return false;
    (cur as Record<string, unknown>)[last] = value;
  }
  return true;
}

// ——————————————————————————
// 内容归一化 + 跨段搬运检测
// ——————————————————————————

// 带此标记的改写视为「未核实 / 可能虚构」，保守导出下不进 docx（与 analyze.ts 对应）
const REVIEW_MARK = /[（(]\s*待核实\s*[)）]/;

// 归一化：NFKC + 去空白 + 小写。LLM 常产出 "ppt" → " ppt" 之类轻微变体，
// 精确 === 会漏判，归一化后再比。
function norm(s: string): string {
  return s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

// 把 tokens 还原成数组路径签名（用来区分 work[0].highlights vs work[1].highlights）
function sigOf(tokens: Array<string | number>): string {
  let s = "";
  for (const t of tokens) {
    if (typeof t === "number") s += `[${t}]`;
    else s += s ? `.${t}` : t;
  }
  return s;
}

// 扫描原始 resume，建立「数组里的字符串 → 它所属数组签名」的索引。
// 用来判断一条 change 是否把某段经历的内容「搬」到了另一段。
function buildContentOwnerMap(resume: ResumeJSON): Map<string, string> {
  const owner = new Map<string, string>();
  const walk = (node: unknown, sig: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        if (typeof item === "string") {
          const k = norm(item);
          if (k && !owner.has(k)) owner.set(k, sig);
        } else {
          walk(item, `${sig}[${i}]`);
        }
      });
    } else if (node && typeof node === "object") {
      for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
        walk(val, sig ? `${sig}.${key}` : key);
      }
    }
  };
  walk(resume, "");
  return owner;
}

// newText 的内容若在原始 resume 里属于「另一个」数组 → 视为跨段搬运
function isCrossSectionMove(
  text: string,
  targetSig: string,
  owner: Map<string, string>,
): boolean {
  if (!text || !text.trim()) return false;
  const home = owner.get(norm(text));
  return home !== undefined && home !== targetSig;
}

// ——————————————————————————
// replace / append 落地
// ——————————————————————————

function applyReplace(
  next: ResumeJSON,
  tokens: Array<string | number>,
  change: DiffChange,
  owner: Map<string, string>,
): void {
  const newText = typeof change.newText === "string" ? change.newText : "";
  const last = tokens[tokens.length - 1];

  // 数组元素 replace —— 靠 oldText 内容定位，不信任 LLM 给的下标
  if (typeof last === "number") {
    const arrTokens = tokens.slice(0, -1);
    const arr = getValueByPath(next, arrTokens);
    if (!Array.isArray(arr)) {
      console.warn(`[diff-applier] replace 跳过：目标数组不存在 ${change.path}`);
      return;
    }

    let idx = last;
    const oldText = change.oldText;
    if (typeof oldText === "string" && oldText.trim()) {
      const found = arr.findIndex(
        (el) => typeof el === "string" && norm(el) === norm(oldText),
      );
      if (found === -1) {
        console.warn(
          `[diff-applier] replace 跳过：oldText 在目标数组中找不到（下标疑似错位）${change.path}`,
        );
        return;
      }
      idx = found;
    } else if (idx < 0 || idx >= arr.length) {
      console.warn(
        `[diff-applier] replace 跳过：下标越界且无 oldText 锚点 ${change.path}`,
      );
      return;
    }

    if (isCrossSectionMove(newText, sigOf(arrTokens), owner)) {
      console.warn(
        `[diff-applier] replace 跳过：newText 内容原属其它经历段，疑似跨段搬运 ${change.path}`,
      );
      return;
    }
    arr[idx] = newText;
    return;
  }

  // 字段 replace（basics.summary / work[*].summary 等）—— 无下标错位风险
  const target = getValueByPath(next, tokens);
  if (target === undefined) {
    const parentTokens = tokens.slice(0, -1);
    const parent =
      parentTokens.length === 0 ? next : getValueByPath(next, parentTokens);
    if (parent === undefined || parent === null) {
      console.warn(`[diff-applier] replace 跳过：目标不存在 ${change.path}`);
      return;
    }
  }
  if (!setValueByPath(next, tokens, newText)) {
    console.warn(`[diff-applier] replace 失败 ${change.path}`);
  }
}

function applyAppend(
  next: ResumeJSON,
  tokens: Array<string | number>,
  change: DiffChange,
  owner: Map<string, string>,
): void {
  const newText = typeof change.newText === "string" ? change.newText : "";
  const target = getValueByPath(next, tokens);

  if (Array.isArray(target)) {
    if (isCrossSectionMove(newText, sigOf(tokens), owner)) {
      console.warn(
        `[diff-applier] append 跳过：内容原属其它经历段，疑似跨段搬运 ${change.path}`,
      );
      return;
    }
    target.push(newText);
    return;
  }
  if (typeof target === "string") {
    const merged = target.length === 0 ? newText : `${target}\n${newText}`;
    if (!setValueByPath(next, tokens, merged)) {
      console.warn(`[diff-applier] append 字符串失败 ${change.path}`);
    }
    return;
  }
  if (target === undefined) {
    if (!setValueByPath(next, tokens, newText)) {
      console.warn(
        `[diff-applier] append 目标不存在且父路径不通 ${change.path}`,
      );
    }
    return;
  }
  console.warn(
    `[diff-applier] append 目标类型不支持 ${change.path}（${typeof target}）`,
  );
}

// ——————————————————————————
// 主函数
// ——————————————————————————

export function applyDiffChanges(
  resume: ResumeJSON,
  changes: DiffChange[],
): ResumeJSON {
  // 深拷贝，避免 mutate 原对象
  const next: ResumeJSON =
    typeof structuredClone === "function"
      ? structuredClone(resume)
      : JSON.parse(JSON.stringify(resume));

  // 用「原始 resume」建索引：内容归属以改写前为准
  const owner = buildContentOwnerMap(resume);

  for (const change of changes) {
    if (change.flagged === true) continue; // validator 已拦下

    // 保守导出 ①：带「待核实」的改写不进 docx —— 编造 / 未核实内容只在屏幕报告展示
    if (typeof change.newText === "string" && REVIEW_MARK.test(change.newText)) {
      console.info(`[diff-applier] 跳过含「待核实」的改写（保守导出）${change.path}`);
      continue;
    }

    // 保守导出 ②：不执行 delete —— 删除是结构破坏 + 经历丢失的主要来源，
    // 也是「把某段经历搬走」的一半。删除建议仅在报告页展示，不动求职者真实经历。
    if (change.action === "delete") {
      console.info(`[diff-applier] 跳过 delete（保守导出）${change.path}`);
      continue;
    }

    const tokens = parsePath(change.path);
    if (tokens.length === 0) {
      console.warn(`[diff-applier] 路径解析失败 ${change.path}`);
      continue;
    }

    if (change.action === "replace") {
      applyReplace(next, tokens, change, owner);
      continue;
    }
    if (change.action === "append") {
      applyAppend(next, tokens, change, owner);
      continue;
    }

    console.warn(`[diff-applier] 未知 action: ${(change as DiffChange).action}`);
  }

  return next;
}
