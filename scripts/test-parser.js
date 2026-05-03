/**
 * Step 12 验证脚本：跑 3 份不同简历样本，验证 parseResumeToJson 的稳定性。
 *
 * 样本：
 *   A — Jane Doe（英文，Step 2 PDF 验证用过的样本）
 *   B — 中文应届生（教育 + 实习 + 项目 + 技能，约 300 字）
 *   C — 中文社招 5 年（多个 work，岗位转换）
 *
 * 用法：node scripts/test-parser.js [port]   # port 默认 3002
 *   依赖 dev server 已起在 localhost:port 上
 */

const PORT = process.argv[2] || "3002";
const ENDPOINT = `http://localhost:${PORT}/api/dev/parse-resume`;

// ============================================================================
// 样本 A：Jane Doe（英文，Step 2 PDF 测试用过的样式）
// ============================================================================
const SAMPLE_A = `Jane Doe
Software Engineer
janedoe@example.com | (415) 555-0142 | San Francisco, CA

Summary
Full-stack engineer with 4 years of experience building scalable web applications.
Specialized in React, Node.js, and cloud-native architectures.

Work Experience

Senior Software Engineer, Acme Corp
2022.06 - Present
- Led migration of monolith to microservices on AWS, reducing P95 latency by 35%
- Designed and shipped real-time notification system serving 2M+ daily users
- Mentored 3 junior engineers on code review practices and testing

Software Engineer, BetaTech Inc.
2020.07 - 2022.05
- Built customer-facing dashboard with React + TypeScript, used by 50K+ enterprise users
- Improved CI/CD pipeline, cutting deploy time from 25 min to 6 min
- Owned data ingestion pipeline processing 10TB/day on Kafka + Spark

Education

University of California, Berkeley
B.S. in Computer Science, 2016-2020
GPA: 3.8/4.0

Skills
Languages: TypeScript, Python, Go, Java
Frameworks: React, Next.js, Node.js, FastAPI
Cloud: AWS (Lambda, ECS, RDS), Docker, Kubernetes
Tools: Git, GitHub Actions, Datadog, Terraform`;

// ============================================================================
// 样本 B：中文应届生
// ============================================================================
const SAMPLE_B = `李雨欣 / 女 / 2002.04 / 杭州 / 13900001234 / liyuxin@stu.zju.edu.cn

求职意向
意向岗位：前端开发工程师
期望城市：杭州 / 上海

教育背景
2020.09-2024.06  浙江大学  计算机科学与技术  本科  GPA 3.7/4.0
主修课程：数据结构、算法分析、操作系统、数据库、Web 开发、计算机网络

实习经历
2023.06-2023.09  网易杭州研究院  前端开发实习生
- 参与游戏运营后台 B 端项目，使用 Vue3 + TypeScript 开发活动配置模块
- 独立完成 5 个表单组件的封装，被团队复用到 3 个其他项目
- 优化首页加载性能，把首屏渲染时间从 2.8s 降到 1.5s

项目经历
校园二手交易平台 (2022.09-2023.01)
- 团队 4 人，担任前端负责人，技术栈 React + Redux + Ant Design
- 实现商品列表无限滚动 + 图片懒加载，列表页 FPS 稳定 60
- 项目获得校级创新创业大赛三等奖

个人博客系统 (2023.02-2023.05)
- 用 Next.js + Tailwind CSS 自建博客，部署在 Vercel
- 累计发布技术文章 30 篇，月访问 5000 PV

技能
- 熟练：JavaScript / TypeScript、React、Vue、HTML5、CSS3
- 了解：Node.js、Webpack、Vite、Git
- 英语：CET-6 / 能阅读英文技术文档`;

