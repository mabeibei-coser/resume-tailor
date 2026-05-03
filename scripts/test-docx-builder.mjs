/**
 * Step 17 单元测试：lib/docx-builder.ts
 *
 * 用法：node scripts/test-docx-builder.mjs
 *   依赖 jiti 在 runtime 直接加载 .ts，依赖 mammoth 反向解析 docx
 *
 * 测试策略：
 *   1. 用 fixture ResumeJSON 调 buildResumeDocx → Buffer
 *   2. 用 mammoth.extractRawText 反向解析 Buffer 拿到纯文本
 *   3. 验证纯文本里包含所有关键字段（name / company / school / skill / bullet）
 *   4. 第二轮跑大样本（多 work / 多 project / 多 education）确认不崩
 *   5. 把第二轮的 docx 落到 D:/tmp/test-resume.docx 给用户 Word 打开手验
 */

import { createJiti } from "jiti";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const jiti = createJiti(import.meta.url, {
  fsCache: false,
  moduleCache: false,
});

const { buildResumeDocx } = await jiti.import(
  path.join(projectRoot, "lib", "docx-builder.ts"),
);

// ——————————————————————————
// Fixture A：小样本（覆盖 basics + work + education + skills + projects）
// ——————————————————————————

const FIXTURE_SMALL = {
  basics: {
    name: "张伟",
    label: "前端工程师",
    email: "zhangwei@example.com",
    phone: "13800138000",
    url: "https://github.com/zhangwei",
    summary:
      "5 年前端经验，主导设计系统建设与性能优化，关注研发效能与跨端体验。",
    location: { city: "上海" },
  },
  work: [
    {
      name: "Acme 互联网",
      position: "高级前端工程师",
      startDate: "2022.07",
      endDate: "至今",
      location: "上海",
      summary: "负责设计系统建设与核心页面性能优化。",
      highlights: [
        "主导设计系统从 0 到 1 建设，沉淀 40+ 通用组件，覆盖核心业务",
        "推动核心页面性能优化，首屏 LCP 从 3.2s 降到 1.4s",
        "引入 Vite 替换 Webpack 构建提速 40%",
      ],
    },
    {
      name: "ByteWave 科技",
      position: "前端工程师",
      startDate: "2020.06",
      endDate: "2022.06",
      summary: "负责数据可视化平台的前端架构搭建。",
      highlights: [
        "搭建 React + TypeScript 工程模板，被 6 个新项目复用",
        "实现 ECharts 大数据量渲染优化方案，单页支持 10w+ 节点",
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
      score: "GPA 3.7 / 4.0",
      courses: ["数据结构", "算法导论", "操作系统"],
    },
  ],
  skills: [
    {
      name: "前端框架",
      level: "熟练",
      keywords: ["React", "TypeScript", "Next.js"],
    },
    {
      name: "工程化",
      level: "熟练",
      keywords: ["Vite", "Webpack", "ESLint"],
    },
  ],
  projects: [
    {
      name: "设计系统 DS-1",
      startDate: "2023.01",
      endDate: "2023.10",
      description: "公司级前端组件库，覆盖 5 条业务线。",
      highlights: [
        "主导组件 API 设计与文档站搭建",
        "推动跨团队接入，月活组件下载量 10w+",
      ],
      keywords: ["React", "TypeScript", "Storybook"],
    },
  ],
};

// ——————————————————————————
// Fixture B：大样本（多 work + 多 project + 多 education + volunteer/awards/certs/languages）
// ——————————————————————————

const FIXTURE_LARGE = {
  basics: {
    name: "李娜",
    label: "全栈工程师 / 技术负责人",
    email: "lina@example.com",
    phone: "13911119999",
    url: "https://lina.dev",
    summary: "8 年研发经验，前后端均深入实践，带过 8 人小组。",
    location: { city: "北京" },
  },
  work: [
    {
      name: "星河科技",
      position: "技术负责人",
      startDate: "2023.03",
      endDate: "至今",
      summary: "负责 SaaS 产品后端架构与小组管理。",
      highlights: [
        "主导从单体到微服务拆分，QPS 从 500 提升到 5000",
        "建立代码 Review 与上线流程，缺陷率下降 60%",
        "带教 4 名新人，3 名晋升",
      ],
    },
    {
      name: "百川互娱",
      position: "高级后端工程师",
      startDate: "2020.05",
      endDate: "2023.02",
      summary: "负责支付与用户系统。",
      highlights: [
        "支付系统重构，TP99 从 500ms 降到 80ms",
        "实现风控规则引擎，覆盖 30+ 业务场景",
      ],
    },
    {
      name: "南山数据",
      position: "后端工程师",
      startDate: "2018.07",
      endDate: "2020.04",
      summary: "数据处理与 ETL 平台开发。",
      highlights: [
        "搭建 Airflow 调度平台，覆盖 200+ 任务",
        "Spark 作业性能优化，平均缩短 40% 运行时长",
      ],
    },
  ],
  education: [
    {
      institution: "清华大学",
      area: "软件工程",
      studyType: "硕士",
      startDate: "2016.09",
      endDate: "2018.06",
      score: "GPA 3.8 / 4.0",
    },
    {
      institution: "北京大学",
      area: "计算机科学",
      studyType: "本科",
      startDate: "2012.09",
      endDate: "2016.06",
      score: "GPA 3.6 / 4.0",
      courses: ["编译原理", "分布式系统", "数据库"],
    },
  ],
  skills: [
    {
      name: "后端语言",
      level: "熟练",
      keywords: ["Go", "Java", "Python"],
    },
    {
      name: "中间件",
      level: "熟练",
      keywords: ["Kafka", "Redis", "MySQL", "PostgreSQL"],
    },
    {
      name: "云原生",
      level: "了解",
      keywords: ["Kubernetes", "Docker", "Istio"],
    },
  ],
  projects: [
    {
      name: "支付系统重构",
      startDate: "2021.06",
      endDate: "2022.03",
      description: "把单体支付服务拆分为 6 个微服务。",
      highlights: [
        "设计幂等与对账方案，月度差错从 100+ 降到个位数",
        "TP99 从 500ms 降到 80ms",
      ],
      keywords: ["Go", "Kafka", "MySQL"],
    },
    {
      name: "风控规则引擎",
      startDate: "2022.04",
      endDate: "2022.12",
      description: "实时风控规则引擎，支持热更新。",
      highlights: [
        "DSL 设计 + 规则编译执行链",
        "覆盖 30+ 业务场景，命中率 95%+",
      ],
      keywords: ["Go", "Redis"],
    },
    {
      name: "ETL 调度平台",
      startDate: "2019.05",
      endDate: "2020.03",
      description: "基于 Airflow 的数据调度平台。",
      highlights: ["支持 DAG 可视化编辑", "覆盖 200+ 任务"],
      keywords: ["Python", "Airflow"],
    },
  ],
  volunteer: [
    {
      organization: "开源社",
      position: "志愿者",
      startDate: "2021.01",
      endDate: "至今",
      summary: "组织线下技术分享。",
      highlights: ["策划 4 场线下 Meetup"],
    },
  ],
  awards: [
    {
      title: "公司年度优秀员工",
      date: "2023.12",
      awarder: "星河科技",
      summary: "全公司前 5%",
    },
  ],
  certifications: [
    {
      name: "AWS Solutions Architect",
      date: "2022.05",
      issuer: "Amazon",
    },
  ],
  languages: [
    { language: "中文", fluency: "母语" },
    { language: "英文", fluency: "六级" },
  ],
};

// ——————————————————————————
// 工具：跑一轮验证
// ——————————————————————————

async function runOnce(name, fixture, expectations) {
  console.log(`\n---------- ${name} ----------`);
  const buffer = await buildResumeDocx(fixture);
  console.log(`docx Buffer 大小：${buffer.length} 字节`);

  if (buffer.length < 1000) {
    throw new Error(`docx Buffer 太小，可能渲染失败：${buffer.length} 字节`);
  }

  // 反向解析
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  console.log(`mammoth 解析出 ${text.length} 字符`);
  if (text.length < 50) {
    throw new Error(`mammoth 解析出文本过短：${text.length} 字符`);
  }

  // 验证关键字段命中
  let allPass = true;
  for (const exp of expectations) {
    const hit = text.includes(exp);
    const tag = hit ? "PASS" : "FAIL";
    console.log(`  [${tag}] 命中 "${exp}"`);
    if (!hit) allPass = false;
  }

  if (!allPass) {
    // 输出 mammoth 解析出来的前 500 字方便排错
    console.log("\nmammoth 解析文本（前 500 字）：");
    console.log(text.slice(0, 500));
    throw new Error(`${name}：部分字段未命中`);
  }

  return { buffer, text };
}

// ——————————————————————————
// 主流程
// ——————————————————————————

console.log("\n========== Step 17 · docx-builder 单元测试 ==========");

// 第一轮：小样本
await runOnce("Round 1 · 小样本（basics + 2 work + 1 edu + 2 skill + 1 project）", FIXTURE_SMALL, [
  // basics
  "张伟",
  "前端工程师",
  "zhangwei@example.com",
  "上海",
  // work[0]
  "Acme 互联网",
  "高级前端工程师",
  "主导设计系统从 0 到 1 建设",
  "首屏 LCP 从 3.2s 降到 1.4s",
  // work[1]
  "ByteWave 科技",
  "搭建 React + TypeScript 工程模板",
  // education
  "复旦大学",
  "计算机科学",
  "GPA 3.7 / 4.0",
  // skills
  "前端框架",
  "React",
  "工程化",
  "Vite",
  // projects
  "设计系统 DS-1",
  "推动跨团队接入",
  "Storybook",
]);

// 第二轮：大样本
const { buffer: largeBuffer } = await runOnce(
  "Round 2 · 大样本（3 work + 3 project + 2 edu + volunteer + awards + certs + languages）",
  FIXTURE_LARGE,
  [
    // basics
    "李娜",
    "全栈工程师 / 技术负责人",
    // work
    "星河科技",
    "技术负责人",
    "QPS 从 500 提升到 5000",
    "百川互娱",
    "南山数据",
    "Airflow 调度平台",
    // education
    "清华大学",
    "北京大学",
    "软件工程",
    // skills
    "后端语言",
    "Go",
    "Kafka",
    "Kubernetes",
    // projects
    "支付系统重构",
    "风控规则引擎",
    "ETL 调度平台",
    // volunteer
    "开源社",
    "策划 4 场线下 Meetup",
    // awards
    "公司年度优秀员工",
    // certifications
    "AWS Solutions Architect",
    // languages
    "中文",
    "英文",
  ],
);

// 落盘给用户手动 Word 打开验证
const outPath = "D:/tmp/test-resume.docx";
await fs.writeFile(outPath, largeBuffer);
console.log(`\n大样本 docx 已落盘：${outPath}（${largeBuffer.length} 字节，可手动 Word 打开验证）`);

// 同时落小样本也给一份
const outSmall = "D:/tmp/test-resume-small.docx";
const smallBuffer = await buildResumeDocx(FIXTURE_SMALL);
await fs.writeFile(outSmall, smallBuffer);
console.log(`小样本 docx 已落盘：${outSmall}（${smallBuffer.length} 字节）`);

console.log("\n=======================================================");
console.log("ALL PASS");
console.log("=======================================================\n");

process.exit(0);
