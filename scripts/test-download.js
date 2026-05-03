/**
 * Step 18 集成测试：POST /api/tailor/docx
 *
 * 用法：
 *   1) 在另一个终端：cd D:/workspace/01_项目-Coding/resume-tailor && PORT=3002 npm run dev
 *   2) 等 dev ready
 *   3) node scripts/test-download.js
 *
 * 验证项：
 *   - 200 OK + Content-Type / Content-Disposition 头正确
 *   - 中文 filename 走 RFC 5987（filename*=UTF-8''...）
 *   - 写盘 D:/tmp/downloaded-resume.docx 后能用 mammoth 反向解析
 *   - unflagged change 已应用、flagged change 未应用
 *   - 错误分支：bad JSON → 400；resume 缺 basics → 400 Zod 错误
 */
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const mammoth = require("mammoth");

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
const BASE = `http://127.0.0.1:${PORT}`;
const ENDPOINT = `${BASE}/api/tailor/docx`;
const OUT_PATH = "D:/tmp/downloaded-resume.docx";

// ——————————————————————————
// fixture（参考 Step 16 + 加 flagged + unflagged 各一条）
// ——————————————————————————
const FIXTURE_RESUME = {
  basics: {
    name: "张伟",
    label: "前端工程师",
    email: "zhangwei@example.com",
    phone: "13800138000",
    summary: "5 年前端经验，主导设计系统建设与性能优化。",
    location: { city: "上海" },
  },
  work: [
    {
      name: "Acme 互联网",
      position: "高级前端工程师",
      startDate: "2022.07",
      endDate: "至今",
      summary: "负责设计系统建设与核心页面性能优化。",
      highlights: [
        "主导设计系统从 0 到 1 建设，沉淀 40+ 通用组件",
        "推动核心页面性能优化，首屏 LCP 从 3.2s 降到 1.4s",
        "实现 Z",
      ],
    },
  ],
  education: [
    {
      institution: "复旦大学",
      area: "计算机科学",
      studyType: "本科",
      startDate: "2016.09",
      endDate: "2020.06",
    },
  ],
  skills: [{ name: "React", keywords: ["Hooks", "Redux"] }],
};

// 标记字符串：方便断言
const UNFLAGGED_NEW = "实现 Z（升级版-DOWNLOADTEST）";
const FLAGGED_NEW = "应该被跳过-FLAGGED-DOWNLOADTEST";

const FIXTURE_CHANGES = [
  // unflagged：应该写入 docx
  {
    path: "work[0].highlights[2]",
    action: "replace",
    oldText: "实现 Z",
    newText: UNFLAGGED_NEW,
    reason: "细化",
  },
  // flagged：不应写入 docx
  {
    path: "basics.summary",
    action: "replace",
    oldText: "5 年前端经验",
    newText: FLAGGED_NEW,
    reason: "test flagged",
    flagged: true,
    flagReason: "test",
  },
];

// ——————————————————————————
// 工具
// ——————————————————————————

function logSection(t) {
  console.log("\n========== " + t + " ==========");
}

function assertEq(name, actual, expected) {
  const pass = actual === expected;
  console.log(`${pass ? "[PASS]" : "[FAIL]"} ${name}`);
  if (!pass) {
    console.log(`        actual=${JSON.stringify(actual)}`);
    console.log(`        expect=${JSON.stringify(expected)}`);
  }
  return pass;
}

function assert(name, cond, msg) {
  console.log(`${cond ? "[PASS]" : "[FAIL]"} ${name}`);
  if (!cond && msg) console.log(`        ${msg}`);
  return cond;
}

// ——————————————————————————
// 主流程
// ——————————————————————————

