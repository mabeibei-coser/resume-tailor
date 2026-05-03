/**
 * 临时 dev-only 路由（Step 12 验证用）
 * 用途：直接调用 parseResumeToJson() 验证 Step 12 实现，
 *      不经过 Step 13 的 /api/tailor/rewrite 流程。
 *
 * Step 13 接入后这个路由可删除，或保留作为 e2e 调试入口。
 */
import { NextResponse } from "next/server";

import { parseResumeToJson } from "@/lib/resume-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  resumeText?: string;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Body 解析失败：必须是 JSON" },
      { status: 400 }
    );
  }

  const resumeText = body.resumeText;
  if (!resumeText || !resumeText.trim()) {
    return NextResponse.json(
      { error: "resumeText 不能为空" },
      { status: 400 }
    );
  }

  try {
    const t0 = Date.now();
    const data = await parseResumeToJson(resumeText);
    const elapsed = Date.now() - t0;
    return NextResponse.json({ data, _elapsedMs: elapsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `解析失败: ${msg}` },
      { status: 500 }
    );
  }
}
