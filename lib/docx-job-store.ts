/**
 * docx-job-store · 渲染 Job Promise 共享存储
 * ———————————————
 * - Promise 是共享的，多次 GET 同一 token 都 await 同一个渲染过程，不重复跑
 * - startJob 幂等（同 token 二次调用返回原 job）
 * - PENDING_TIMEOUT_MS 兜底：渲染卡住超时则标记 error，避免内存泄漏
 *
 * 注意：本 store 是 process-local（pm2 fork 单实例下 OK；上 cluster 须换 Redis）。
 */

import type { Buffer } from "node:buffer";
import type { DiffChange, ResumeJSON } from "./types";

export interface ReportPayload {
  resume: ResumeJSON;
  changes: DiffChange[];
}

export type JobStatus = "pending" | "ready" | "error";

export interface DocxJob {
  status: JobStatus;
  promise: Promise<Buffer>;
  buffer?: Buffer;
  error?: string;
  expiresAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const GC_INTERVAL_MS = 60 * 1000;
const PENDING_TIMEOUT_MS = 60 * 1000; // 渲染最多 60s，超过算挂死
const GC_KEY = "__docxJobStoreGC__";

const jobs = new Map<string, DocxJob>();

export type RenderFn = (payload: ReportPayload) => Promise<Buffer>;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`docx render 超时（${ms}ms）`));
    }, ms);
    timer.unref?.();
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export function startJob(
  token: string,
  payload: ReportPayload,
  renderFn: RenderFn,
): DocxJob {
  const existing = jobs.get(token);
  if (existing) return existing;

  const job: DocxJob = {
    status: "pending",
    promise: withTimeout(renderFn(payload), PENDING_TIMEOUT_MS),
    expiresAt: Date.now() + TTL_MS,
  };
  job.promise.then(
    (buf) => {
      job.buffer = buf;
      job.status = "ready";
    },
    (err: unknown) => {
      job.error = err instanceof Error ? err.message : String(err);
      job.status = "error";
    },
  );
  jobs.set(token, job);
  return job;
}

export function getJob(token: string): DocxJob | null {
  const job = jobs.get(token);
  if (!job) return null;
  if (job.status !== "pending" && job.expiresAt < Date.now()) {
    jobs.delete(token);
    return null;
  }
  return job;
}

const g = globalThis as typeof globalThis & { [GC_KEY]?: boolean };
if (!g[GC_KEY]) {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of jobs) {
      // pending 超过两倍超时也清理（理论上 withTimeout 已经把它推向 error，
      // 这里是防御性兜底）
      const tooLong = v.status === "pending" && v.expiresAt < now - PENDING_TIMEOUT_MS;
      const settledExpired = v.status !== "pending" && v.expiresAt < now;
      if (tooLong || settledExpired) jobs.delete(k);
    }
  }, GC_INTERVAL_MS);
  timer.unref?.();
  g[GC_KEY] = true;
}
