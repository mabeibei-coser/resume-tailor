// Step 16 · Diff Applier
// 把 DiffChange[] 应用到 ResumeJSON，返回新的 ResumeJSON
// 只应用未 flagged 的 change（flagged 的 AI 想改但被 validator 拦下了）
// 不 mutate 原对象（深拷贝）

import { DiffChange, ResumeJSON } from "./types";

// ——————————————————————————
// 路径解析
// 把 "work[0].highlights[2]" 拆成 ["work", 0, "highlights", 2]
// 字段名 → string，数组下标 → number
// ——————————————————————————

export function parsePath(path: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  // 匹配 字段名（\w+）或 数组下标（\[\d+\]）
  const re = /(\w+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) {
      tokens.push(m[1]);
    } else if (m[2] !== undefined) {
      tokens.push(parseInt(m[2], 10));
    }
  }
  return tokens;
}

// ——————————————————————————
// 辅助：按 tokens 取值（找不到返回 undefined）
// ——————————————————————————

export function getValueByPath(
  obj: unknown,
  tokens: Array<string | number>
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

// ——————————————————————————
// 辅助：按 tokens 设置值
// 返回是否成功（中间节点不存在时返回 false 由调用方决定 warn 还是创建）
// 这里采用「不创建中间节点」策略：路径不通就失败
// ——————————————————————————

export function setValueByPath(
  obj: unknown,
  tokens: Array<string | number>,
  value: unknown
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
// 辅助：从数组里 splice 删除某个下标
// ——————————————————————————

function spliceByPath(
  obj: unknown,
  tokens: Array<string | number>
): boolean {
  if (tokens.length === 0) return false;
  const last = tokens[tokens.length - 1];
  if (typeof last !== "number") return false;
  // 取父
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
  if (!Array.isArray(cur)) return false;
  if (last < 0 || last >= cur.length) return false;
  cur.splice(last, 1);
  return true;
}

// ——————————————————————————
// 主函数
// ——————————————————————————

export function applyDiffChanges(
  resume: ResumeJSON,
  changes: DiffChange[]
): ResumeJSON {
  // 深拷贝，避免 mutate 原对象
  const next: ResumeJSON =
    typeof structuredClone === "function"
      ? structuredClone(resume)
      : JSON.parse(JSON.stringify(resume));

  for (const change of changes) {
    if (change.flagged === true) continue; // 跳过被 validator 拦下的

    const tokens = parsePath(change.path);
    if (tokens.length === 0) {
      console.warn(`[diff-applier] 路径解析失败: ${change.path}`);
      continue;
    }

    const target = getValueByPath(next, tokens);

    if (change.action === "replace") {
      // path 找不到目标（target undefined 且父路径不通）
      if (target === undefined) {
        // 检查父路径是否存在；如果父路径存在但叶子是 undefined（可选字段），允许 replace
        const parentTokens = tokens.slice(0, -1);
        const parent =
          parentTokens.length === 0
            ? next
            : getValueByPath(next, parentTokens);
        if (parent === undefined || parent === null) {
          console.warn(
            `[diff-applier] replace 目标不存在: ${change.path}`
          );
          continue;
        }
      }
      const ok = setValueByPath(next, tokens, change.newText);
      if (!ok) {
        console.warn(`[diff-applier] replace 失败: ${change.path}`);
      }
      continue;
    }

    if (change.action === "append") {
      if (Array.isArray(target)) {
        // append 到数组
        target.push(change.newText);
      } else if (typeof target === "string") {
        // append 到字符串：换行拼接
        const merged = target.length === 0
          ? change.newText
          : `${target}\n${change.newText}`;
        const ok = setValueByPath(next, tokens, merged);
        if (!ok) {
          console.warn(`[diff-applier] append 字符串失败: ${change.path}`);
        }
      } else if (target === undefined) {
        // 字段还不存在 — 当成新建字符串处理
        const ok = setValueByPath(next, tokens, change.newText);
        if (!ok) {
          console.warn(
            `[diff-applier] append 目标不存在且父路径不通: ${change.path}`
          );
        }
      } else {
        console.warn(
          `[diff-applier] append 目标类型不支持: ${change.path} (${typeof target})`
        );
      }
      continue;
    }

    if (change.action === "delete") {
      if (target === undefined) {
        console.warn(`[diff-applier] delete 目标不存在: ${change.path}`);
        continue;
      }
      const last = tokens[tokens.length - 1];
      if (typeof last === "number") {
        // 数组元素 → splice
        const ok = spliceByPath(next, tokens);
        if (!ok) {
          console.warn(`[diff-applier] delete splice 失败: ${change.path}`);
        }
      } else {
        // 字段：保留原值并 warn（避免破坏 schema）
        console.warn(
          `[diff-applier] delete 字段被忽略（避免破坏 schema）: ${change.path}`
        );
      }
      continue;
    }

    console.warn(`[diff-applier] 未知 action: ${(change as DiffChange).action}`);
  }

  return next;
}
