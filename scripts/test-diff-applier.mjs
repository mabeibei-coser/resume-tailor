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

// 截图复现用 fixture：2 段工作、各 3 条 bullet（西安丹尼斯优步 / 西安庆声电子）
const SCREENSHOT_FIXTURE = {
  basics: { name: "某求职者" },
  work: [
    {
      name: "西安丹尼斯优步",
      position: "客服专员",
      highlights: [
        "每日与客户邮件交流，了解客户需求，处理售后问题，保持与客户建立长期的合作关系",
        "每日与仓库沟通完成备货，处理相关产品问题",
        "每日与供应商邮件交流，进行订货",
      ],
    },
    {
      name: "西安庆声电子科技有限公司",
      position: "外贸销售助理",
      highlights: ["负责联系老老客户", "开发沟通新客户", "编写公司宣传ppt"],
    },
  ],
};

// ——————————————————————————
// 测试用例（case 1-5 基础功能 / case 6-10 保守导出回归）
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
  {
    name: "case 6：截图 bug 复现 —— 跨段搬运 + delete + 待核实，工作经历必须保持原结构",
    fixture: SCREENSHOT_FIXTURE,
    changes: [
      {
        path: "work[0].highlights[0]",
        action: "replace",
        oldText: "每日与客户邮件交流，了解客户需求，处理售后问题，保持与客户建立长期的合作关系",
        newText: "每日处理大量客户数据与诉求，精准记录并分类归档，确保信息零误差，为后续服务提供数据支持（待核实）",
        reason: "对齐 JD",
      },
      { path: "work[0].highlights", action: "append", newText: "开发沟通新客户", reason: "前置到主力岗位" },
      { path: "work[0].highlights", action: "append", newText: "编写公司宣传 ppt", reason: "补充能力点" },
      {
        path: "work[0].highlights[2]",
        action: "delete",
        oldText: "每日与供应商邮件交流，进行订货",
        newText: "",
        reason: "弱相关删除",
      },
      {
        path: "work[1].highlights[0]",
        action: "replace",
        oldText: "负责联系老老客户",
        newText: "每日与供应商邮件交流，进行订货",
        reason: "改写",
      },
      { path: "work[1].highlights[2]", action: "delete", oldText: "编写公司宣传ppt", newText: "", reason: "弱相关删除" },
      { path: "work[1].highlights[1]", action: "delete", oldText: "开发沟通新客户", newText: "", reason: "已前置删除" },
    ],
    verify: (input, output) => {
      // 工作经历必须和原始 100% 一致：无串行、无丢条、无待核实
      if (!deepEqual(output.work, SCREENSHOT_FIXTURE.work)) {
        return { pass: false, msg: `work 段被破坏：${JSON.stringify(output.work)}` };
      }
      if (JSON.stringify(output).includes("待核实")) {
        return { pass: false, msg: "「待核实」泄漏进了结果" };
      }
      return { pass: true };
    },
  },
  {
    name: "case 7：delete 一律被跳过（保守导出，不删求职者真实经历）",
    changes: [
      { path: "work[0].highlights[1]", action: "delete", oldText: "负责 Y", newText: "", reason: "删弱条" },
    ],
    verify: (input, output) => {
      if (output.work[0].highlights.length !== 3) {
        return {
          pass: false,
          msg: `highlights 应保持 3 条，实际 ${output.work[0].highlights.length}`,
        };
      }
      if (!output.work[0].highlights.includes("负责 Y")) {
        return { pass: false, msg: "「负责 Y」被 delete 掉了，delete 本应被跳过" };
      }
      return { pass: true };
    },
  },
  {
    name: "case 8：含「待核实」的改写被跳过，保留原文",
    changes: [
      {
        path: "work[0].highlights[0]",
        action: "replace",
        oldText: "参与 X",
        newText: "主导 X 项目并将转化率提升 30%（待核实）",
        reason: "test",
      },
    ],
    verify: (input, output) => {
      if (output.work[0].highlights[0] !== "参与 X") {
        return {
          pass: false,
          msg: `应保留原文「参与 X」，实际「${output.work[0].highlights[0]}」`,
        };
      }
      return { pass: true };
    },
  },
  {
    name: "case 9：oldText 锚定 —— LLM 下标写错也能定位到正确条目",
    changes: [
      // oldText 是「实现 Z」（真实下标 2），但 path 错写成了 [0]
      {
        path: "work[0].highlights[0]",
        action: "replace",
        oldText: "实现 Z",
        newText: "实现 Z 升级版",
        reason: "test",
      },
    ],
    verify: (input, output) => {
      if (output.work[0].highlights[2] !== "实现 Z 升级版") {
        return {
          pass: false,
          msg: `应靠 oldText 定位到下标 2，实际 ${JSON.stringify(output.work[0].highlights)}`,
        };
      }
      if (output.work[0].highlights[0] !== "参与 X") {
        return { pass: false, msg: "下标 0 的「参与 X」被错误覆盖" };
      }
      return { pass: true };
    },
  },
  {
    name: "case 10：跨段搬运被拦截 —— work[1] 的经历不能 append 进 work[0]",
    changes: [
      // "B" 是 work[1].highlights 的内容，不允许被 append 到 work[0]
      { path: "work[0].highlights", action: "append", newText: "B", reason: "test" },
    ],
    verify: (input, output) => {
      if (output.work[0].highlights.length !== 3) {
        return {
          pass: false,
          msg: `work[0] 不应被 append 跨段内容，实际 ${output.work[0].highlights.length} 条`,
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
  const input = clone(c.fixture ?? FIXTURE);
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
