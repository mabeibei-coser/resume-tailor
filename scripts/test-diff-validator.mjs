/**
 * Step 14 单元测试：lib/diff-validator.ts 的 5 个边界 case
 *
 * 用法：node scripts/test-diff-validator.mjs
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

const { validateDiffChanges } = await jiti.import(
  path.join(projectRoot, "lib", "diff-validator.ts")
);

// ——————————————————————————
// 共享 context
// ——————————————————————————

const RESUME = `张伟 / 男 / 1996.05 / 上海

工作经历
2022.07-至今  Acme 互联网  前端工程师
- 主导设计系统从 0 到 1 建设，沉淀 40+ 通用组件
- 推动核心页面性能优化，首屏 LCP 从 3.2s 降到 1.4s
- 维护 React + TypeScript 技术栈，引入 Vite 替换 Webpack 构建提速 40%

技能
- 熟练：React、TypeScript、Vite、Webpack、Tailwind CSS
- 了解：Node.js、Next.js`;

const JD = `岗位职责：
- 负责前端架构设计，使用 React / TypeScript
- 性能优化经验，关注 LCP / CLS
- 跨端开发经验加分

任职要求：
- 3 年以上前端经验
- 熟练 React 全家桶`;

const CTX = {
  resumeText: RESUME,
  jd: JD,
  knownSkills: ["React", "TypeScript", "Vite", "Webpack", "Tailwind CSS", "Node.js", "Next.js"],
};

// ——————————————————————————
// 5 个 case
// ——————————————————————————

const cases = [
  {
    name: "case 1：合规改动 — 不应被 flagged",
    change: {
      path: "work[0].highlights[0]",
      action: "replace",
      oldText: "主导设计系统从 0 到 1 建设，沉淀 40+ 通用组件",
      newText: "主导设计系统从 0 到 1 建设，沉淀 40+ 通用组件，覆盖核心业务",
      reason: "补充覆盖范围",
    },
    expectFlagged: false,
    expectReasonContains: undefined,
  },
  {
    name: "case 2：越权改 basics.name — 应 flagged path",
    change: {
      path: "basics.name",
      action: "replace",
      oldText: "张伟",
      newText: "李四",
      reason: "美化姓名",
    },
    expectFlagged: true,
    expectReasonContains: "禁止越权",
  },
  {
    name: "case 3：字数过长 — 应 flagged length",
    change: {
      path: "work[0].highlights[1]",
      action: "replace",
      oldText: "推动核心页面性能优化",  // 10 字符
      newText:
        "推动核心页面性能优化，跨团队协调资源，建立完整的性能监控体系，覆盖全公司所有业务线，构建端到端的性能闭环",  // 远超 10*1.8=18
      reason: "扩充内容",
    },
    expectFlagged: true,
    expectReasonContains: "字数过长",
  },
  {
    name: "case 4：编百分比 — 应 flagged number",
    change: {
      path: "work[0].highlights[2]",
      action: "append",
      newText: "推动用户留存提升 30%",  // 30% 在原 resume / JD 中均未出现
      reason: "突出量化成果",
    },
    expectFlagged: true,
    expectReasonContains: "30%",
  },
  {
    name: "case 5：编技能名 Kubernetes — 应 flagged skill",
    change: {
      path: "skills[0].keywords",
      action: "append",
      newText: "Kubernetes",  // 原 resume 和 JD 都没提
      reason: "增加云原生技能",
    },
    expectFlagged: true,
    expectReasonContains: "Kubernetes",
  },
];

// ——————————————————————————
// 跑测试
// ——————————————————————————

const changes = cases.map((c) => c.change);
const validated = validateDiffChanges(changes, CTX);

let allPass = true;
console.log("\n========== Step 14 · diff-validator 单元测试 ==========\n");

for (let i = 0; i < cases.length; i++) {
  const c = cases[i];
  const result = validated[i];

  const flagged = !!result.flagged;
  const flagReason = result.flagReason ?? "";

  let pass = true;
  let detail = "";

  if (flagged !== c.expectFlagged) {
    pass = false;
    detail = `期望 flagged=${c.expectFlagged}，实际=${flagged}`;
  } else if (c.expectFlagged && c.expectReasonContains) {
    if (!flagReason.includes(c.expectReasonContains)) {
      pass = false;
      detail = `flagReason 应包含 "${c.expectReasonContains}"，实际="${flagReason}"`;
    }
  }

  const status = pass ? "PASS" : "FAIL";
  console.log(`[${status}] ${c.name}`);
  if (flagged) {
    console.log(`        flagReason: ${flagReason}`);
  } else {
    console.log(`        flagged: false`);
  }
  if (!pass) {
    console.log(`        ${detail}`);
    allPass = false;
  }
  console.log();
}

console.log("=======================================================");
console.log(allPass ? "ALL PASS" : "SOME FAILED");
console.log("=======================================================\n");

process.exit(allPass ? 0 : 1);
