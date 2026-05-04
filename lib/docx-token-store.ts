/**
 * docx-token-store · prefetch 模式的数据 token 存储
 * ———————————————
 * 单实例 process-local Map（pm2 fork 模式 OK；如未来切 cluster 须换 Redis）。
 * `prepare` 收到 POST 后用 putReportData 拿 token；GET handler 用 peekReportData
 * 非破坏性读取（用户可重试下载）。
 */

import { randomBytes } from "node:crypto";
import type { DiffChange, ResumeJSON } from "./types";

export interface ReportPayload {
  resume: ResumeJSON;
  changes: DiffChange[];
}

interface Entry {
  data: ReportPayload;
  expiresAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const GC_INTERVAL_MS = 60 * 1000;
const GC_KEY = "__docxTokenStoreGC__";

const store = new Map<string, Entry>();

function newToken(): string {
  return randomBytes(16).toString("hex");
}

export function putReportData(data: ReportPayload): string {
  const token = newToken();
  store.set(token, { data, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function peekReportData(token: string): ReportPayload | null {
  const e = store.get(token);
  if (!e) return null;
  if (e.expiresAt < Date.now()) {
    store.delete(token);
    return null;
  }
  return e.data;
}

// HMR / 重复加载下不重复注册 GC（timer.unref 让 GC 不阻塞进程退出）
const g = globalThis as typeof globalThis & { [GC_KEY]?: boolean };
if (!g[GC_KEY]) {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (v.expiresAt < now) store.delete(k);
    }
  }, GC_INTERVAL_MS);
  timer.unref?.();
  g[GC_KEY] = true;
}
