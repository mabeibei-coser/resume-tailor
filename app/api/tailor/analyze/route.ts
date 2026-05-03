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
      sampleAnswer: "我目前是 5 年经验的 X 方向从业者，最近三年集中做 Y 类业务的 0-1 搭建与规模化。最匹配这个岗位的有两块：一是我主导过 Z 项目，从立项到上线 8 个月，最终在 A 指标上跑出了 B 量级的结果；二是我在跨部门推动上习惯先做利益相关方梳理再走方案评审，过去半年帮我们团队把 C 流程的评审周期从两周缩短到三天。如果转到这个岗位，我会先把现有 Y 业务的瓶颈环节摸一遍，再用类似的拆解方式落地——这是我看到 JD 里提到 D 时第一时间想做的事。",
      keypoints: ["年限定位", "方向匹配", "强证据", "数字结果", "迁移意图"],
    },
    {
      question: "讲一个你最有成就感的项目，重点说『为什么是你牵头』。",
      why: "通用模板兜底题：项目深挖题，考察候选人在团队里的真实角色与决策能力，HR 想区分『参与者』和『主导者』。",
      sampleAnswer: "去年我们团队接到一个 A 业务从 0 到 1 的需求，背景是公司战略要在半年内打开 B 市场，但当时团队里只有我一人有过类似 C 类客户的对接经验。我牵头主要因为两点：一是我提前两周做了竞品调研，输出了一份决策矩阵，让团队在『自研 vs. 集成现有方案』之间快速落地；二是我承担了和销售 / 法务的对接，避免技术同学被拉去开沟通会。最难的是中间技术方案推翻过一次——原本要走 D 路线，但试点客户反馈延迟太高，我们花了一周转向 E 方案。最终上线后首月接入了 F 个客户，超出 OKR 目标 30%。这套从『识别瓶颈→快速重决策→确保交付』的节奏，是我在这个岗位也会复用的方法。",
      keypoints: ["背景痛点", "关键决策", "权衡逻辑", "量化结果", "可迁移方法论"],
    },
    {
      question: "你最熟悉的技术 / 工具是什么？请讲一个深入用过的场景。",
      why: "通用模板兜底题：硬技能题，避免候选人停留在『会用』层面，要给『深入用过』的证据。",
      sampleAnswer: "我最熟悉的是 X 工具栈，用了三年多，最深入的一次是去年帮我们核心系统做 Y 优化。当时的现象是某个高频接口的 P95 延迟突然从 200ms 涨到 1.2s，排查时第一直觉是 DB 慢查询，我先用 X 自带的 trace 工具采了一段火焰图，发现热点其实在序列化层。继续往下挖，定位到是新版本里某个字段从 plain 改成了 nested，导致每次响应都要走深度 clone。我们最终用了三步修：把 nested 字段改回 plain、加一层缓存、把 trace 采样率上调到 100% 持续观察 3 天。修完后 P95 回到 180ms，比原来还快了 10%。这次让我对 X 的性能模型有了完整的理解，也学到了『先看火焰图再猜原因』的诊断顺序。",
      keypoints: ["主栈年限", "排查路径", "工具方法", "踩坑细节", "量化收益"],
    },
    {
      question: "讲一个你独立定位并解决的复杂问题。",
      why: "通用模板兜底题：考察独立解决问题的方法论，区分『等指派』和『主动发现并解决』。",
      sampleAnswer: "今年初我注意到我们 A 指标的周环比突然下滑了 15%，但产品和数据团队都没有报警。我决定自己跟一遍：先把 B 维度按 7 天滑窗拆出来，发现问题集中在 C 渠道的新用户上；再拉日志看具体路径，怀疑是某次 D 改动改了引导文案，导致新用户的 E 步骤跳过率上升。为了验证，我用 F 工具拉了 AB 实验数据，确认改动前后 E 步骤的完成率差了 9 个百分点。我把分析报告同步给产品后，他们一周内回滚并加了一个轻量提示，下周指标回到原水位。这个过程里最重要的不是技术工具，而是『主动定位 → 假设 → 用数据验证 → 推动闭环』这条链路——每一步都自己跑通，才能让分析有说服力。",
      keypoints: ["主动发现", "假设验证", "工具方法", "推动闭环", "量化收益"],
    },
    {
      question: "你为什么对这个岗位 / 公司感兴趣？",
      why: "通用模板兜底题：动机匹配题，考察候选人是『海投』还是『真的研究过这个岗位』。",
      sampleAnswer: "我对这个岗位有兴趣主要有三层。第一是 JD 里提到的 X 方向，正好是我过去三年深耕的领域——我做过 Y 类业务的 0-1 落地，有比较完整的方法论沉淀，能很快接上手。第二是公司在 Z 行业的位置，从我了解到的最近动作（如近期发布的 A 产品）来看，团队明显在往『B 方向』演进，这和我自己想从『单一职能』走向『跨域协同』的方向高度吻合。第三是岗位的成长性——这个岗位看起来既要做执行也要做策略，对我来说是从『把事做完』到『定义把什么事做完』的关键一跳。我这两年专门读了 C 这本书 / 研究了 D 这套框架，就是为了这一步做准备，所以这是我目前最想去的岗位。",
      keypoints: ["JD 切入点", "经历呼应", "公司洞察", "长期方向", "具体准备"],
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
      maxTokens: 4800,
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
