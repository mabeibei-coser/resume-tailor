/**
 * Step 15 烟雾测试 · /report 页 4 块布局
 *
 * 验证：
 *   1. 没有 sessionStorage tailor:report 时直接访问 /report → 跳转 /loading
 *   2. 注入 mock tailor:report 后访问 /report → 4 块全渲染
 *   3. 下载按钮点击 → /api/tailor/docx 返回 200/4xx/5xx 都不崩
 *   4. iPhone SE 视口（375×667）布局不溢出（无横向滚动）
 *
 * 依赖：复用 D:/career-report/node_modules/puppeteer
 * 运行：node scripts/tmp/smoke-step15.mjs
 */

import { createRequire } from "node:module";

// 复用 career-report 项目的 puppeteer-core
const require = createRequire(
  "D:/career-report/node_modules/puppeteer-core/package.json"
);
const puppeteer = require("D:/career-report/node_modules/puppeteer-core");

const BASE = process.env.BASE || "http://localhost:3001";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

// ----------------------------------------------------------------
// Mock TailorReport
// ----------------------------------------------------------------
const MOCK_REPORT = {
  suggestions: [
    {
      title: "把成果数据化",
      problem: "简历里描述工作内容多用动词，缺乏可量化结果",
      action: "每条 bullet 末尾补充关键数据（金额 / 比例 / 周期）",
      example: "搭建薪酬测算模型 → 搭建覆盖 1.2 万人的奖金测算模型，节省每月 20 小时。",
    },
    {
      title: "对齐 JD 关键词",
      problem: "JD 强调 SQL、A/B 实验，但简历未出现",
      action: "在'技能'与项目段落里出现 SQL / 实验设计字样",
      example: "用 SQL 拉取过去 90 天 NPS 趋势，支撑奖金调整方案。",
    },
    {
      title: "压缩首屏密度",
      problem: "Summary 段过长（280+ 字），招聘方 7 秒扫不到亮点",
      action: "改成三行短句：定位 + 关键能力 + 当前目标",
      example: "5 年薪酬岗，主导覆盖 1.2 万人的薪酬体系；现寻 HR 数字化方向。",
    },
  ],
  interview: [
    {
      question: "你最近做的薪酬测算项目里，最复杂的环节是什么？",
      why: "考察你能否用结构化语言讲清楚项目细节",
      sampleAnswer: "最复杂的是历史数据合规化——5 个子公司口径不同……",
      keypoints: ["数据口径统一", "合规审核", "口径切换的通知方案"],
    },
    {
      question: "怎么看待 AI 在 HR 工作里的应用？",
      why: "JD 强调 HR 数字化，要看你有没有亲手实践过",
      sampleAnswer: "我用 Claude 把奖金通知模板生成时间从 4 小时压到 30 分钟……",
      keypoints: ["实际落地", "时间压缩比", "下一步规划"],
    },
    {
      question: "你管理过最大的预算是多少？",
      why: "看候选人独立负责的额度",
      sampleAnswer: "去年负责的年度奖金池约 8000 万……",
      keypoints: ["金额量级", "审批链路", "复盘机制"],
    },
    {
      question: "团队里同事意见不一致时你怎么处理？",
      why: "考察沟通与冲突解决",
      sampleAnswer: "先听完对方完整理由再判断……",
      keypoints: ["倾听", "数据决策", "升级机制"],
    },
    {
      question: "如果 JD 里 60% 你能做，剩下 40% 没接触过，你会怎么应对？",
      why: "看候选人的学习意愿",
      sampleAnswer: "我会按优先级把 40% 拆成 3-5 个学习任务……",
      keypoints: ["优先级", "学习计划", "向导师求助"],
    },
  ],
  resume: {
    basics: {
      name: "张三",
      label: "薪酬经理",
      email: "zhangsan@example.com",
      phone: "13800138000",
      summary: "5 年薪酬体系经验，主导覆盖 1.2 万人的奖金测算与发放。",
    },
    work: [
      {
        name: "永升服务集团",
        position: "薪酬经理",
        startDate: "2022-03",
        endDate: "至今",
        summary: "负责集团年度奖金测算与方案落地",
        highlights: [
          "搭建覆盖 1.2 万人的奖金测算模型，节省每月 20 小时人工",
          "牵头推动薪酬制度合规化项目，通过外部审计无异议",
        ],
      },
    ],
    education: [
      {
        institution: "某某大学",
        area: "人力资源管理",
        studyType: "本科",
        startDate: "2014-09",
        endDate: "2018-07",
      },
    ],
    skills: [
      { name: "Excel / 数据建模", level: "高级" },
      { name: "薪酬体系设计", level: "熟练" },
    ],
  },
  changes: [
    {
      path: "basics.summary",
      action: "replace",
      oldText: "经验丰富的薪酬岗位从业者，能独立完成多种工作。",
      newText: "5 年薪酬体系经验，主导覆盖 1.2 万人的奖金测算与发放。",
      reason: "原 summary 太空，量化关键经历后更贴合 JD。",
    },
    {
      path: "work[0].highlights[0]",
      action: "replace",
      oldText: "负责薪酬测算工作",
      newText: "搭建覆盖 1.2 万人的奖金测算模型，节省每月 20 小时人工",
      reason: "加上覆盖人数与时间收益，更具说服力。",
    },
    {
      path: "work[0].position",
      action: "replace",
      oldText: "薪酬经理",
      newText: "高级薪酬经理",
      reason: "AI 想给职位拔高",
      flagged: true,
      flagReason: "禁止修改历史职位（位于 work[0].position 白名单外）",
    },
    {
      path: "skills[2]",
      action: "append",
      oldText: "",
      newText: "SQL 数据查询",
      reason: "JD 明确要求 SQL，原简历缺失。",
    },
  ],
};

