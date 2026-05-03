/**
 * /api/tailor/docx （Step 18 · Download API）
 * ———————————————
 * 流程（plan v3.2）：
 *   报告页 sessionStorage { resume, changes }
 *     ↓ POST /api/tailor/docx
 *   ResumeJSONSchema.safeParse(resume) 通过 → applyDiffChanges(resume, changes)
 *     ↓ （diff-applier 内部跳过 flagged）
 *   buildResumeDocx(newResume) → Buffer
 *     ↓
 *   200 OK + Content-Disposition: attachment; filename*=UTF-8''<encoded>
 *   <binary docx body>
 *
 * 错误：JSON 解析失败 / Zod 校验失败 / docx-builder 抛错 → 4xx/5xx + JSON
 */
import { applyDiffChanges } from "@/lib/diff-applier";
import { buildResumeDocx } from "@/lib/docx-builder";
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
  // 1. 解析 body
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError(400, "Body 解析失败：必须是 JSON");
  }

  if (!body || typeof body !== "object") {
    return jsonError(400, "Body 必须是对象 { resume, changes }");
  }

  // 2. Zod 校验 resume
  const parsed = ResumeJSONSchema.safeParse(body.resume);
  if (!parsed.success) {
    return jsonError(
      400,
      `resume 不是合法 ResumeJSON：${parsed.error.message}`,
    );
  }
  const resume = parsed.data;

  // 3. changes 必须是数组（具体字段由 diff-applier 容忍处理）
  if (!Array.isArray(body.changes)) {
    return jsonError(400, "changes 必须是 DiffChange[]");
  }
  const changes = body.changes as DiffChange[];

  // 4. 应用 diff（跳过 flagged）
  let nextResume;
  try {
    nextResume = applyDiffChanges(resume, changes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(500, `应用 diff 失败：${msg}`);
  }

  // 5. 生成 docx Buffer
  let buffer: Buffer;
  try {
    buffer = await buildResumeDocx(nextResume);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(500, `生成 docx 失败：${msg}`);
  }

  // 6. 中文文件名走 RFC 5987（filename*=UTF-8''xxx），避免浏览器乱码
  const filename = `优化简历-${Date.now()}.docx`;
  const headers = new Headers({
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Content-Length": buffer.byteLength.toString(),
    "Cache-Control": "no-store",
  });

  return new Response(new Uint8Array(buffer), { status: 200, headers });
}
