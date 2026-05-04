/**
 * 烟测：docxtemplater 模板渲染主路径
 *
 * 用法：node scripts/test-docx-render.mjs
 * - 跑一个完整 fixture（覆盖 basics 全字段 + 多 work + 多 project + skills + langs + certs + awards + volunteer）
 * - mammoth 反向解析检查关键字段命中
 * - 落盘到 D:/tmp/test-template-render.docx 给人眼对照
 */

import { createJiti } from "jiti";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const jiti = createJiti(import.meta.url, { fsCache: false, moduleCache: false });
const { buildResumeDocx } = await jiti.import(
  path.join(projectRoot, "lib", "docx-builder.ts"),
);

const FIXTURE = {
  basics: {
    name: "韩梅梅",
    label: "财务专员",
    email: "hanmm@example.com",
    phone: "13800000001",
    summary:
      "5 年财务岗位经验，熟悉全盘账务及报税流程；曾独立完成多个跨城市分公司账务整合。",
    birthday: "1997.2.18",
    yearsOfExperience: "5 年",
    hometown: "广东广州",
    location: { city: "广州天河区" },
  },
  work: [
    {
      name: "广州天虹服饰公司",
      position: "会计员兼出纳",
      startDate: "2020.07",
      endDate: "2025.08",
      summary: "全盘账务 + 出纳，覆盖发票、报税、报表、银行对账。",
      highlights: [
        "负责现金及银行结算业务，开具发票，编制会计凭证、报表、报税、申购发票",
        "整理各项手续和凭证，规范公司日常财务工作流程",
        "完成银行资金入账、出账核对，按时核实未达账项",
      ],
    },
    {
      name: "深圳启明会计师事务所",
      position: "审计助理",
      startDate: "2018.07",
      endDate: "2020.06",
      summary: "参与上市公司年报审计。",
      highlights: ["对接 6 家中型客户的现场审计", "完成应收账款函证及替代测试程序"],
    },
  ],
  education: [
    {
      institution: "暨南大学",
      area: "财务管理",
      studyType: "本科",
      startDate: "2014.09",
      endDate: "2018.06",
      score: "GPA 3.6 / 4.0",
    },
    {
      institution: "广州第六中学",
      area: "理科",
      studyType: "高中",
      startDate: "2011.09",
      endDate: "2014.06",
    },
  ],
  skills: [
    { name: "财务工具", level: "熟练", keywords: ["金蝶 K3", "用友 U8", "Excel"] },
    { name: "税务", level: "熟练", keywords: ["增值税申报", "个税专项附加扣除"] },
  ],
  projects: [
    {
      name: "分公司账务整合",
      startDate: "2023.04",
      endDate: "2023.10",
      description: "整合 3 个城市分公司的账套，统一会计政策。",
      highlights: ["完成 3 套账套迁移与合并", "梳理跨城市内部交易清单 200+ 条"],
      keywords: ["金蝶 K3", "Excel"],
      roles: ["项目负责人"],
    },
  ],
  volunteer: [
    {
      organization: "广州益友社区中心",
      position: "志愿讲师",
      startDate: "2022.03",
      endDate: "至今",
      summary: "为社区老人讲解电子社保操作。",
      highlights: ["累计 8 场 / 200+ 人次"],
    },
  ],
  awards: [
    { title: "公司年度优秀员工", date: "2023.12", awarder: "广州天虹服饰公司" },
  ],
  certifications: [
    { name: "中级会计师", date: "2022.05", issuer: "财政部" },
    { name: "英语六级证书", date: "2017.06", issuer: "教育部" },
  ],
  languages: [
    { language: "中文", fluency: "母语" },
    { language: "英文", fluency: "六级" },
  ],
};

console.log("\n========== docxtemplater 渲染烟测 ==========\n");

const t0 = Date.now();
const buffer = await buildResumeDocx(FIXTURE);
console.log(`渲染耗时：${Date.now() - t0}ms，buffer 大小：${buffer.length} 字节`);

if (buffer.length < 5000) {
  throw new Error(`buffer 异常小：${buffer.length} 字节，可能渲染失败`);
}

const { value: text } = await mammoth.extractRawText({ buffer });
console.log(`mammoth 解析出 ${text.length} 字符\n`);

const expectations = [
  "韩梅梅",
  "财务专员",
  "1997.2.18",
  "5 年",
  "广东广州",
  "广州天河区",
  "13800000001",
  "hanmm@example.com",
  "暨南大学",
  "财务管理",
  "广州天虹服饰公司",
  "会计员兼出纳",
  "负责现金及银行结算业务",
  "整理各项手续和凭证",
  "完成银行资金入账",
  "深圳启明会计师事务所",
  "金蝶 K3",
  "增值税申报",
  "分公司账务整合",
  "广州益友社区中心",
  "公司年度优秀员工",
  "中级会计师",
  "英语六级证书",
  "中文",
  "英文",
];

let pass = 0;
let fail = 0;
for (const exp of expectations) {
  if (text.includes(exp)) {
    pass++;
    console.log(`  [PASS] ${exp}`);
  } else {
    fail++;
    console.log(`  [FAIL] ${exp}`);
  }
}

console.log(`\n命中：${pass} / ${expectations.length}`);

if (fail > 0) {
  console.log("\n--- mammoth 解析全文 (前 800 字) ---");
  console.log(text.slice(0, 800));
}

const outDir = "D:/tmp";
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, "test-template-render.docx");
await fs.writeFile(outPath, buffer);
console.log(`\n落盘：${outPath}（用 WPS / Word 双开手验）`);

if (fail > 0) {
  console.log("\n========== FAIL ==========");
  process.exit(1);
} else {
  console.log("\n========== ALL PASS ==========");
  process.exit(0);
}
