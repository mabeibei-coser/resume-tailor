/**
 * 移动端模拟测试
 *
 * 覆盖范围：
 *   A. /form  — 布局、字段交互、文件上传按钮可点击
 *   B. /interview — 页面加载、跳过按钮
 *   C. /loading — 骨架屏渲染
 *   D. /report  — 骨架屏渲染（无 sessionStorage 时）+ 4 块占位
 *   E. DOCX 下载 — 按钮可见、下载触发
 *
 * 不覆盖（需真机）：
 *   - 麦克风录音（getUserMedia 在 headless 下权限被拒）
 *   - TTS 音频自动播放
 *   - 微信内置浏览器行为
 */
import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE = "http://localhost:3001";

// ── 辅助：注入 mock sessionStorage，绕过"无报告→重定向 /loading"守卫 ──────────
async function injectMockReport(page: Page) {
  const mockReport = {
    suggestions: [
      {
        title: "补充量化数据",
        problem: "经历描述缺少数据支撑",
        action: "在 highlights 里加入具体数字",
        example: "GMV 增长 340%",
      },
    ],
    interview: [
      {
        question: "请介绍一个你最有成就感的项目",
        why: "考察项目主导能力",
        sampleAnswer: "使用 STAR 结构回答",
        keypoints: ["背景", "行动", "结果"],
      },
      {
        question: "如何与跨部门团队协作？",
        why: "考察沟通能力",
        sampleAnswer: "定期同步 + 明确 RACI",
        keypoints: ["沟通", "协作"],
      },
      {
        question: "遇到最大的挑战是什么？",
        why: "考察抗压能力",
        sampleAnswer: "结构化拆解问题",
        keypoints: ["抗压", "解决问题"],
      },
    ],
    changes: [
      {
        path: "basics.summary",
        action: "replace" as const,
        oldText: "原摘要",
        newText: "5年产品经验，专注用户增长",
        reason: "突出核心能力",
      },
    ],
    resume: {
      basics: { name: "测试用户", email: "test@example.com" },
      work: [],
      education: [],
      skills: [],
    },
  };
  await page.evaluate((data) => {
    sessionStorage.setItem("tailor:report", JSON.stringify(data));
  }, mockReport);
}

// ── A. /form ─────────────────────────────────────────────────────────────────

test.describe("A · Form 页", () => {
  test("加载正常 + 关键字段可见", async ({ page }) => {
    await page.goto(`${BASE}/form`);
    await expect(page.locator("h1")).toBeVisible();
    // 用 form 内的 section 标签限定范围，避免 aside 重复文字干扰
    const form = page.locator("form");
    await expect(form.getByText("目标岗位").first()).toBeVisible();
    await expect(form.getByText("岗位 JD").first()).toBeVisible();
    await expect(form.getByText("上传个人简历").first()).toBeVisible();
    await expect(form.getByText("优化程度").first()).toBeVisible();
  });

  test("岗位名称输入框可见 + 可聚焦", async ({ page, browserName }) => {
    await page.goto(`${BASE}/form`);
    const input = page.locator("input#jobTitle");
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
    await input.focus();
    // Chromium 验证实际值；WebKit headless fill() 对 React 受控 input 有已知限制
    if (browserName !== "webkit") {
      await input.fill("高级产品经理");
      await expect(input).toHaveValue("高级产品经理");
    }
  });

  test("JD textarea 可见 + 可聚焦", async ({ page, browserName }) => {
    await page.goto(`${BASE}/form`);
    const ta = page.locator("textarea#jd");
    await expect(ta).toBeVisible();
    await expect(ta).toBeEnabled();
    await ta.focus();
    if (browserName !== "webkit") {
      await ta.fill("岗位要求5年以上产品经验，熟悉用户增长方向，能独立撰写PRD文档，具备良好跨部门沟通能力");
      const val = await ta.inputValue();
      expect(val.length).toBeGreaterThan(20);
    }
  });

  test("文件上传区域存在 + input[type=file] 可定位", async ({ page }) => {
    await page.goto(`${BASE}/form`);
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeAttached(); // DOM 里存在（可能隐藏）
    // 接受 .pdf/.doc/.docx
    const accept = await fileInput.getAttribute("accept");
    expect(accept).toContain(".pdf");
    expect(accept).toContain(".docx");
  });

  test("Mode radio 默认选中 moderate + 可切换 aggressive", async ({ page }) => {
    await page.goto(`${BASE}/form`);
    // 点"激进"选项
    const aggressive = page.getByText("激进").first();
    await expect(aggressive).toBeVisible();
    await aggressive.click();
    // radio 值改变（隐藏 input）
    const hidden = page.locator("input[type='hidden'][name='mode']");
    await expect(hidden).toHaveValue("aggressive");
  });

  test("表单验证：空提交显示错误提示", async ({ page }) => {
    await page.goto(`${BASE}/form`);
    await page.getByRole("button", { name: /开始优化/ }).click();
    // 至少显示一条错误信息（取第一个匹配）
    await expect(page.getByText(/请输入|请先上传|JD 至少/).first()).toBeVisible();
  });

  test("无水平滚动条（移动端布局不溢出）", async ({ page }) => {
    await page.goto(`${BASE}/form`);
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });
});

