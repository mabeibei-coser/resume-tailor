/**
 * Step 16 单元测试：lib/diff-applier.ts 的 5 个 fixture case
 *
 * 用法：node scripts/test-diff-applier.mjs
 *   依赖 jiti 在 runtime 直接加载 .ts
 */

import { createJiti } from "jiti";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const jiti = createJiti(import.meta.url, {
  fsCache: false,
  moduleCache: false,
});

const { applyDiffChanges, parsePath, getValueByPath } = await jiti.import(
  path.join(projectRoot, "lib", "diff-applier.ts")
);

const { ResumeJSONSchema } = await jiti.import(
  path.join(projectRoot, "lib", "types.ts")
);

// ——————————————————————————
// fixture
// ——————————————————————————

const FIXTURE = {
  basics: { name: "张三", summary: "5 年前端工程师" },
  work: [
    {
      name: "字节跳动",
      position: "前端工程师",
      highlights: ["参与 X", "负责 Y", "实现 Z"],
    },
    {
      name: "腾讯",
      position: "前端实习",
      highlights: ["A", "B"],
    },
  ],
  skills: [{ name: "React", keywords: ["Hooks", "Redux"] }],
};

// 工具：深拷贝（用来给每个 case 一个独立的 input）
function clone(o) {
  return typeof structuredClone === "function"
    ? structuredClone(o)
    : JSON.parse(JSON.stringify(o));
}

// 工具：深比较，确认 a 和 b 完全相等（结构 + 值）
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ——————————————————————————
// 5 个 case
// ——————————————————————————

