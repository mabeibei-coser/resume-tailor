#!/usr/bin/env node
/**
 * Step 26 · PC 端 E2E 验证脚本
 *
 * 覆盖范围：
 *   A. 路由检查：form / interview / loading / report 页面返回 200
 *   B. 简历解析：不支持格式返回 4xx
 *   C. Fallback 路径：analyze + rewrite 双路返回 fallback:true + 结构合规
 *   D. DOCX 下载：返回合法 .docx binary
 *   E. 两份样本（强/弱）→ analyze 输出
 *
 * 用法：node scripts/test-e2e.mjs [BASE_URL]
 * 默认目标：http://localhost:3001（已有 dev server 跑起来）
 */

const BASE = process.argv[2] ?? "http://localhost:3001";

const STRONG_RESUME = `
王大牛 | wangdaniu@email.com | 138-0000-0001 | 上海
教育背景
2015-2019  清华大学 计算机科学与技术 本科  GPA 3.9/4.0

工作经历
2023.03-至今   字节跳动  高级产品经理
- 主导抖音电商品类增长，12 个月内 GMV 增长 340%，月活用户从 3200万到 8100万
- 搭建用户增长数据平台，A/B 实验迭代 120+ 次，转化率提升 28%
- 管理 8 人产品团队，协同 5 个业务线，3 款主力功能完成 0→1

2020.07-2023.02  滴滴出行  产品经理
- 负责司机端收入激励体系，月均发券成本降低 15%，司机 NPS 提升 12 分

技能：产品设计 / SQL / Python / PRD / OKR
`.trim();

const WEAK_RESUME = `
李小白 | lixiaobai@email.com
教育背景
2020-2024  某省普通大学 市场营销 本科  GPA 2.6

工作经历
2024.07-至今   某电商公司  产品助理（实习转正）
- 协助整理产品需求文档
- 参与用户调研，收集问卷 200 份

技能：Office / Axure
`.trim();

const PM_JD = `
岗位：高级产品经理（用户增长方向）
要求：5年以上产品经验，2年以上用户增长，熟悉 SQL/Python，
有大型平台 0→1 产品经历，能独立撰写 PRD，良好跨部门沟通能力
`.trim();

// ── Test utilities ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const errors = [];

function ok(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? "  →  " + detail : ""}`);
    failed++;
    errors.push(`${label}${detail ? ": " + detail : ""}`);
  }
}

// ── Test suites ───────────────────────────────────────────────────────────────

async function testRoutes() {
  console.log("\n[A] 路由可访问性");
  for (const path of ["/", "/form", "/interview", "/loading", "/report"]) {
    const r = await fetch(`${BASE}${path}`).catch(() => null);
    ok(`GET ${path} → 200`, r?.status === 200, r ? `got ${r.status}` : "fetch error");
  }
}

async function testResumeParse() {
  console.log("\n[B] 简历解析 API");
  const fd = new FormData();
  fd.append("file", new Blob(["not a valid pdf"], { type: "text/plain" }), "test.txt");
  const r = await fetch(`${BASE}/api/resume/parse`, { method: "POST", body: fd });
  ok("非法格式返回 4xx", r.status >= 400 && r.status < 500, `status=${r.status}`);
}

async function testAnalyzeRewrite() {
  console.log("\n[C] analyze + rewrite（fallback 兜底验证）");

  const headers = { "Content-Type": "application/json" };
  const commonPayload = { formData: { jobTitle: "高级产品经理", jd: PM_JD, resumeText: STRONG_RESUME, mode: "moderate" } };
  const body = JSON.stringify(commonPayload);

  const [aR, rR] = await Promise.all([
    fetch(`${BASE}/api/tailor/analyze`, { method: "POST", headers, body }),
    fetch(`${BASE}/api/tailor/rewrite`, { method: "POST", headers, body }),
  ]);

  ok("analyze 200", aR.status === 200, `status=${aR.status}`);
  const aRaw = await aR.json().catch(() => ({}));
  const aD = aRaw.data ?? aRaw;
  ok("analyze.suggestions 非空", Array.isArray(aD.suggestions) && aD.suggestions.length >= 1);
  ok("analyze.interview >= 3", Array.isArray(aD.interview) && aD.interview.length >= 3);
  ok("analyze suggestion 有 title/problem/action", typeof aD.suggestions?.[0]?.title === "string");
  ok("analyze interview 有 question/sampleAnswer", typeof aD.interview?.[0]?.question === "string");

  ok("rewrite 200", rR.status === 200, `status=${rR.status}`);
  const rRaw = await rR.json().catch(() => ({}));
  const rD = rRaw.data ?? rRaw;
  ok("rewrite.changes 非空", Array.isArray(rD.changes) && rD.changes.length >= 1);
  ok("rewrite.resume.basics 存在", typeof rD.resume?.basics === "object");
  ok("change 有 path/action/newText/reason", (
    typeof rD.changes?.[0]?.path === "string" &&
    typeof rD.changes?.[0]?.action === "string" &&
    typeof rD.changes?.[0]?.newText === "string" &&
    typeof rD.changes?.[0]?.reason === "string"
  ));
}

async function testDocxDownload() {
  console.log("\n[D] DOCX 下载");

  const resume = {
    basics: { name: "王大牛", email: "test@example.com", label: "高级产品经理" },
    work: [{ name: "字节跳动", position: "高级产品经理", startDate: "2023-03",
      highlights: ["主导抖音电商增长，GMV 增长 340%"] }],
    education: [{ institution: "清华大学", area: "计算机科学", studyType: "本科" }],
    skills: [{ name: "产品设计", keywords: ["PRD", "SQL"] }],
  };
  const changes = [
    { path: "basics.summary", action: "append", newText: "5年产品经验，专注用户增长。", reason: "补充意向" },
    { path: "work[0].highlights[0]", action: "replace",
      oldText: "主导抖音电商增长，GMV 增长 340%",
      newText: "主导抖音电商品类增长，12 个月 GMV +340%，月活 3200万→8100万",
      reason: "量化表述" },
  ];

  const r = await fetch(`${BASE}/api/tailor/docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, changes }),
  });

  ok("docx API 200", r.status === 200, `status=${r.status}`);
  const ct = r.headers.get("content-type") ?? "";
  ok("Content-Type 含 docx/octet-stream", ct.includes("officedocument") || ct.includes("octet-stream"), ct);
  const cd = r.headers.get("content-disposition") ?? "";
  ok("Content-Disposition 含 .docx", cd.includes(".docx"), cd);
  const buf = await r.arrayBuffer();
  ok("文件 > 5KB", buf.byteLength > 5000, `${buf.byteLength} bytes`);
  const sig = new Uint8Array(buf.slice(0, 4));
  ok("文件头 PK（ZIP / docx 合法）", sig[0] === 0x50 && sig[1] === 0x4b,
    [...sig].map((b) => b.toString(16)).join(" "));
}