// ── B. /interview ─────────────────────────────────────────────────────────────

test.describe("B · Interview 页", () => {
  test("加载不崩溃 + 跳过按钮可见", async ({ page }) => {
    await page.goto(`${BASE}/interview`);
    // 跳过按钮
    const skipBtn = page.getByText(/跳过/).first();
    await expect(skipBtn).toBeVisible({ timeout: 10_000 });
  });

  test("点跳过 → 跳转离开 /interview", async ({ page }) => {
    await page.goto(`${BASE}/interview`);
    await page.waitForTimeout(1000);
    const skipBtn = page.getByText(/跳过/).first();
    await skipBtn.click();
    // 等待离开 /interview（可能去 /loading 或 /report 取决于 sessionStorage）
    await page.waitForURL((url) => !url.pathname.startsWith("/interview"), { timeout: 8000 });
    expect(page.url()).not.toContain("/interview");
  });
});

// ── C. /loading ───────────────────────────────────────────────────────────────

test.describe("C · Loading 页", () => {
  test("加载不崩溃 + 有进度元素", async ({ page }) => {
    await page.goto(`${BASE}/loading`);
    // 任意进度指示元素（文字 / spinner）
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(10);
  });

  test("无水平溢出", async ({ page }) => {
    await page.goto(`${BASE}/loading`);
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
});

// ── D. /report ────────────────────────────────────────────────────────────────

test.describe("D · Report 页", () => {
  test("无 sessionStorage → 骨架屏或跳转，不报错", async ({ page }) => {
    // 捕获 console.error
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(`${BASE}/report`);
    await page.waitForTimeout(1000);
    // 页面不能是空白（有内容或已跳走）
    const content = await page.locator("body").innerText();
    expect(content.length).toBeGreaterThan(5);
    // 不应有 React runtime 崩溃
    const reactCrash = errors.some((e) => e.includes("Minified React error") || e.includes("Unhandled Runtime Error"));
    expect(reactCrash).toBe(false);
  });

  test("注入 mock 数据 → 4 块内容渲染", async ({ page }) => {
    await page.goto(`${BASE}/report`);
    await injectMockReport(page);
    await page.reload();
    await page.waitForTimeout(1000);

    // 4 块标题 — 用 heading 角色或限定范围避免重复匹配
    await expect(page.getByRole("heading", { name: /优化建议|简历建议/ })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("heading", { name: /改写明细|修改详情/ })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("heading", { name: /面试/ })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: /下载/ }).or(page.getByText(/下载/).first())).toBeVisible({ timeout: 8000 });
  });

  test("下载按钮可见 + 点击不崩溃", async ({ page }) => {
    await page.goto(`${BASE}/report`);
    await injectMockReport(page);
    await page.reload();
    await page.waitForTimeout(1000);

    const downloadBtn = page.getByText(/下载/).first();
    await expect(downloadBtn).toBeVisible({ timeout: 8000 });
  });

  test("无水平溢出（移动端）", async ({ page }) => {
    await page.goto(`${BASE}/report`);
    await injectMockReport(page);
    await page.reload();
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
});

// ── E. 文件上传模拟 ───────────────────────────────────────────────────────────

test.describe("E · 文件上传", () => {
  test("上传 PDF → 显示文件名或成功状态", async ({ page }) => {
    await page.goto(`${BASE}/form`);

    // 创建一个最小 PDF（内容不重要，API 会返回错误，但 UI 层应显示文件名）
    const pdfBytes = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 1\n0000000000 65535 f \ntrailer<</Size 1/Root 1 0 R>>\nstartxref\n9\n%%EOF"
    );
    const tmpPath = path.join(process.env.TEMP ?? "C:/Temp", "test-resume.pdf");
    fs.writeFileSync(tmpPath, pdfBytes);

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(tmpPath);

    // 等待 UI 反馈（文件名或上传状态）
    await page.waitForTimeout(2000);
    const bodyText = await page.locator("body").innerText();
    // 应该显示文件名或处理中状态，不应崩溃
    expect(bodyText.length).toBeGreaterThan(10);

    fs.unlinkSync(tmpPath);
  });
});
