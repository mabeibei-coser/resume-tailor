/**
 * 复现 user 报告：手机 Word 上 "专业技能" section 出现一堆 "undefined"
 * 假设：LLM rewrite 返回多条 append 改 path=skills，diff-applier 把字符串 push 进 skills 数组
 * 数组现在混合了 {name,level,keywords} 对象 + 纯字符串
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
const { applyDiffChanges } = await jiti.import(
  path.join(projectRoot, "lib", "diff-applier.ts"),
);

async function testCase(name, resume) {
  console.log(`\n━━━━━━━━━━ ${name} ━━━━━━━━━━`);
  const buffer = await buildResumeDocx(resume);
  const { value: text } = await mammoth.extractRawText({ buffer });
  const undefinedCount = (text.match(/undefined/g) ?? []).length;
  console.log(`buffer ${buffer.length} bytes, text ${text.length} chars, "undefined" count = ${undefinedCount}`);
  if (undefinedCount > 0) {
    console.log("[FAIL] 仍有 undefined 字串");
    console.log(text.slice(0, 200));
    return false;
  }
  console.log("[PASS]");
  return true;
}

const baseFixture = {
  basics: { name: "测试用户", label: "财务", phone: "13800000000", email: "x@x.com" },
  work: [{ name: "公司A", position: "会计", startDate: "2020.01", endDate: "2024.01", highlights: ["xx"] }],
  skills: [
    { name: "Office", level: "熟练", keywords: ["Excel", "Word"] },
    { name: "财务工具", level: "熟练", keywords: ["金蝶 K3"] },
  ],
};

// CASE 1: 正常数据 — sanity check
let ok = await testCase("CASE 1 · 正常 skills 数组", baseFixture);

// CASE 2: skills 数组里混入字符串（diff-applier append 把 string push 进数组）
const polluted = JSON.parse(JSON.stringify(baseFixture));
const CHANGES_APPEND = Array.from({ length: 25 }, (_, i) => ({
  path: "skills",
  action: "append",
  newText: `技能补充建议 ${i + 1}：xxx`,
  reason: "test",
}));
const pollutedAfterDiff = applyDiffChanges(polluted, CHANGES_APPEND);
ok = (await testCase("CASE 2 · skills 数组混入 25 条字符串（append 污染）", pollutedAfterDiff)) && ok;

// CASE 3: skills 字段被替换成字符串（这是 prod 真实出错场景）
const stringSkillsFixture = JSON.parse(JSON.stringify(baseFixture));
const CHANGES_REPLACE = [{
  path: "skills",
  action: "replace",
  oldText: "(原 skills)",
  newText: "Office、Excel、SQL、Power BI、DAX、SAP、CRM、ERP、数据透视表",
  reason: "test",
}];
const stringSkillsAfter = applyDiffChanges(stringSkillsFixture, CHANGES_REPLACE);
console.log("\n=== CASE 3 前 typeof skills:", typeof stringSkillsAfter.skills, "===");
ok = (await testCase("CASE 3 · skills 整段被字符串 replace（prod 出错的真实场景）", stringSkillsAfter)) && ok;

// CASE 4: highlights 也被 replace 成字符串
const stringHighlights = JSON.parse(JSON.stringify(baseFixture));
const CHANGES_HL = [{
  path: "work[0].highlights",
  action: "replace",
  oldText: "(原 highlights)",
  newText: "完成 X、推动 Y、落地 Z",
  reason: "test",
}];
const hlAfter = applyDiffChanges(stringHighlights, CHANGES_HL);
ok = (await testCase("CASE 4 · highlights 被字符串 replace", hlAfter)) && ok;

// 落盘 CASE 3 给用户对比
const verifyBuffer = await buildResumeDocx(stringSkillsAfter);
await fs.writeFile("D:/tmp/test-skills-fixed.docx", verifyBuffer);

console.log(`\n${ok ? "✅ ALL PASS" : "❌ HAS FAILURE"}`);
process.exit(ok ? 0 : 1);