// ----------------------------------------------------------------
// 工具：打印分隔
// ----------------------------------------------------------------
function log(label, ok, extra = "") {
  const tag = ok ? "[PASS]" : "[FAIL]";
  console.log(`${tag} ${label}${extra ? " - " + extra : ""}`);
  return ok;
}

let allPass = true;
function check(label, ok, extra) {
  if (!log(label, ok, extra)) allPass = false;
}

// ----------------------------------------------------------------
// 主流程
// ----------------------------------------------------------------
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  // ============================================================
  // Test 1 · 路由守卫：直接访问 /report 无 sessionStorage → 跳 /loading
  // ============================================================
  console.log("\n=== Test 1 · 路由守卫 ===");
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    // sessionStorage 默认是空的（新 page）
    await page.goto(`${BASE}/report`, { waitUntil: "networkidle0", timeout: 15000 });
    // /loading 自己也会守卫（没 tailor:form 跳 /form）
    // 所以这里看 final URL 落在 /loading 或 /form 都算守卫成功（因为肯定不是 /report）
    const finalUrl = page.url();
    check(
      "无 sessionStorage 时 /report 跳走（不停留在 /report）",
      !finalUrl.endsWith("/report"),
      `final URL = ${finalUrl}`
    );
    await page.close();
  }

  // ============================================================
  // Test 2 · 注入 mock 后访问 /report，4 块都渲染
  // ============================================================
  console.log("\n=== Test 2 · 4 块渲染 ===");
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 用 evaluateOnNewDocument 在所有页面 JS 之前写 sessionStorage
    await page.evaluateOnNewDocument((reportJson) => {
      window.sessionStorage.setItem("tailor:report", reportJson);
    }, JSON.stringify(MOCK_REPORT));

    page.on("pageerror", (err) => {
      console.log("    [page error]", err.message);
      allPass = false;
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log("    [console error]", msg.text());
      }
    });

    await page.goto(`${BASE}/report`, { waitUntil: "networkidle0", timeout: 20000 });
    const finalUrl = page.url();
    check("注入 mock 后停留在 /report", finalUrl.endsWith("/report"), `final URL = ${finalUrl}`);

    // 等几个标志性元素
    const counts = await page.evaluate(() => {
      const h1 = document.querySelector("h1")?.textContent ?? "";
      // 各段落标题
      const h2s = Array.from(document.querySelectorAll("h2")).map(
        (el) => el.textContent?.trim() ?? ""
      );
      const detailsEls = document.querySelectorAll("details");
      // 下载按钮
      const downloadBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("下载 Word")
      );
      // 改写卡片：找带 "原句" / "新句" 字样的元素，估算条数 = 一半
      const oldLabels = Array.from(document.querySelectorAll("*")).filter(
        (el) => el.textContent?.trim() === "原句"
      ).length;
      // flagged 标签
      const flaggedLabel = Array.from(document.querySelectorAll("*")).find(
        (el) => el.textContent?.includes("AI 想改但被拦下")
      );
      return {
        h1,
        h2s,
        detailsCount: detailsEls.length,
        hasDownloadBtn: !!downloadBtn,
        oldLabels,
        hasFlaggedLabel: !!flaggedLabel,
      };
    });

    check("h1 出现", counts.h1.includes("定制") || counts.h1.includes("简历"), `h1="${counts.h1}"`);
    check("Block 1 优化建议 标题渲染", counts.h2s.includes("优化建议"));
    check("Block 2 改写明细 标题渲染", counts.h2s.includes("改写明细"));
    check("Block 3 面试题 标题渲染", counts.h2s.some((s) => s.includes("面试题")));
    check("Block 3 折叠面板渲染（5 个 details）", counts.detailsCount === 5, `count=${counts.detailsCount}`);
    check("Block 4 下载按钮存在", counts.hasDownloadBtn);
    check("改写明细原句标签数量 = 4（每条一个）", counts.oldLabels === 4, `count=${counts.oldLabels}`);
    check("flagged 改动显示「AI 想改但被拦下」角标", counts.hasFlaggedLabel);

    // 测试展开折叠
    const detailOpenAfter = await page.evaluate(() => {
      const first = document.querySelector("details");
      if (!first) return null;
      first.open = true;
      const sample = first.querySelector("p")?.textContent ?? "";
      return { open: first.open, sample };
    });
    check("details 可展开", !!detailOpenAfter?.open);

    // ============================================================
    // Test 3 · 下载按钮点击不崩（即使 API 报错也兜底 alert/提示）
    // ============================================================
    console.log("\n=== Test 3 · 下载按钮 ===");
    // 监听 download
    let downloadTriggered = false;
    let apiResponseStatus = null;
    page.on("response", async (res) => {
      if (res.url().includes("/api/tailor/docx") && res.request().method() === "POST") {
        apiResponseStatus = res.status();
      }
    });

    // Puppeteer 拦截 download
    const cdp = await page.target().createCDPSession();
    await cdp.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: "C:/Users/admin/AppData/Local/Temp/claude-step15-dl",
    });

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("下载 Word")
      );
      btn?.click();
    });
    // 等 API 调用完成 + 任何后续状态切换
    await new Promise((r) => setTimeout(r, 6000));

    const stateAfterClick = await page.evaluate(() => {
      // 找错误提示
      const errEl = Array.from(document.querySelectorAll("*")).find(
        (el) => el.textContent?.match(/下载失败/) && el.children.length === 0
      );
      // 按钮还在
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("下载 Word") || b.textContent?.includes("正在生成")
      );
      return {
        hasErrorText: !!errEl,
        errorText: errEl?.textContent ?? null,
        btnExists: !!btn,
        btnText: btn?.textContent?.trim() ?? null,
      };
    });

    check(
      "点击下载后页面没崩（按钮仍可见）",
      stateAfterClick.btnExists,
      `btn="${stateAfterClick.btnText}"`
    );
    if (apiResponseStatus !== null) {
      console.log(`    /api/tailor/docx 返回 status = ${apiResponseStatus}`);
      if (apiResponseStatus >= 400) {
        check(
          "下载 API 报错时显示错误提示文字",
          stateAfterClick.hasErrorText,
          `errText="${stateAfterClick.errorText}"`
        );
      } else {
        console.log("    下载 API 200 OK（应触发 a.click 下载）");
      }
    } else {
      console.log("    [warn] 没捕获到 /api/tailor/docx 响应");
    }

    await page.close();
  }

  // ============================================================
  // Test 4 · iPhone SE 视口不崩
  // ============================================================
  console.log("\n=== Test 4 · iPhone SE 移动端 ===");
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667, isMobile: true, deviceScaleFactor: 2 });

    await page.evaluateOnNewDocument((reportJson) => {
      window.sessionStorage.setItem("tailor:report", reportJson);
    }, JSON.stringify(MOCK_REPORT));

    await page.goto(`${BASE}/report`, { waitUntil: "networkidle0", timeout: 20000 });

    const overflow = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return {
        scrollW: html.scrollWidth,
        clientW: html.clientWidth,
        bodyScrollW: body.scrollWidth,
        bodyClientW: body.clientWidth,
      };
    });
    check(
      "iPhone SE 无横向滚动 (html.scrollWidth <= clientWidth + 1)",
      overflow.scrollW <= overflow.clientW + 1,
      `scrollW=${overflow.scrollW} clientW=${overflow.clientW}`
    );

    // sticky 下载条仍可见
    const stickyVisible = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("下载 Word")
      );
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        winH: window.innerHeight,
      };
    });
    check(
      "下载按钮在 iPhone SE 视窗内（sticky 生效）",
      stickyVisible !== null && stickyVisible.bottom <= stickyVisible.winH + 1,
      JSON.stringify(stickyVisible)
    );

    await page.close();
  }
} finally {
  await browser.close();
}

console.log("\n=========================");
console.log(allPass ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED");
console.log("=========================");
process.exit(allPass ? 0 : 1);
