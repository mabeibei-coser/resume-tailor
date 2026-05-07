/**
 * /api/tailor/docx/prepare · prefetch 模式入口
 * ———————————————
 * - POST { resume, changes } → { token } in <50ms
 * - 同步生成 token + 异步起渲染（fire-and-forget），客户端拿 token 后即可 GET 下载
 * - 注：每次 POST 都生成新 token，所以 React StrictMode dev 双挂载会触发两次渲染。
 *   生产环境单挂载，无影响；如要去重，前端可加 idempotency key。
 */

import { randomBytes } from "node:crypto";
import { applyDiffChanges } from "@/lib/diff-applier";
import { buildResumeDocx } from "@/lib/docx-builder";
import { startJob } from "@/lib/docx-job-store";
import { DiffChangeArraySchema, ResumeJSONSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface RequestBody {
  resume?: unknown;
  changes?: unknown;
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError(400, "Body 解析失败：必须是 JSON");
  }

  const parsed = ResumeJSONSchema.safeParse(body?.resume);
  if (!parsed.success) {
    return jsonError(400, `resume 不是合法 ResumeJSON：${parsed.error.message}`);
  }

  const changesParsed = DiffChangeArraySchema.safeParse(body.changes);
  if (!changesParsed.success) {
    return jsonError(400, `changes 不是合法 DiffChange[]：${changesParsed.error.message}`);
  }

  const payload = { resume: parsed.data, changes: changesParsed.data };
  const token = randomBytes(16).toString("hex");

  // fire-and-forget — 直接拿渲染后的 Buffer 缓存到 job-store
  startJob(token, payload, async (p) => {
    const next = applyDiffChanges(p.resume, p.changes);
    return buildResumeDocx(next);
  });

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
