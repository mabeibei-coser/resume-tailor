#!/usr/bin/env node
/**
 * Step 24 · 端到端 Fallback 测试
 *
 * 目标：验证当讯飞 API 失败时（用 invalid key 模拟），
 *       /api/tailor/analyze 与 /api/tailor/rewrite 都能：
 *       1. 返回 HTTP 200（不让前端拿到 5xx）
 *       2. response.data.fallback === true（前端 / Step 25 错误 UI 据此降级提示）
 *       3. suggestions / interview / changes 长度合规
 *       4. 字段都是真实文案，不是占位符
 *
 * 实现方式：
 * - 备份 .env.local → 写入 invalid key 的副本 → spawn `next dev -p 3015` →
 *   等待端口可达 → 跑两次 fetch 验证 → 恢复 .env.local → 杀 dev server
 *
 * 用法：node scripts/test-fallback.mjs
 *
 * 注意：
 * - 使用 3015 端口避开 3000 / 3001 可能的占用
 * - dev server 启动 ~10s，加 invalid LLM 调用 ~5s 才会失败 fallback；脚本总耗时约 30s
 * - 即使脚本中途 crash，finally 也会恢复 .env.local（防止真实 key 被破坏）
 */
import { spawn } from "node:child_process";
import { readFile, writeFile, copyFile, unlink, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env.local");
const ENV_BACKUP = join(ROOT, ".env.local.bak-test-fallback");

const PORT = 3015;
const BASE_URL = `http://localhost:${PORT}`;

const RESUME_TEXT = `张小白 / 1996.05 / 上海
2018-2022 上海交通大学 软件工程 本科
2022.07-至今 Acme 互联网 前端工程师
- 主导设计系统建设，沉淀 40+ 通用组件
- 推动核心页面性能优化，LCP 从 3.2s 降到 1.4s
技能：React、TypeScript、Vite、Tailwind CSS`;

const TEST_FORM_DATA = {
  jobTitle: "高级前端工程师",
  jd: "负责 C 端产品前端架构，要求 React + TypeScript 经验，熟悉性能优化（LCP/CLS/TTI），有组件库 / 设计系统经验加分。",
  resumeText: RESUME_TEXT,
  mode: "moderate",
};

// ================================================================
// 工具
// ================================================================

function log(msg) {
  console.log(`[test-fallback] ${msg}`);
}

function fail(msg) {
  console.error(`[test-fallback] FAIL: ${msg}`);
  process.exitCode = 1;
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function waitForPort(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      // 任何响应（包括 404）都算端口活了
      await fetch(url, { method: "GET" });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

function isPlaceholderString(s) {
  if (typeof s !== "string") return true;
  const trimmed = s.trim();
  if (!trimmed) return true;
  if (trimmed === "..." || trimmed === "—") return true;
  if (/^<.+>$/.test(trimmed)) return true;
  return false;
}

// ================================================================
// 校验函数
// ================================================================

function validateAnalyzeResponse(json) {
  const errors = [];

  if (!json || typeof json !== "object") {
    errors.push("response 不是对象");
    return errors;
  }
  const data = json.data;
  if (!data || typeof data !== "object") {
    errors.push("response.data 不是对象");
    return errors;
  }

  // fallback 标记
  if (data.fallback !== true) {
    errors.push(`期望 data.fallback === true，实际：${JSON.stringify(data.fallback)}`);
  }

  // suggestions: 3-5 条
  if (!Array.isArray(data.suggestions)) {
    errors.push("data.suggestions 不是数组");
  } else if (data.suggestions.length < 3 || data.suggestions.length > 5) {
    errors.push(`data.suggestions 长度 ${data.suggestions.length}（要求 3-5）`);
  } else {
    data.suggestions.forEach((s, i) => {
      for (const f of ["title", "problem", "action", "example"]) {
        if (isPlaceholderString(s[f])) {
          errors.push(`suggestions[${i}].${f} 是占位符或空串："${s[f]}"`);
        }
      }
    });
  }

  // interview: 严格 5 题
  if (!Array.isArray(data.interview)) {
    errors.push("data.interview 不是数组");
  } else if (data.interview.length !== 5) {
    errors.push(`data.interview 长度 ${data.interview.length}（要求严格 = 5）`);
  } else {
    data.interview.forEach((q, i) => {
      for (const f of ["question", "why", "sampleAnswer"]) {
        if (isPlaceholderString(q[f])) {
          errors.push(`interview[${i}].${f} 是占位符或空串："${q[f]}"`);
        }
      }
      if (!Array.isArray(q.keypoints) || q.keypoints.length < 2) {
        errors.push(
          `interview[${i}].keypoints 不是数组或少于 2 条（实际 ${q.keypoints?.length}）`
        );
      }
    });
  }

  return errors;
}

function validateRewriteResponse(json) {
  const errors = [];

  if (!json || typeof json !== "object") {
    errors.push("response 不是对象");
    return errors;
  }
  const data = json.data;
  if (!data || typeof data !== "object") {
    errors.push("response.data 不是对象");
    return errors;
  }

  // fallback 标记
  if (data.fallback !== true) {
    errors.push(`期望 data.fallback === true，实际：${JSON.stringify(data.fallback)}`);
  }

  // resume 必须存在
  if (!data.resume || typeof data.resume !== "object") {
    errors.push("data.resume 不是对象");
  }

  // changes: 至少 3 条（plan 期望 5-8 条）
  if (!Array.isArray(data.changes)) {
    errors.push("data.changes 不是数组");
  } else if (data.changes.length < 3) {
    errors.push(`data.changes 长度 ${data.changes.length}（要求 ≥ 3）`);
  } else {
    data.changes.forEach((c, i) => {
      if (!c || typeof c !== "object") {
        errors.push(`changes[${i}] 不是对象`);
        return;
      }
      if (typeof c.path !== "string" || !c.path.trim()) {
        errors.push(`changes[${i}].path 为空`);
      }
      if (!["replace", "append", "delete"].includes(c.action)) {
        errors.push(`changes[${i}].action 非法："${c.action}"`);
      }
      if (typeof c.newText !== "string") {
        errors.push(`changes[${i}].newText 不是字符串`);
      }
      if (isPlaceholderString(c.reason)) {
        errors.push(`changes[${i}].reason 是占位符："${c.reason}"`);
      }
    });
  }

  return errors;
}

// ================================================================
// 主流程
// ================================================================

async function main() {
  let devProc = null;
  let envBackedUp = false;

  try {
    // ----- 1. 备份并污染 .env.local -----
    if (!(await fileExists(ENV_PATH))) {
      throw new Error(`.env.local 不存在：${ENV_PATH}`);
    }
    log("备份 .env.local → .env.local.bak-test-fallback");
    await copyFile(ENV_PATH, ENV_BACKUP);
    envBackedUp = true;

    const original = await readFile(ENV_PATH, "utf8");
    // 把真实 KEY 替换成 invalid（保留其余配置如 BASE_URL / MODEL）
    const polluted = original
      .replace(/^IFLYTEK_API_KEY=.*$/m, "IFLYTEK_API_KEY=invalid_for_fallback_test:invalid");
    await writeFile(ENV_PATH, polluted, "utf8");
    log("已写入 invalid key 到 .env.local");

    // ----- 2. 启动 dev server -----
    log(`启动 next dev -p ${PORT}（约需 10-20s）...`);
    // Windows 上 spawn npm.cmd 必须 shell:true（Node 22+ 安全策略变更）
    devProc = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "dev", "--", "-p", String(PORT)],
      {
        cwd: ROOT,
        env: { ...process.env, NODE_ENV: "development" },
        shell: process.platform === "win32",
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let devStdout = "";
    devProc.stdout.on("data", (chunk) => {
      devStdout += chunk.toString();
    });
    devProc.stderr.on("data", (chunk) => {
      devStdout += chunk.toString();
    });

    const ready = await waitForPort(`${BASE_URL}/`, 60_000);
    if (!ready) {
      console.error("[test-fallback] dev 启动超时，stdout/stderr 末尾：");
      console.error(devStdout.slice(-2000));
      throw new Error("dev server 60s 内未就绪");
    }
    // 端口活了之后再多等 2s，让 Next.js 编译完路由
    await new Promise((r) => setTimeout(r, 2000));
    log("dev server 已就绪，开始测试");

    // ----- 3. 测试 analyze -----
    log("→ POST /api/tailor/analyze");
    const t0 = Date.now();
    const analyzeRes = await fetch(`${BASE_URL}/api/tailor/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formData: TEST_FORM_DATA }),
    });
    const analyzeMs = Date.now() - t0;
    log(`  HTTP ${analyzeRes.status} (${analyzeMs}ms)`);

    if (analyzeRes.status !== 200) {
      const text = await analyzeRes.text();
      fail(`analyze HTTP ${analyzeRes.status}（期望 200）: ${text.slice(0, 200)}`);
    } else {
      const json = await analyzeRes.json();
      const errors = validateAnalyzeResponse(json);
      if (errors.length === 0) {
        log(
          `  PASS · suggestions=${json.data.suggestions.length} interview=${json.data.interview.length} fallback=${json.data.fallback}`
        );
      } else {
        fail(`analyze 校验失败：\n  - ${errors.join("\n  - ")}`);
      }
    }

    // ----- 4. 测试 rewrite -----
    log("→ POST /api/tailor/rewrite");
    const t1 = Date.now();
    const rewriteRes = await fetch(`${BASE_URL}/api/tailor/rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formData: TEST_FORM_DATA }),
    });
    const rewriteMs = Date.now() - t1;
    log(`  HTTP ${rewriteRes.status} (${rewriteMs}ms)`);

    if (rewriteRes.status !== 200) {
      const text = await rewriteRes.text();
      fail(`rewrite HTTP ${rewriteRes.status}（期望 200）: ${text.slice(0, 200)}`);
    } else {
      const json = await rewriteRes.json();
      const errors = validateRewriteResponse(json);
      if (errors.length === 0) {
        log(
          `  PASS · changes=${json.data.changes.length} fallback=${json.data.fallback}`
        );
      } else {
        fail(`rewrite 校验失败：\n  - ${errors.join("\n  - ")}`);
      }
    }
  } finally {
    // ----- 5. 清理 -----
    if (devProc && !devProc.killed) {
      log("关闭 dev server...");
      // Windows 用 taskkill 杀子进程树（npm run dev 会派生 next 子进程）
      if (process.platform === "win32") {
        try {
          spawn("taskkill", ["/pid", String(devProc.pid), "/t", "/f"]);
        } catch {
          devProc.kill("SIGKILL");
        }
      } else {
        devProc.kill("SIGTERM");
      }
      // 给点时间收尾
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (envBackedUp) {
      try {
        log("恢复 .env.local");
        await copyFile(ENV_BACKUP, ENV_PATH);
        await unlink(ENV_BACKUP);
      } catch (e) {
        console.error(
          `[test-fallback] WARNING: 恢复 .env.local 失败！请手动从 ${ENV_BACKUP} 恢复：${e.message}`
        );
      }
    }
  }

  if (process.exitCode === 1) {
    log("有用例失败，详见上方日志");
  } else {
    log("全部通过 ✓");
  }
}

main().catch((e) => {
  console.error("[test-fallback] script crashed:", e);
  process.exitCode = 1;
});
