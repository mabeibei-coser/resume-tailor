/**
 * /api/tailor/docx
 * ———————————————
 * GET  ?token=xxx → 主路径：prefetch 模式，await 共享 Job Promise，回 docx attachment
 *                  这是真实 HTTP URL 链路，跨进程安全（解决安卓微信/QQ blob 拦截 + iOS 文件类型识别）
 * POST { resume, changes } → 兜底路径：直接同步生成（兼容旧客户端 / fallback）
 *
 * 中文文件名走 RFC 5987 的 filename*=UTF-8'' 形式避免乱码。
 */

import { applyDiffChanges } from "@/lib/diff-applier";
import { buildResumeDocx } from "@/lib/docx-builder";
import { getJob } from "@/lib/docx-job-store";
import { ResumeJSONSchema, type DiffChange } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function attachmentResponse(buffer: Buffer): Response {
  const filename = `优化简历-${Date.now()}.docx`;
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: new Headers({
      "Content-Type": DOCX_MIME,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": buffer.byteLength.toString(),
      "Cache-Control": "no-store",
    }),
  });
}

// ——————————————————————————
// GET — prefetch 主路径
// ——————————————————————————

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return jsonError(400, "缺少 token 参数");

  const job = getJob(token);
  if (!job) return jsonError(404, "下载链接已失效，请刷新页面后重试");

  let buffer: Buffer;
  try {
    buffer = await job.promise;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(500, `生成 docx 失败：${msg}`);
  }
  return attachmentResponse(buffer);
}

// ——————————————————————————
// POST — 兜底路径（保留旧行为，便于客户端临时回退）
// ——————————————————————————

interface RequestBody {
  resume?: unknown;
  changes?: unknown;
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

  let nextResume;
  try {
    nextResume = applyDiffChanges(parsed.data, body.changes as DiffChange[]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(500, `应用 diff 失败：${msg}`);
  }

  let buffer: Buffer;
  try {
    buffer = await buildResumeDocx(nextResume);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(500, `生成 docx 失败：${msg}`);
  }
  return attachmentResponse(buffer);
}