const cases = [
  {
    name: "case 1：replace work[0].highlights[2] — 只第 3 项变",
    changes: [
      {
        path: "work[0].highlights[2]",
        action: "replace",
        oldText: "实现 Z",
        newText: "实现 Z（升级版）",
        reason: "细化",
      },
      // flagged 的不应被应用
      {
        path: "work[0].highlights[0]",
        action: "replace",
        oldText: "参与 X",
        newText: "应该被跳过",
        reason: "test flagged",
        flagged: true,
        flagReason: "test",
      },
    ],
    verify: (input, output) => {
      // 1. 原 fixture 没被 mutate
      if (!deepEqual(input, FIXTURE)) {
        return { pass: false, msg: "原 resume 被 mutate" };
      }
      // 2. work[0].highlights[2] 变了
      if (output.work[0].highlights[2] !== "实现 Z（升级版）") {
        return {
          pass: false,
          msg: `work[0].highlights[2] 应=实现 Z（升级版），实际=${output.work[0].highlights[2]}`,
        };
      }
      // 3. work[0].highlights[0] 没变（flagged 未应用）
      if (output.work[0].highlights[0] !== "参与 X") {
        return {
          pass: false,
          msg: `flagged 不应生效，但 work[0].highlights[0]=${output.work[0].highlights[0]}`,
        };
      }
      // 4. 其他字段不变
      if (output.work[0].highlights[1] !== "负责 Y") {
        return { pass: false, msg: "highlights[1] 被意外改动" };
      }
      if (output.work[1].highlights.length !== 2) {
        return { pass: false, msg: "work[1] 被意外改动" };
      }
      return { pass: true };
    },
  },
  {
    name: "case 2：append work[1].highlights — 数组长度+1",
    changes: [
      {
        path: "work[1].highlights",
        action: "append",
        newText: "C",
        reason: "补充",
      },
      {
        path: "work[1].highlights",
        action: "append",
        newText: "应该被跳过",
        reason: "test flagged",
        flagged: true,
        flagReason: "test",
      },
    ],
    verify: (input, output) => {
      if (!deepEqual(input, FIXTURE)) {
        return { pass: false, msg: "原 resume 被 mutate" };
      }
      if (output.work[1].highlights.length !== 3) {
        return {
          pass: false,
          msg: `work[1].highlights 长度应=3，实际=${output.work[1].highlights.length}`,
        };
      }
      if (output.work[1].highlights[2] !== "C") {
        return {
          pass: false,
          msg: `新 append 项应=C，实际=${output.work[1].highlights[2]}`,
        };
      }
      // flagged 没生效（如果生效会变成 4）
      if (output.work[1].highlights.length !== 3) {
        return { pass: false, msg: "flagged 项应被跳过" };
      }
      return { pass: true };
    },
  },
  {
    name: "case 3：replace basics.summary — 字段值变",
    changes: [
      {
        path: "basics.summary",
        action: "replace",
        oldText: "5 年前端工程师",
        newText: "6 年前端工程师 / 全栈方向",
        reason: "更新经验描述",
      },
      {
        path: "basics.summary",
        action: "replace",
        oldText: "5 年前端工程师",
        newText: "应该被跳过",
        reason: "test flagged",
        flagged: true,
        flagReason: "test",
      },
    ],
    verify: (input, output) => {
      if (!deepEqual(input, FIXTURE)) {
        return { pass: false, msg: "原 resume 被 mutate" };
      }
      if (output.basics.summary !== "6 年前端工程师 / 全栈方向") {
        return {
          pass: false,
          msg: `basics.summary 应=6 年前端工程师 / 全栈方向，实际=${output.basics.summary}`,
        };
      }
      // basics.name 等其他字段不变
      if (output.basics.name !== "张三") {
        return { pass: false, msg: "basics.name 被意外改动" };
      }
      return { pass: true };
    },
  },
  {
    name: "case 4：append skills[0].keywords — 多层嵌套数组",
    changes: [
      {
        path: "skills[0].keywords",
        action: "append",
        newText: "Context API",
        reason: "补充",
      },
      {
        path: "skills[0].keywords",
        action: "append",
        newText: "应被跳过",
        reason: "test flagged",
        flagged: true,
        flagReason: "test",
      },
    ],
    verify: (input, output) => {
      if (!deepEqual(input, FIXTURE)) {
        return { pass: false, msg: "原 resume 被 mutate" };
      }
      if (output.skills[0].keywords.length !== 3) {
        return {
          pass: false,
          msg: `skills[0].keywords 长度应=3，实际=${output.skills[0].keywords.length}`,
        };
      }
      if (output.skills[0].keywords[2] !== "Context API") {
        return {
          pass: false,
          msg: `新增 keyword 应=Context API，实际=${output.skills[0].keywords[2]}`,
        };
      }
      return { pass: true };
    },
  },
  {
    name: "case 5：append basics.summary — 字符串拼接",
    changes: [
      {
        path: "basics.summary",
        action: "append",
        newText: "擅长性能优化",
        reason: "补充",
      },
      {
        path: "basics.summary",
        action: "append",
        newText: "应被跳过",
        reason: "test flagged",
        flagged: true,
        flagReason: "test",
      },
    ],
    verify: (input, output) => {
      if (!deepEqual(input, FIXTURE)) {
        return { pass: false, msg: "原 resume 被 mutate" };
      }
      const expected = "5 年前端工程师\n擅长性能优化";
      if (output.basics.summary !== expected) {
        return {
          pass: false,
          msg: `basics.summary 应=${JSON.stringify(expected)}，实际=${JSON.stringify(output.basics.summary)}`,
        };
      }
      return { pass: true };
    },
  },
];

// ——————————————————————————
// 跑测试
// ——————————————————————————

console.log("\n========== Step 16 · diff-applier 单元测试 ==========\n");

// 顺手做个 parsePath sanity check
console.log("[sanity] parsePath('work[0].highlights[2]') =", JSON.stringify(parsePath("work[0].highlights[2]")));
console.log("[sanity] parsePath('basics.summary') =", JSON.stringify(parsePath("basics.summary")));
console.log("[sanity] parsePath('skills[3].keywords[1]') =", JSON.stringify(parsePath("skills[3].keywords[1]")));
console.log();

let allPass = true;

for (const c of cases) {
  const input = clone(FIXTURE);
  const output = applyDiffChanges(input, c.changes);

  // 1. ResumeJSONSchema.safeParse 通过
  const parsed = ResumeJSONSchema.safeParse(output);
  if (!parsed.success) {
    console.log(`[FAIL] ${c.name}`);
    console.log(`        zod safeParse 失败: ${parsed.error?.message}`);
    allPass = false;
    console.log();
    continue;
  }

  // 2. case 自己的 verify
  const result = c.verify(input, output);
  if (result.pass) {
    console.log(`[PASS] ${c.name}`);
  } else {
    console.log(`[FAIL] ${c.name}`);
    console.log(`        ${result.msg}`);
    allPass = false;
  }
  console.log();
}

console.log("=======================================================");
console.log(allPass ? "ALL PASS" : "SOME FAILED");
console.log("=======================================================\n");

process.exit(allPass ? 0 : 1);
