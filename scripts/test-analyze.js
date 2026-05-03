/**
 * Step 10 验证脚本：连发 3 份不同 JD（产品经理 / 前端工程师 / 财务分析），同一份偏前端的简历
 * 预期：3 次 suggestions / interview 题应明显针对各自 JD，不能雷同
 *
 * 用法：node scripts/test-analyze.js
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

const JDS = [
  {
    name: "产品经理（用户增长）",
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
  },
  {
    name: "前端工程师（React/性能）",
    jobTitle: "高级前端工程师 / React 方向",
    jd: `岗位职责：
- 负责公司 C 端核心产品前端架构设计与开发，技术栈 React + TypeScript
- 主导前端性能优化（LCP / CLS / TTI 等核心指标），追求极致体验
- 沉淀通用组件库 / 工程化基建（CI、构建、监控），赋能 5+ 业务线
- 与产品、设计、后端协作，参与技术方案评审和跨端方案落地

任职要求：
- 3 年以上前端开发经验，扎实的 JS / TS / React 基础
- 熟悉至少一种现代构建工具（Vite / Webpack / Turbopack），能定位性能瓶颈
- 有组件库 / 设计系统 / 大型前端工程化项目经验
- 熟悉浏览器原理、Web 性能指标和优化手段
- 加分项：Node.js / SSR（Next.js）/ 微前端 / 端智能经验`,
  },
  {
    name: "财务分析（行业研究）",
    jobTitle: "财务分析师 / 行业研究方向",
    jd: `岗位职责：
- 搭建并维护公司财务模型，包括 DCF、可比公司估值、敏感性分析
- 跟踪所在行业（新能源 / 半导体 / 消费）头部公司财报，输出深度行业研究报告
- 用 Excel + Power Query 处理大量财务数据，建立月度行业指标看板
- 配合投资团队完成项目尽调财务模块，输出关键假设的合理性论证
- 参与季度业绩沟通会，准备投资人 Q&A 材料

任职要求：
- 3 年以上财务分析 / 投行 / 券商研究所 / FA 等相关经验
- CFA Level 2 及以上 / CPA 通过 / FRM 持证至少其一
- 精通 Excel 高阶函数、VBA、Power Query / Pivot，会建模到 Sheet 联动
- 熟悉 Wind / Bloomberg / Capital IQ 等行业数据库
- 良好的中英文报告写作能力（PPT / Word），有公开发表过研报加分`,
  },
];

async function callAnalyze(jobTitle, jd, resumeText) {
  const t0 = Date.now();
  const res = await fetch("http://localhost:3000/api/tailor/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      formData: {
        jobTitle,
        jd,
        resumeText,
        mode: "moderate",
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

async function main() {
  for (const fixture of JDS) {
    console.log(`\n========== JD: ${fixture.name} ==========`);
    try {
      const data = await callAnalyze(fixture.jobTitle, fixture.jd, RESUME);
      console.log(`耗时: ${data._elapsedMs}ms`);
      console.log(
        `suggestions 数: ${data.suggestions?.length} | interview 数: ${data.interview?.length}`
      );
      console.log("\n--- suggestions 标题 ---");
      data.suggestions?.forEach((s, i) => {
        console.log(`  [${i + 1}] ${s.title}`);
      });
      console.log("\n--- interview 第 1 题 ---");
      const q1 = data.interview?.[0];
      if (q1) {
        console.log(`  Q: ${q1.question}`);
        console.log(`  Why: ${q1.why}`);
        console.log(`  Keypoints: ${(q1.keypoints || []).join(" / ")}`);
      }
      console.log("\n--- interview 5 题完整问句 ---");
      data.interview?.forEach((q, i) => {
        console.log(`  [${i + 1}] ${q.question}`);
      });
    } catch (e) {
      console.error(`FAIL: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error("script error:", e);
  process.exit(1);
});
