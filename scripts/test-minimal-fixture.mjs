/**
 * 测：minimal fixture（只填 basics）下，空 section 标题不应被渲染。
 * 用法：node scripts/test-minimal-fixture.mjs
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
    name: "张三",
    label: "前端工程师",
    email: "zs@example.com",
    phone: "13800000000",
  },
};

const buffer = await buildResumeDocx(FIXTURE);
const { value: text } = await mammoth.extractRawText({ buffer });
console.log("=== 渲染文本 ===");
console.log(text);
console.log("=== end ===\n");

const sections = [
  "教 育 背 景",
  "个 人 优 势 总 结",
  "工 作 经 历",
  "项 目 经 验",
  "专 业 技 能",
  "语 言 能 力",
  "证 书 荣 誉",
  "志 愿 者 经 历",
];
let leak = 0;
for (const s of sections) {
  if (text.includes(s)) {
    console.log(`[FAIL] 空 section 标题泄漏: "${s}"`);
    leak++;
  } else {
    console.log(`[PASS] "${s}" 已隐藏`);
  }
}
console.log(`\n泄漏 ${leak} / ${sections.length}`);

await fs.writeFile("D:/tmp/test-minimal-render.docx", buffer);
console.log("落盘: D:/tmp/test-minimal-render.docx");

if (leak > 0) process.exit(1);
