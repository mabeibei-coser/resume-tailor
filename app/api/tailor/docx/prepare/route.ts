/**
 * /api/tailor/docx/prepare · prefetch 模式入口
 * ———————————————
 * - POST { resume, changes } → { token } in <50ms
 * - 同步存数据 + 异步起渲染（fire-and-forget），客户端拿 token 后即可 GET 下载
 * - 同 token 二次 POST 复用旧 job（startJob 幂等），React StrictMode dev 双挂载安全
 */

import { applyDiffChanges } from "@/lib/diff-applier";
import { buildResumeDocx } from "@/lib/docx-builder";
import { putReportData } from "@/lib/docx-token-store";
import { startJob } from "@/lib/docx-job-store";
import { ResumeJSONSchema, type DiffChange } from "@/lib/types";

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

  if (!Array.isArray(body.changes)) {
    return jsonError(400, "changes 必须是 DiffChange[]");
  }

  const payload = { resume: parsed.data, changes: body.changes as DiffChange[] };
  const token = putReportData(payload);

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