// ============================================================================
// 样本 C：中文社招 5 年
// ============================================================================
const SAMPLE_C = `王志远 / 男 / 1995.08 / 北京 / 18610002345 / wangzy.dev@gmail.com

个人简介
5 年互联网产品经理经验，主要负责 C 端产品的用户增长与商业化。曾在 SaaS 与电商两个行业有完整产品周期经验。

工作经历

2023.03-至今  Acme 电商科技  高级产品经理
- 主导用户成长体系从 0 到 1 搭建，覆盖签到、任务、积分、勋章四大模块
- 推动核心转化漏斗优化，新用户首单转化从 12% 提升到 18%
- 负责跨部门 AB 实验框架升级，每月支撑 20+ 业务实验
- 带领 2 名初级产品经理，建立需求评审和复盘机制

2021.05-2023.02  BetaCloud SaaS  产品经理
- 负责企业版后台产品线，年度续费率从 65% 提升至 78%
- 主导付费版账户体系重构，支持单租户 1000+ 子账户管理
- 与销售、客户成功团队对接，每周输出客户反馈分析报告

2019.07-2021.04  GammaTech  助理产品经理
- 跟进 C 端 App 的活动模块迭代，月度活动配置上线 8-12 场
- 整理用户调研报告 30+ 份，输出关键洞察推动 3 次产品方向调整
- 参与从 0 到 1 的小程序版本立项

教育背景
2015.09-2019.06  北京邮电大学  信息管理与信息系统  本科  GPA 3.5/4.0
2017.07-2017.08  斯坦福大学  暑期交流项目（产品创新方向）

项目经历
增长黑客内部分享会 (2022)
- 牵头组织公司内部增长方法论分享，输出 12 期内容、累计 200+ 人参与
- 沉淀 1 套适配 SaaS 行业的增长漏斗分析模板，被横向推广到 3 个产品线

技能与证书
- 工具：SQL、Tableau、神策、Figma、Jira、Notion
- 方法论：AB 测试、增长黑客、OKR、用户画像、漏斗分析
- 证书：PMP（2022 年获得）、英语 CET-6
- 语言：中文（母语）、英语（流利）`;

// ============================================================================
// 测试套件
// ============================================================================

const SAMPLES = [
  { name: "A: Jane Doe (英文)", text: SAMPLE_A },
  { name: "B: 中文应届生", text: SAMPLE_B },
  { name: "C: 中文社招 5 年", text: SAMPLE_C },
];

async function callParse(resumeText) {
  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText }),
  });
  const elapsed = Date.now() - t0;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  const j = await res.json();
  return { ...j, _elapsedClient: elapsed };
}

function summarizeResume(data) {
  const basics = data?.basics || {};
  return {
    "basics.name": basics.name || "(空)",
    "basics.label": basics.label || "(无)",
    "basics.email": basics.email || "(无)",
    "basics.phone": basics.phone || "(无)",
    "basics.location.city": basics.location?.city || "(无)",
    "work 数": data?.work?.length || 0,
    "education 数": data?.education?.length || 0,
    "skills 数": data?.skills?.length || 0,
    "projects 数": data?.projects?.length || 0,
    "awards 数": data?.awards?.length || 0,
    "certifications 数": data?.certifications?.length || 0,
    "languages 数": data?.languages?.length || 0,
  };
}

async function main() {
  console.log(`[test-parser] 端点：${ENDPOINT}\n`);

  const results = [];
  let firstFullDump = null;

  for (const sample of SAMPLES) {
    console.log(`\n========== 样本 ${sample.name} ==========`);
    try {
      const r = await callParse(sample.text);
      console.log(`耗时（服务端 LLM）：${r._elapsedMs} ms`);
      console.log(`耗时（客户端总）：${r._elapsedClient} ms`);

      const summary = summarizeResume(r.data);
      console.log("\n--- 字段概览 ---");
      for (const [k, v] of Object.entries(summary)) {
        console.log(`  ${k}: ${v}`);
      }

      // 保留第一份完整 JSON 用于贴回报
      if (!firstFullDump) {
        firstFullDump = { name: sample.name, data: r.data };
      }

      results.push({ name: sample.name, ok: true, summary });
    } catch (e) {
      console.error(`FAIL: ${e.message}`);
      results.push({ name: sample.name, ok: false, error: e.message });
    }
  }

  console.log("\n\n============= 总结 =============");
  for (const r of results) {
    if (r.ok) {
      console.log(`  [PASS] ${r.name} → name="${r.summary["basics.name"]}", work=${r.summary["work 数"]}, edu=${r.summary["education 数"]}, skills=${r.summary["skills 数"]}, proj=${r.summary["projects 数"]}`);
    } else {
      console.log(`  [FAIL] ${r.name} → ${r.error}`);
    }
  }

  if (firstFullDump) {
    console.log(`\n\n============= 完整 JSON: ${firstFullDump.name} =============`);
    console.log(JSON.stringify(firstFullDump.data, null, 2));
  }
}

main().catch((e) => {
  console.error("script error:", e);
  process.exit(1);
});
