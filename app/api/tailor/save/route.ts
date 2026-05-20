import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { TailorFormData, TailorReport } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      formData: TailorFormData;
      report: TailorReport;
      durationMs?: number;
    };
    const { formData, report, durationMs } = body;

    if (!formData?.jobTitle || !formData?.jd || !report?.suggestions) {
      return NextResponse.json(
        { ok: false, error: "missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();
    const uuid = crypto.randomUUID();
    const now = Date.now();
    const userName = report.resume?.basics?.name ?? null;
    const userPhone = report.resume?.basics?.phone ?? null;

    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      null;

    const stmt = db.prepare(`
      INSERT INTO reports
        (uuid, created_at, job_title, mode, resume_filename,
         user_name, user_phone, form_data_json, report_json, fallback, ip, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 去掉 parsedResume 和 resumeText（体积大，存了也读不到），省磁盘
    const { parsedResume: _pr, resumeText: _rt, ...compactFormData } = formData;
    void _pr;
    void _rt;

    const result = stmt.run(
      uuid,
      now,
      formData.jobTitle,
      formData.mode,
      formData.resumeFilename ?? null,
      userName,
      userPhone,
      JSON.stringify(compactFormData),
      JSON.stringify(report),
      report.fallback ? 1 : 0,
      ip,
      durationMs ?? null
    );

    return NextResponse.json({ ok: true, id: result.lastInsertRowid, uuid });
  } catch (e) {
    console.error("[tailor/save] error:", e);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}