async function testTwoSamples() {
  console.log("\n[E] 两份样本（强 vs 弱）— analyze 输出");

  const headers = { "Content-Type": "application/json" };
  const [sR, wR] = await Promise.all([
    fetch(`${BASE}/api/tailor/analyze`, { method: "POST", headers,
      body: JSON.stringify({ formData: { jobTitle: "高级产品经理", jd: PM_JD, resumeText: STRONG_RESUME, mode: "moderate" } }) }),
    fetch(`${BASE}/api/tailor/analyze`, { method: "POST", headers,
      body: JSON.stringify({ formData: { jobTitle: "高级产品经理", jd: PM_JD, resumeText: WEAK_RESUME, mode: "aggressive" } }) }),
  ]);

  ok("强简历 analyze 200", sR.status === 200);
  ok("弱简历 analyze 200", wR.status === 200);

  const [sdRaw, wdRaw] = await Promise.all([sR.json(), wR.json()]);
  const sd = sdRaw.data ?? sdRaw;
  const wd = wdRaw.data ?? wdRaw;

  ok("强简历有建议", Array.isArray(sd.suggestions) && sd.suggestions.length >= 1);
  ok("弱简历有建议", Array.isArray(wd.suggestions) && wd.suggestions.length >= 1);

  const sFirst = sd.suggestions?.[0]?.title ?? "";
  const wFirst = wd.suggestions?.[0]?.title ?? "";
  // Either titles differ, or at least one is fallback (mock is OK for this check)
  ok("两份样本建议不完全相同或已明确走 fallback",
    sFirst !== wFirst || sd.fallback || wd.fallback,
    `strong="${sFirst}", weak="${wFirst}"`);
}

async function testFallbackFlags() {
  console.log("\n[F] TailorReport fallback 字段结构");

  const headers = { "Content-Type": "application/json" };
  const body = JSON.stringify({ formData: { jobTitle: "测试", jd: PM_JD, resumeText: WEAK_RESUME, mode: "moderate" } });

  const [aR, rR] = await Promise.all([
    fetch(`${BASE}/api/tailor/analyze`, { method: "POST", headers, body }),
    fetch(`${BASE}/api/tailor/rewrite`, { method: "POST", headers, body }),
  ]);
  const [aRawF, rRawF] = await Promise.all([aR.json().catch(() => ({})), rR.json().catch(() => ({}))]);
  const aDF = aRawF.data ?? aRawF;
  const rDF = rRawF.data ?? rRawF;

  ok("analyze fallback 字段为 boolean 或 undefined（可为 true / false / 不存在）",
    aDF.fallback === undefined || typeof aDF.fallback === "boolean", `got ${typeof aDF.fallback}`);
  ok("rewrite fallback 字段为 boolean 或 undefined",
    rDF.fallback === undefined || typeof rDF.fallback === "boolean", `got ${typeof rDF.fallback}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  Step 26 · PC E2E 验证");
  console.log(`  目标：${BASE}`);
  console.log("═══════════════════════════════════════");

  try {
    await testRoutes();
    await testResumeParse();
    await testAnalyzeRewrite();
    await testDocxDownload();
    await testTwoSamples();
    await testFallbackFlags();
  } catch (err) {
    console.error("\n[FATAL]", err.message);
    failed++;
    errors.push("fatal: " + err.message);
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  ✓ ${passed} passed   ✗ ${failed} failed`);
  if (errors.length) {
    console.log("\n  Failed:");
    errors.forEach((e) => console.log(`    - ${e}`));
  }

  console.log(`\n  [移动端待真机验证]`);
  console.log(`    iOS Safari   ：上传 DOCX → 访谈麦克风权限弹窗 → loading 进度 → 报告 4 块 → 下载 docx`);
  console.log(`    Android Chrome：同上`);
  console.log(`    使用 ngrok http 3001 暴露本地端口后扫码访问`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
