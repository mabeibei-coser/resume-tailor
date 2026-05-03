/**
 * Step 11 验证脚本：同一份 JD（产品经理增长） + 同一份简历，分别跑 moderate / aggressive
 * 对比维度：
 *   1. suggestions 标题语气（保守 vs 激进动词）
 *   2. example 平均长度（aggressive 应更长 / 更具体）
 *   3. aggressive 是否出现「待核实」标注
 *   4. aggressive 是否提及"重组顺序" / "删除" / "改岗位标题"等动作
 *   5. example 总字符量对比（理想 aggressive ≈ moderate × 1.5-2x）
 *
 * 用法：node scripts/test-mode.js
 *   依赖 dev server 已起在 localhost:3000
 */

const RESUME = `张伟 / 男 / 1996.05 / 上海 / 13800000000 / zhangwei@example.com

教育背景
2018.09-2022.06  上海交通大学  软件工程  本科  GPA 3.6/4.0

工作经历
2022.07-至今  Acme 互联网  前端工程师
- 主导设计系统从 0 到 1 建设，沉淀 40+ 通用组件，覆盖公司 6 个业务线
- 推动核心页面性能优化，首屏 LCP 从 3.2s 降到 1.4s，Lighthouse 性能分 92
- 参与 A/B 实验框架方案设计，配合后端落地埋点协议
- 维护 React + TypeScript 技术栈，引入 Vite 替换 Webpack 构建提速 40%

实习经历
2021.06-2021.09  字节跳动  前端实习生
- 参与教育业务线 H5 页面开发，使用 React + Hooks
- 优化首屏加载时间从 4s 到 2.5s

项目经历
个人博客系统 (2020-2021)
- 用 Next.js + Tailwind 自建博客，月访问 2 万 PV
- 实现 SSG + ISR 架构，文章发布后 5 分钟内全球 CDN 同步

技能
- 熟练：React、TypeScript、Vite、Webpack、Tailwind CSS
- 了解：Node.js、Next.js、性能优化（LCP/CLS/TTI）
- 工具：Git、Jira、Figma`;

const JD = {
  jobTitle: "高级产品经理 / 用户增长方向",
  jd: `岗位职责：
- 负责公司核心产品的用户增长，包括拉新、激活、留存全链路
- 主导 A/B 测试和增长实验，从假设提出到方案落地、数据复盘形成闭环
- 制定 OKR 目标并拆解到周度执行，跨团队协调研发、设计、运营资源
- 通过用户调研、数据分析定位增长瓶颈，输出可执行的产品方案

任职要求：
- 3 年以上互联网产品经理经验，有用户增长 / 留存提升 / 转化优化项目经历
- 熟练使用 SQL、Tableau / 神策 / GA 等数据分析工具，能独立完成漏斗分析
- 有完整的 A/B 测试经验，包括实验设计、统计显著性判断、上线推广
- 良好的跨团队沟通能力，能用 OKR 推动多角色协作
- 加分项：MBA / 数据科学背景 / 增长黑客方法论实践`,
};

async function callAnalyze(mode) {
  const t0 = Date.now();
  const res = await fetch("http://localhost:3000/api/tailor/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      formData: {
        jobTitle: JD.jobTitle,
        jd: JD.jd,
        resumeText: RESUME,
        mode,
      },
    }),
  });
  const elapsed = Date.now() - t0;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  const j = await res.json();
  return { ...j.data, _elapsedMs: elapsed };
}

function summary(data, mode) {
  const items = data.suggestions || [];
  const exampleLens = items.map((s) => (s.example || "").length);
  const totalExampleChars = exampleLens.reduce((a, b) => a + b, 0);
  const avgExampleLen = items.length ? Math.round(totalExampleChars / items.length) : 0;

  const tbdHits = items.filter((s) => /[（(]\s*待核实\s*[)）]/.test(s.example || "")).length;
  const aggressiveActionWords = ["重组", "重新排序", "前置", "删除", "弱化", "改写", "调整顺序", "改成"];
  const actionHits = items.filter((s) =>
    aggressiveActionWords.some((w) => (s.action || "").includes(w)),
  ).length;

  return {
    mode,
    elapsedMs: data._elapsedMs,
    suggCount: items.length,
    interviewCount: (data.interview || []).length,
    avgExampleLen,
    totalExampleChars,
    tbdHits,
    aggressiveActionHits: actionHits,
  };
}

async function main() {
  console.log("======= Step 11 · Mode 双跑对比 =======\n");

  console.log(">> 跑 moderate ...");
  const moderate = await callAnalyze("moderate");
  console.log(`   耗时 ${moderate._elapsedMs}ms`);

  console.log(">> 跑 aggressive ...");
  const aggressive = await callAnalyze("aggressive");
  console.log(`   耗时 ${aggressive._elapsedMs}ms`);

  console.log("\n----- moderate suggestions -----");
  moderate.suggestions?.forEach((s, i) => {
    console.log(`[${i + 1}] 标题: ${s.title}`);
    console.log(`    action : ${s.action}`);
    console.log(`    example: ${s.example}`);
  });

  console.log("\n----- aggressive suggestions -----");
  aggressive.suggestions?.forEach((s, i) => {
    console.log(`[${i + 1}] 标题: ${s.title}`);
    console.log(`    action : ${s.action}`);
    console.log(`    example: ${s.example}`);
  });

  const m = summary(moderate, "moderate");
  const a = summary(aggressive, "aggressive");

  console.log("\n======= 量化对比 =======");
  console.log(JSON.stringify({ moderate: m, aggressive: a }, null, 2));

  const ratio = m.totalExampleChars
    ? (a.totalExampleChars / m.totalExampleChars).toFixed(2)
    : "n/a";
  console.log(`\naggressive / moderate example 总字符比: ${ratio}`);
  console.log(
    `aggressive 待核实标注: ${a.tbdHits} 条 (期望 ≥ 1 才算激进模式真正生效)`,
  );
  console.log(
    `aggressive action 含重组/删除/改标题动作: ${a.aggressiveActionHits} 条`,
  );
  console.log(
    `moderate 待核实标注: ${m.tbdHits} 条 (期望 0；moderate 不应推测数字)`,
  );

  console.log("\n----- moderate Q1 -----");
  console.log("  ", moderate.interview?.[0]?.question);
  console.log("----- aggressive Q1 -----");
  console.log("  ", aggressive.interview?.[0]?.question);
}

main().catch((e) => {
  console.error("script error:", e);
  process.exit(1);
});