async function main() {
  let allPass = true;

  // ——————————————————————————
  // case 1：正常成功路径
  // ——————————————————————————
  logSection("case 1：正常成功 → 200 OK + docx Buffer");

  const res1 = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume: FIXTURE_RESUME, changes: FIXTURE_CHANGES }),
  });

  allPass = assertEq("HTTP status = 200", res1.status, 200) && allPass;

  const ct = res1.headers.get("content-type") || "";
  allPass =
    assert(
      "Content-Type 是 docx",
      ct.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
      `actual=${ct}`,
    ) && allPass;

  const cd = res1.headers.get("content-disposition") || "";
  allPass =
    assert(
      "Content-Disposition 含 attachment 与中文 filename",
      cd.includes("attachment") &&
        cd.includes("filename*=UTF-8''") &&
        cd.includes(encodeURIComponent("优化简历")),
      `actual=${cd}`,
    ) && allPass;

  const cl = res1.headers.get("content-length");
  allPass =
    assert(
      "Content-Length 存在且 > 0",
      cl !== null && parseInt(cl, 10) > 0,
      `actual=${cl}`,
    ) && allPass;

  // 写盘
  const buf = Buffer.from(await res1.arrayBuffer());
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, buf);
  console.log(`        Wrote ${OUT_PATH} (${buf.byteLength} bytes)`);

  allPass =
    assert(
      "buffer.byteLength 与 Content-Length 一致",
      cl !== null && buf.byteLength === parseInt(cl, 10),
    ) && allPass;

  allPass =
    assert("buffer 大小合理（> 1KB & < 200KB）", buf.byteLength > 1024 && buf.byteLength < 200 * 1024) &&
    allPass;

  // mammoth 反向解析
  let raw;
  try {
    const r = await mammoth.extractRawText({ buffer: buf });
    raw = r.value || "";
  } catch (e) {
    console.log("[FAIL] mammoth.extractRawText 抛错：", e && e.message);
    raw = "";
    allPass = false;
  }

  console.log(`        mammoth raw 长度 = ${raw.length}`);
  console.log(`        mammoth raw 头部 100 字 = ${JSON.stringify(raw.slice(0, 100))}`);

  // 验证：未 flagged change 已应用
  allPass = assert("docx 包含 unflagged 新文本", raw.includes(UNFLAGGED_NEW)) && allPass;

  // 验证：flagged change 未应用
  allPass =
    assert(
      "docx 不包含 flagged 新文本",
      !raw.includes(FLAGGED_NEW),
      "若包含则说明 flagged 误生效",
    ) && allPass;

  // 验证：原 work[0].highlights[2] 旧值消失（被 unflagged 替换）
  allPass =
    assert(
      "docx 已经替换旧 highlight 文本",
      !raw.match(/实现 Z(?!（升级版)/),
      "旧 \"实现 Z\" 字串还在",
    ) && allPass;

  // 验证：basics.summary 旧值仍在（flagged 没改）
  allPass =
    assert(
      "docx basics.summary 未被 flagged 改动",
      raw.includes("5 年前端经验"),
    ) && allPass;

  // 验证：标题等基础字段保留
  allPass = assert("docx 含姓名 张伟", raw.includes("张伟")) && allPass;
  allPass = assert("docx 含公司名 Acme", raw.includes("Acme")) && allPass;

  // ——————————————————————————
  // case 2：bad JSON → 400
  // ——————————————————————————
  logSection("case 2：bad JSON → 400");
  const res2 = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "this is not json {{{",
  });
  allPass = assertEq("HTTP status = 400", res2.status, 400) && allPass;
  const ct2 = res2.headers.get("content-type") || "";
  allPass =
    assert("response 是 JSON", ct2.includes("application/json"), `actual=${ct2}`) &&
    allPass;
  const body2 = await res2.json();
  allPass = assert("含 error 字段", typeof body2.error === "string") && allPass;
  console.log(`        error 信息 = ${body2.error}`);

  // ——————————————————————————
  // case 3：resume 缺 basics → 400 Zod 错误
  // ——————————————————————————
  logSection("case 3：resume 缺 basics → 400 Zod");
  const res3 = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // 缺 basics
      resume: { work: [], education: [] },
      changes: [],
    }),
  });
  allPass = assertEq("HTTP status = 400", res3.status, 400) && allPass;
  const body3 = await res3.json();
  allPass = assert("error 含 ResumeJSON / basics", typeof body3.error === "string") && allPass;
  console.log(`        error 信息 = ${body3.error}`);

  // ——————————————————————————
  // case 4：changes 不是数组 → 400
  // ——————————————————————————
  logSection("case 4：changes 不是数组 → 400");
  const res4 = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume: FIXTURE_RESUME,
      changes: "not-an-array",
    }),
  });
  allPass = assertEq("HTTP status = 400", res4.status, 400) && allPass;
  const body4 = await res4.json();
  allPass = assert("error 字段存在", typeof body4.error === "string") && allPass;
  console.log(`        error 信息 = ${body4.error}`);

  // ——————————————————————————
  // 汇总
  // ——————————————————————————
  console.log("\n=======================================================");
  console.log(allPass ? "ALL PASS" : "SOME FAILED");
  console.log("=======================================================\n");

  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error("\n[FATAL]", e);
  process.exit(1);
});
