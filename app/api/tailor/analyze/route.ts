/**
 * /api/tailor/analyze
 * Step 10：接入真实 LLM（MiniMax 主 + 讯飞 fallback）
 * 输入：{ formData: TailorFormData }
 * 输出：{ data: TailorAnalyzeResult } 形如 { suggestions: 3-5, interview: 5 }
 *
 * 关键稳定性：
 * - 用 callWithFallback：JSON_ONLY_PREFIX + response_format json_object + AbortController 50s 超时
 * - validator 校验通过才返回，否则切讯飞重试
 * - 双 LLM 都失败时返兜底 mock，不让前端白屏（与 report-client.ts 的 ANALYZE_FALLBACK 对齐风格）
 */
import { NextResponse } from "next/server";

import { callWithFallback } from "@/lib/report-shared";
import {
  ANALYZE_SYSTEM_PROMPT,
  buildAnalyzeUserPrompt,
  validateAnalyzeResult,
  warnModeViolations,
} from "@/lib/prompts/analyze";
import type { TailorAnalyzeResult, TailorFormData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 双 LLM 都挂时的兜底（避免白屏；上线后应该极少触发）
// Step 24：mock 质量补足 — 即使 AI 暂不可用，用户也能拿到一份"通用模板版"建议 + 5 题面试预演
// 不带 mode 区分（兜底场景下不绑死风格），文案是泛行业通用 + 强调"模板"属性
const FALLBACK: TailorAnalyzeResult = {
  fallback: true,
  suggestions: [
    {
      title: "对齐 JD 关键词到工作经历开头",
      problem: "AI 生成服务暂不可用，给您一份通用模板：多数简历的 highlights 起手词偏弱（如『参与』『负责』），与 JD 中的硬技能词汇贴合度不高，HR 6 秒筛选时容易被划走。",
      action: "把每段工作经历前 2 条 highlights 改写为『动词 + JD 关键词 + 量化结果』结构，例如『主导 X 项目落地，覆盖 Y 个业务线，转化率提升 Z%』。",
      example: "原：负责前端开发 → 改：主导 React 组件库从 0 到 1 建设，沉淀 40+ 通用组件，覆盖 6 条业务线（请按真实数据替换）。",
    },
    {
      title: "在 summary 里前置最匹配 JD 的能力",
      problem: "通用模板兜底建议：basics.summary 是 HR 看简历的第一眼，多数简历这里写得太『全』——把『5 年经验、熟悉 X / Y / Z』罗列出来，没有针对当前 JD 排序。",
      action: "把 summary 改成『1 句定位 + 1-2 句最匹配 JD 的核心能力 + 1 句业绩数字』结构；JD 没要求的能力即使有也往后排。",
      example: "5 年 React 前端，主导过 3 个 C 端项目从 0 到 1，最近一次性能优化把 LCP 从 3.2s 降到 1.4s（请按真实经历替换）。",
    },
    {
      title: "补一段技能矩阵，按 JD 优先级排",
      problem: "通用模板兜底建议：很多简历的 skills 一锅炖（『熟练：A、B、C；了解：D、E』），HR 没法快速判断你的硬技能跟 JD 是否对得上。",
      action: "拆成 2-3 类（如『核心栈 / 工具链 / 加分项』），每类 3-5 个关键词，把 JD 里出现过的词放第一位；不要列简历里没有真实使用经验的技能。",
      example: "核心栈：React / TypeScript / Next.js；工具链：Vite / ESLint / Jest；加分项：Node.js / SSR / 微前端。",
    },
  ],
  interview: [
    {
      question: "请用一句话介绍自己最匹配本岗位的 1-2 个核心能力。",
      why: "通用模板兜底题：考察候选人是否做过岗位匹配度自查，能不能在 30 秒内说清楚『为什么是我』。",
      sampleAnswer: "结构：『5 年 X 经验，主要做 Y 方向，最相关本岗位的是 Z 项目（一句话点出收益数字）』。先点定位，再给一个最强证据，避免罗列。",
      keypoints: ["年限定位", "方向匹配", "强证据", "数字结果"],
    },
    {
      question: "讲一个你最有成就感的项目，重点说『为什么是你牵头』。",
      why: "通用模板兜底题：项目深挖题，考察候选人在团队里的真实角色与决策能力，HR 想区分『参与者』和『主导者』。",
      sampleAnswer: "STAR 结构：S 背景痛点 / T 你的目标 / A 关键决策（重点：为什么这个方案而不是另一个）/ R 量化结果。注意 A 段要至少给 1 个『当时纠结的两个方案 + 为什么选这个』。",
      keypoints: ["背景痛点", "关键决策", "权衡逻辑", "量化结果"],
    },
    {
      question: "你最熟悉的技术 / 工具是什么？请讲一个深入用过的场景。",
      why: "通用模板兜底题：硬技能题，避免候选人停留在『会用』层面，要给『深入用过』的证据。",
      sampleAnswer: "1 句话总结主栈，再用 1 个具体场景说明深度（如踩过的坑、性能调优、源码读到了哪一层）。避免列清单。",
      keypoints: ["主栈定位", "深入场景", "踩坑细节", "解决路径"],
    },
    {
      question: "讲一个你独立定位并解决的复杂问题。",
      why: "通用模板兜底题：考察独立解决问题的方法论，区分『等指派』和『主动发现并解决』。",
      sampleAnswer: "现象 → 假设 → 验证 → 收益四段式。重点放在『假设 → 验证』环节，说清你怎么用数据 / 日志 / 工具排除了哪些可能性。",
      keypoints: ["问题定义", "假设验证", "工具方法", "量化收益"],
    },
    {
      question: "你为什么对这个岗位 / 公司感兴趣？",
      why: "通用模板兜底题：动机匹配题，考察候选人是『海投』还是『真的研究过这个岗位』。",
      sampleAnswer: "结构：『从 JD 里提到的 X 职责切入 → 连接到我做过的 Y 经历 → 长期方向是 Z，与岗位发展路径吻合』。避免空泛谈情怀。",
      keypoints: ["JD 切入点", "经历呼应", "长期方向", "具体而非空话"],
    },
  ],
};

interface RequestBody {
  formData?: TailorFormData;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Body 解析失败：必须是 JSON" },
      { status: 400 }
    );
  }

  const formData = body.formData;
  if (
    !formData ||
    !formData.jobTitle ||
    !formData.jd ||
    !formData.resumeText
  ) {
    return NextResponse.json(
      { error: "formData 缺失必填字段（jobTitle / jd / resumeText）" },
      { status: 400 }
    );
  }

  try {
    const data = await callWithFallback<TailorAnalyzeResult>({
      systemPrompt: ANALYZE_SYSTEM_PROMPT,
      userPrompt: buildAnalyzeUserPrompt(formData),
      temperature: 0.6,
      maxTokens: 3000,
      validator: validateAnalyzeResult,
    });
    warnModeViolations(data, formData.mode);
    return NextResponse.json({ data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[analyze] 双 LLM 均失败，返回兜底 mock:", msg);
    return NextResponse.json({ data: FALLBACK });
    // 注：FALLBACK 自带 fallback: true，前端 / Step 25 错误 UI 可据此提示降级模式
  }
}
