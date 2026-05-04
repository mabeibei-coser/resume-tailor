/**
 * docx-job-store · 渲染 Job Promise 共享存储
 * ———————————————
 * - Promise 是共享的，多次 GET 同一 token 都 await 同一个渲染过程，不重复跑
 * - startJob 幂等（同 token 二次调用返回原 job）
 * - GC 不淘汰 status=pending 的 job（让 Promise 自然 settle，避免泄漏）
 */

import type { Buffer } from "node:buffer";
import type { ReportPayload } from "./docx-token-store";

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
const GC_KEY = "__docxJobStoreGC__";

const jobs = new Map<string, DocxJob>();

export type RenderFn = (payload: ReportPayload) => Promise<Buffer>;

export function startJob(
  token: string,
  payload: ReportPayload,
  renderFn: RenderFn,
): DocxJob {
  const existing = jobs.get(token);
  if (existing) return existing;

  const job: DocxJob = {
    status: "pending",
    promise: renderFn(payload),
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
  // pending 即便"过期"也要让它跑完，避免泄漏
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
      if (v.status !== "pending" && v.expiresAt < now) jobs.delete(k);
    }
  }, GC_INTERVAL_MS);
  timer.unref?.();
  g[GC_KEY] = true;
}
