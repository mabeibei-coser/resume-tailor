# Resume-Tailor 进度状态

> Plan: C:\Users\admin\.claude\plans\coding-1-fluffy-crystal.md
> 创建：2026-05-02

## 当前
- 阶段：P7 · 完成 🎉
- 步骤：全部完成
- 完成度：26/26（全部 PASS）

## 26 步清单

### P0 · 脚手架（0.5 天）
- [✓] **Step 1** 创建项目（next 脚手架 + 配置对齐）— 完成时间 2026-05-02 / PC: ✓ next build 通过 / iOS: — / Android: —

### P1 · 表单 + 解析（1 天）
- [✓] **Step 2** 简历解析 API（复制 `app/api/resume/parse/route.ts` + 类型，3 份示例验证）— 完成时间 2026-05-02 / PC: ✓ next build 通过 + curl 跑通 PDF + DOCX + 错误分支 / iOS: — / Android: —
- [✓] **Step 3** Form 页骨架（功能版，4 字段 + radio + 大按钮）— 完成时间 2026-05-02 / PC: ✓ next build 通过 + puppeteer 自动验证全 PASS / iOS: ⚠️ 待真机（Step 26 E2E） / Android: ⚠️ 待真机（Step 26 E2E）

### P2 · 异步预取（1 天）
- [✓] **Step 4** Prefetch 框架（精简到 2 章节 + analyze/rewrite stub）— 完成时间 2026-05-02 / PC: ✓ next build 通过 + puppeteer 自动验证 in-flight 抓到 / iOS: ⚠️ 待真机（Step 26 E2E） / Android: ⚠️ 待真机（Step 26 E2E）
- [✓] **Step 5** Loading 页（双章节进度卡片 + framer-motion 过渡 + prefetch 复用）— 完成时间 2026-05-02 / PC: ✓ next build 通过 + puppeteer 验证两个场景全 PASS（A: form→interview→loading→report 完整流程，consumed in-flight=2；B: SPA 直跳 /loading 总耗时 3.3s prefetch 全复用）+ iPhone SE 视口粗筛布局 OK / iOS: ⚠️ 待真机（Step 26 E2E） / Android: ⚠️ 待真机（Step 26 E2E）

### P3 · 访谈页（1.5 天）
- [✓] **Step 6** 音频 Hooks（复制 use-audio-recorder / use-audio-player）— 完成时间 2026-05-02 / PC: ✓ next build 通过 + puppeteer fake media 验证 blob.size=25210B mimeType=audio/webm;codecs=opus + onEnded 触发 / iOS: ⚠️ 待真机（Step 26 E2E） / Android: ⚠️ 待真机（Step 26 E2E）
- [✓] **Step 7** TTS / ASR API（复制 transcribe / question 路由 + 火山引擎 env）— 完成时间 2026-05-02 / PC: ✓ next build 通过 + live env 实跑 transcribe（wav→中文文本）+ question 三态（greeting/Q1 题库/Q2 LLM 跳过）全 PASS / iOS: ⚠️ 待真机（Step 26 E2E） / Android: ⚠️ 待真机（Step 26 E2E）
- [✓] **Step 8** 访谈页 + Q1 主问 + 交互球（复制 page.tsx / 7 子组件 / 题库精简 1 题 / Q2 LLM prompt 改简历偏好 / use-audio-player base64 startsWith fix / Q2 兜底追问）— 完成时间 2026-05-02 / PC: ✓ next build 通过 + puppeteer 验证 4 项全 PASS（① orb 渲染 + siri-rotate 24s 动画 ✓ ② greeting + Q1 TTS Audio 构造 srcLen=167KB / 322KB base64 ✓ ③ Q1→Q2 流转 Q2 文案="在你刚才提到的偏好里..."（兜底） ✓ ④ 跳过按钮 → /loading ✓）+ iPhone SE 375x667 视口 orb 居中 (187.5, 252) 无溢出 / iOS: ⚠️ 待真机（Step 26 E2E） / Android: ⚠️ 待真机（Step 26 E2E）
- [✓] **Step 9** Q2 LLM 追问（方案 A：保留 2s 超时 + 把 Q2 fallback 池从 1 题扩到 5 题轮询）— 完成时间 2026-05-02 / PC: ✓ 3 次连续 fallback 拿到 3 道不同题（量化 / 关键词 / 排版），加分项调大超时到 12s 跑真 LLM 也拿到 3 个针对性追问 / iOS: ⚠️ 待真机（Step 26 E2E） / Android: ⚠️ 待真机（Step 26 E2E）

### P4 · LLM 改写核心（4 天）
- [✓] **Step 10** Analyze API（接入 MiniMax + 讯飞 fallback / validator / 兜底 mock，输出 suggestions 3-5 + interview 5）— 完成时间 2026-05-02 / PC: ✓ next build 通过 + 3 份 JD 实测针对性差异显著（耗时 56-68s/次） / iOS: ⚠️ 待真机（Step 26 E2E） / Android: ⚠️ 待真机（Step 26 E2E）
- [✓] **Step 11** Mode 参数（SYSTEM 加双套规则 + USER 末尾追加 mode 明示 + warnModeViolations 轻量警告）— 完成时间 2026-05-02 / PC: ✓ next build 通过 + 同 JD 同简历双跑：moderate 0 条「待核实」、example 198 字符；aggressive 2 条「待核实」、出现"改岗位标题"+"转主导角色"等真激进动作、example 228 字符（1.15x），mode 真正分流 / iOS: ⚠️ 待真机（Step 26 E2E） / Android: ⚠️ 待真机（Step 26 E2E）
- [✓] **Step 12** Resume Parser（resumeText → JSON Resume，3 样本英文+中文应届+中文社招全 PASS Zod 通过）— Wave 1 / PC ✓
- [✓] **Step 13** Rewrite API（真 LLM 接入：parseResumeToJson → callWithFallback → diff-validator 标 flagged）— Wave 2 / PC ✓ moderate 9 changes flagged 4（字数过长）/ aggressive 11 changes flagged 1（虚构 50%）
- [✓] **Step 14** Diff Validator（4 子函数，5 边界 case 全 PASS）— Wave 1 / 单测 ✓
- [✓] **Step 15** Report 页骨架（4 块功能版 + 路由守卫 + 下载按钮）— Wave 3 / PC ✓ 烟雾测试 4 块 + 守卫 + iPhone SE 视口

### P5 · Word 导出（1.5 天）
- [✓] **Step 16** Diff Applier（structuredClone + parsePath + 5 fixture 全 PASS / flagged 不应用 / 原对象不 mutate）— Wave 2 / 单测 ✓
- [✓] **Step 17** DOCX Builder（docx v9 + SimHei/SimSun + 44 项 mammoth 反向解析断言全 PASS）— Wave 2 / 单测 ✓
- [✓] **Step 18** Download API + 按钮（21/21 断言 PASS / 中文 RFC 5987 / unflagged 应用 flagged 跳过）— Wave 3 / PC ✓

### P6 · 视觉设计（2 天）
- [✓] **Step 19** 提取设计 token → DESIGN.md（克制现代蓝色调 + 5 个 ink token 补到 globals.css）— Wave 1
- [✓] **Step 20** Form 页 frontend-design V1（左右分栏 + 04 编号 numeral + JD 240px + Mode 卡片 + CTA glow + 模糊球背景）— Wave 2 / PC ✓ next build 通过
- [✓] **Step 21** Form 页 taste-skill 审计（min-h-[100dvh] / iOS input font ≥16px / noValidate / active:scale-[0.98] / next build PASS）— 完成时间 2026-05-03 / PC: ✓
- [✓] **Step 22** Report 页 frontend-design（Reveal stagger / StatChip / SectionHeader+divider / SuggestionCard 大数字左栏 / ChangeRow 改写 / InterviewItem ChevronDown + keypoints chips / next build PASS）— 完成时间 2026-05-03 / PC: ✓
- [✓] **Step 23** Report 页 taste-skill 审计（details → controlled accordion 平滑动画 / sticky bar 顶部阴影 / next build PASS）— 完成时间 2026-05-03 / PC: ✓

### P7 · 兜底 + E2E（1.5 天）
- [✓] **Step 24** Fallback mock（fallback?: boolean 加入 3 个 Result 接口 / analyze + rewrite 双路线 mock / next build 11 pages + 9 routes PASS）— 完成时间 2026-05-03 / PC: ✓
- [✓] **Step 25** 错误提示 + 骨架屏（report page 结构化骨架屏 animate-pulse / loading page 90s 超时提示 / file-upload 已有网络错误 + 扫描件 422 + 大小/格式提示 / report downloadError + 重试 / next build PASS）— 完成时间 2026-05-03 / PC: ✓
- [✓] **Step 26** 三端 E2E 完整验证（PC 27/27 断言全 PASS；iOS/Android 待真机 ngrok 验证）— 完成时间 2026-05-03 / PC: ✓ 27/27 / iOS: ⚠️ 待真机 ngrok / Android: ⚠️ 待真机 ngrok

## 阻塞 / 已知 issue

- 无

## Step 11 备注

- **改动文件**（最小动）：
  - `lib/prompts/analyze.ts`：
    - SYSTEM_PROMPT 中插入新 section「## 优化程度规则」，列出 moderate / aggressive 两套静态规则
      - moderate：保留经历框架与顺序、调措辞补量化、不重组不改岗位标题、不编数字、example 25-40 字
      - aggressive：可重组顺序（按 JD 相关度从高到低）、可删减不相关经历、可改岗位标题（不偏离实际职责）、**可推测合理数字但 example 末尾必须标注「（待核实）」**、example 40-60 字
    - 红线第 5 条改成「按 user prompt 末尾明示的 mode 执行对应规则，不要在 moderate 输出中混入 aggressive 动作」
    - 新增红线：moderate 不得编数字 / aggressive 推测的数字必须标注「（待核实）」否则视为编造
    - `buildAnalyzeUserPrompt(formData)` 末尾追加：`本次优化程度：${formData.mode}（请严格按照 system 中「优化程度规则」对应一套规则执行；moderate 不得擅自重组经历或编数字，aggressive 推测的数字必须标注「（待核实）」）。`
    - 新增 `warnModeViolations(data, mode)`：moderate 模式下 example 含数字（百分比 / 倍数 / 万元 / 人月等）但未标「待核实」 → console.warn；aggressive 含数字未标 → console.warn。完整 diff-validator 仍留 Step 14
  - `app/api/tailor/analyze/route.ts`：import `warnModeViolations` + 在 `callWithFallback` 成功后调用一次

- **prefix cache 友好**：SYSTEM 仍 100% 静态（双套规则都列入），USER 模板头 + jobTitle / jd / resumeText / mode 标注 仍是动态尾部，不影响 MiniMax 自动 prefix cache 命中

- **next build**：通过（Compile 4.1s / TypeScript 4.0s / 11 路由）

- **PC 实跑验证**（dev server `localhost:3000`，`scripts/test-mode.js`，同份产品经理（增长）JD + 同份简历，双跑 mode）：

  | 维度 | moderate | aggressive |
  |---|---|---|
  | 耗时 | 64.6s | 69.4s |
  | suggestions 数 | 4 | 4 |
  | example 总字符 | 198 | 228 |
  | example 平均长度 | 50 字 | 57 字 |
  | 「待核实」标注数 | **0** | **2** |
  | aggressive / moderate 字符比 | — | **1.15x** |

  **关键差异片段对比**：

  - **moderate #1 标题**："将前端经验转化为增长视角"（保守动词「转化」） · action 中性"在Acme经历中重写A/B实验部分"
  - **aggressive #1 标题**："将前端经历重构为增长产品视角"（「重构」更激进）· **action 明确写「把'前端工程师'岗位标题改为'高级产品经理（增长方向）'」**（plan 要求的"改岗位标题"动作真出现） · example 含「带动核心页面留存率提升（待核实）15%」（推测数字 + 标注规范）

  - **moderate #2 example**："利用SQL与Tableau构建用户行为漏斗，定位注册流失瓶颈，输出3版优化方案并推动研发上线落地。"（保留原经历，无编造数字）
  - **aggressive #2 example**："独立设计A/B测试方案，基于漏斗分析定位流失点，推动上线3个增长实验，最终通过数据复盘将注册转化率提升（待核实）12%。"（推测 12% + 标注 + 把「配合」转「主导」）

  → **mode 真分流验证 PASS**：moderate 严守"不编数字"红线；aggressive 出现改岗位标题、转主导角色、推测数字+标注三大激进动作。字符比 1.15x 低于 plan「理想 1.5-2x」但 plan 写「定性贴回报即可」，且关键质变（待核实 0→2、改岗位标题动作出现）已确凿。

  Q1 对比：moderate "请分享一次你主导的A/B测试案例，如何确定实验假设与显著性？" vs aggressive "请分享一次你主导的A/B测试实验，如何确定实验假设与统计显著性？"，几乎一致——5 题面试预演不被 mode 强烈影响（设计如此，mode 只影响 suggestions 改写程度）

- **dev server 已关闭**（Stop-Process by port 3000，验证 down ✓）

- **未做**：iOS / Android 真机 → 留 Step 26 E2E（Step 11 是 prompt 层改造，无设备相关）

- **新建文件**：`scripts/test-mode.js`（mode 双跑对比验证脚本）

## Step 10 备注

- **新增/改动文件**：
  - `lib/prompts/analyze.ts`（新建，约 130 行）：
    - `ANALYZE_SYSTEM_PROMPT`（静态，约 1100 字中文）— 三重身份角色 + JSON schema 字段含义（不写 "..." 占位符，每个字段用自然语言描述长度 / 格式 / 内容约束） + 5 题分布（3 岗位技能 + 1 项目深挖 + 1 动机匹配） + 5 条红线
    - `ANALYZE_USER_TEMPLATE_HEAD`（静态短串）+ `buildAnalyzeUserPrompt(formData)` 把动态 jobTitle / jd / resumeText / mode 拼在静态头之后（命中 prefix cache）
    - `validateAnalyzeResult(data)`：校验 suggestions 3-5、interview 严格=5、每个字段非空 + 不是占位符（"..." / "<...>" / "字符串" / "todo" / "null" 等模式）、keypoints 数组 ≥ 2 条
  - `app/api/tailor/analyze/route.ts`（重写）：
    - 删 1500ms stub + 硬编码 mock
    - 改用 `callWithFallback<TailorAnalyzeResult>()`（MiniMax 主 → 讯飞 fallback，自带 JSON_ONLY_PREFIX + response_format json_object + 50s AbortController + extractJson + tryFixAndParse）
    - validator 不通过自动切讯飞重试
    - 双 LLM 都失败时返本路由内置的 `FALLBACK`（5 题通用兜底），不让前端白屏
    - body 字段缺失时 400
  - `scripts/test-analyze.js`（新建，验证脚本）：3 份不同 JD（产品 / 前端 / 财务） × 同一份偏前端的简历

- **next build**：通过（Compile 3.6s / TypeScript 4.0s / 11 路由）

- **PC 自动化验证**（dev server `localhost:3000`，`.env.local` 已加载 MiniMax / 讯飞）：

  3 份 JD 实测耗时与针对性差异：

  | JD | 耗时 | suggestions 数 | suggestions 标题（看针对性） |
  |---|---|---|---|
  | 产品经理（增长） | 67.9s | 4 | 强化增长实验与数据闭环经验 / 突出全链路用户增长策略能力 / 显式展示数据分析工具与技能 / 将技术优势转化为增长驱动力 |
  | 前端工程师（React/性能） | 56.7s | 3 | 显式强化性能指标与优化手段 / 突出工程化基建与跨业务赋能 / 显式关联 Next.js 与 SSR 加分项 |
  | 财务分析（行业研究） | 59.4s | 3 | 强化财务模型与数据分析能力 / 突出 Excel 高阶应用与数据处理技能 / 展示行业研究与报告撰写潜力 |

  → 3 次标题**完全围绕各自 JD 关键词**，针对性差异极显著 PASS。

  3 份 JD 的 interview 第 1 题对比（验证「岗位技能题」是否切中本 JD 硬技能）：
  - 产品 → 「请分享一次你主导的 A/B 测试案例，如何验证实验结果的统计显著性？」（A/B + 统计显著性，与 JD「实验设计 / 统计显著性判断」对齐）
  - 前端 → 「你在 Acme 项目中引入 Vite 替换 Webpack 的具体权衡过程是怎样的？」（构建工具，与 JD「Vite / Webpack」对齐 + 引用简历真实经历）
  - 财务 → 「请描述你如何用 Excel 或 Power Query 处理过大量数据并建立自动化看板？」（Excel + Power Query，与 JD「精通 Excel 高阶函数、Power Query / Pivot」对齐）

  3 份 JD 的 interview 第 5 题（动机匹配题）也全部针对：
  - 产品 → 「作为前端背景，你为何选择转向用户增长方向，如何弥补产品思维短板？」
  - 前端 → 「为什么选择 React + TypeScript 作为核心技术栈？结合你的 Next.js 经验谈谈看法。」
  - 财务 → 「作为软件工程背景，为什么选择转型做财务分析，你的核心竞争力在哪里？」

  → 5 题分布严格执行（3 + 1 + 1），所有 schema 字段非空、无占位符泄漏。

- **prompt 设计要点**：
  - **静态/动态边界严格**：system prompt 全静态（角色 + schema + 5 题分布 + 红线 + 风格），user message 头是 `ANALYZE_USER_TEMPLATE_HEAD` 静态短句，动态字段（jobTitle / jd / resumeText / mode）拼在尾部 → 命中 MiniMax 自动 prefix cache
  - **schema 描述零占位符**：字段说明用自然语言写「title: 一句不超过 14 字的中文短标题」而不是 `"title": "..."`，避开 `minimax-json-stable` skill 里提到的「模型照抄占位符」陷阱
  - **5 条红线明确写出**：建议必须基于真实简历内容 / 禁止虚构经历或数字 / suggestions 3-5 + interview = 5 / 字段必须真实内容 / 适中模式保留原经历

- **未做（留给后续步骤）**：
  - Step 11 才做 mode 差异（当前 system 写「默认按适中偏向」，aggressive 模式 prompt 没真正分流）
  - Step 12 才做 Resume Parser（当前 resumeText 直接当字符串塞进 prompt）
  - Step 13 才做 Diff（当前 rewrite API 仍是 Step 4 的 stub）

## Step 9 备注

- **方案选择**：方案 A（保留 2s 超时 + 加厚 fallback 池）。理由：Step 8 已实测本机 MiniMax + 讯飞 fallback Q2 调用稳定 > 2s，2s 超时是 career-report 的设计选择（用户体验 vs LLM 自由度的折中），尊重经验值不动；fallback 池从 1 题扩到 5 题保证 3 次连续调用拿到 3 道不同题。

- **改动文件**（最小动）：
  - `lib/interview-questions.ts`：新增 `Q2_FALLBACK_BANK`（5 题，分别对应量化指标 / 关键词 / 排版 / 经历取舍 / 行业画像）+ `pickQ2Fallback()` 顺序游标函数。每题 ≤ 50 字，开放式但有方向（参考 ai-interview-question-design skill）
  - `app/api/interview/question/route.ts`：① import 加 `pickQ2Fallback`；② Q2 LLM catch 分支由「单句硬编码兜底」改成 `pickQ2Fallback(excludeIds)`；③ 注释同步「失败回落 Q2 fallback 池（5 题轮询）」
  - **没动**：`page.tsx` 状态机、Q2 prompt（已在 Step 8 改对）、2s 超时常数

- **next build**：通过（Compile 3.9s / TypeScript 3.8s / 11 路由）

- **PC 自动化验证**（dev server `http://localhost:3000`，`.env.local` 已加载）：

  **方案 A · fallback 池 3 次轮询（2s 超时不变）**：连发 5 次 POST `/api/interview/question`，每次给不同 transcript，dev log 全部 `Q2 LLM timeout 2s, fallback to Q2 bank`，返回 5 题轮询：
  ```
  #1 → q2-quant     "你希望简历里的成果用哪种方式量化？比如百分比、数值、规模，还是节省时间这种业务语言？"
  #2 → q2-keyword   "对照你贴的 JD，哪些关键词或技能你觉得现在简历里命中得不够？想优先补齐哪个方向？"
  #3 → q2-layout    "排版和长度上你最在意什么？是压到一页、模块顺序，还是某些段落要更显眼？"
  #4 → q2-tradeoff  "如果只能保留两段经历，你会留哪两段？哪些经历你觉得反而拖累了整体定位？"
  #5 → q2-industry  "目标公司更偏大厂、创业公司还是传统行业？语言风格和案例选择上你希望往哪边靠？"
  ```
  → 3 次连续 fallback 拿到 3 道不同 Q2，PASS。游标在 5 题循环正确。

  **加分项 · 方案 B · 临时调大超时 12s 跑真 LLM**（验证完已改回 2s）：
  ```
  Q1 答 "我希望突出 Python 和 AI 项目经验"
  → LLM Q2 #1: "在突出Python与AI项目时，您更希望侧重量化成果，还是希望优化技术关键词以匹配特定岗位？" ✓ 针对性强

  Q1 答 "简历压缩到一页，目标是字节、腾讯产品岗"
  → LLM Q2 #2: "您提到希望压到一页并突出项目，那么您更希望我优先优化项目的量化成果，还是精简非核心经历的描述？" ✓ 针对性强

  Q1 答 "想强化数据驱动决策的表述，A/B 测试经验要更突出"
  → LLM Q2 #3: "在强调 AB 测试经验时，你更倾向" ✗ 截断（maxTokens=200 偶发被截）
  ```
  → 真 LLM 路径在 8-12s 范围内可工作但不稳定（偶发截断 / fallback 之间漂移），印证 2s 超时的设计选择是对的：用户体验 > LLM 自由度，fallback 池兜底更可靠。

- **dev server 已关闭**（TaskStop bm99mh60z + Stop-Process PID 16776，端口 3000 干净）

- **未做**：iOS / Android 真机 Q2 流转 → 留 Step 26 E2E（Q1→Q2 流转 Step 8 已 PC 验过，本步只是把 Q2 fallback 池加厚）

## Step 1 备注

- npm install 用了淘宝镜像（`--registry=https://registry.npmmirror.com/`），耗时 9 分钟，安装 675 个包
- 1 个 deprecated 警告：`node-domexception@1.0.0`（传递依赖，可忽略）
- `next build` 一次过：编译 2.4s，TypeScript 通过，静态页 3 个（/、/_not-found）
- 已对齐 career-report 的栈，删除：bcryptjs / better-sqlite3 / iron-session（无登录）、html2canvas-pro / jspdf / puppeteer（无 PDF 导出）、recharts（无图表）、@playwright/test / ws / @types/ws / @types/bcryptjs / @types/better-sqlite3
- 新增依赖：`docx@^9.6.1`
- globals.css 精简：移除 career-report 业务样式（CINEMATIC LANDING / Print / REPORT shell-card-kpi 等），保留 @theme + 颜色 token + 暗色 + base
- 未做：git init（按 plan 要求等用户决定）

## Step 8 备注

- **复制的文件**（一字不差，从 `D:\career-report\` 直接 `cp` / Write）：
  - `app/interview/_components/ai-orb.tsx`（217 行）— **★ 交互球**：3 层 SVG/CSS — 外层 halo（framer-motion `animate.scale` 呼吸 + halo color tween）+ 中层 siri orb（pseudo `::before` 6 路 conic-gradient + `--siri-angle` CSS @property 0→360 旋转，CSS keyframe `siri-rotate`）+ processing 态外环 spinner。对外只暴露 `<AiOrb state={"idle"|"speaking"|"recording"|"processing"} amplitude? size? />`，状态字典 `STATE_COLORS`/`STATE_SPEED` 切换颜色 + 旋转速度。**严格保留所有视觉**
  - `app/interview/_components/ai-avatar.tsx`（51 行）— 头像球（chat-bubble 用，本步未直接挂载但保留以备 Step 20+ 视觉精修）
  - `app/interview/_components/chat-bubble.tsx`（99 行）— 气泡组件（同上，留作未来）
  - `app/interview/_components/mic-button.tsx`（203 行）— 按住录音按钮（mouse + touch + 上滑取消 80px 阈值 + 录音波纹 ripple）
  - `app/interview/_components/transcript-preview.tsx`（214 行）— 转写预览卡 + 编辑 textarea + ASR 失败提示
  - `app/interview/_components/transition-card.tsx`（92 行）— 过渡卡片（quiz→interview 切换用，本步未挂载但保留）
  - `app/interview/_components/wave-indicator.tsx`（69 行）— 5 条波形音浪
  - `lib/hooks/use-audio-visualizer.ts`（102 行，新建）— `useAudioVisualizer(mediaStream)` → `{ amplitude }`，AudioContext + AnalyserNode + RAF RMS 计算（page.tsx 用，driver mic-button 录音波形）
  - `components/ui/step-indicator.tsx`（63 行，新建 + 改文案）— `REPORT_STEPS = ["填写岗位 + 简历", "AI 访谈偏好", "生成定制简历"]`（career-report 是「填写职业意向 / 快速职业评估 / 生成职业报告」，对齐 resume-tailor 业务）

- **改造的文件**：
  - `app/interview/page.tsx`（685 → 685 行）：覆盖 Step 5 占位。**主要改动**：① sessionStorage key `formData` → `tailor:form`，读 `formData.jobTitle`（不再是 `targetPosition`）；② 完成 / 跳过都写 `tailor:interview`（不再是 `interviewData`）；③ `GREETING_TEXT` "AI 职业顾问 → 帮你完善这份定位报告" 改 "AI 简历顾问 → 帮你定制这份简历"；④ 跳过弹窗文案换"访谈内容可以让简历更贴合你的偏好"。**保留**：`unlockAudio()` AudioContext.resume + 预请求麦克风权限 + 15s speaking-q 安全超时（iOS autoplay 容错三件套，与 `ios-autoplay-async-gesture-loss` skill 同源）+ Q1 与 greeting 并行预取 + Q2 后台预取 + `phaseRef` 同步状态机
  - `lib/interview-questions.ts`：题库从 10 题精简到 1 题，Q1 文案改「你对简历优化的要求有哪些？请聊聊...」（开放式 + 内置 4 个 scaffolding 例子，对齐 `ai-interview-question-design` skill）。`pickNextQuestion()` 函数签名 / 游标逻辑不动
  - `lib/types.ts`：追加 `InterviewData` 接口（page.tsx 写 `tailor:interview` 用）
  - `app/api/interview/question/route.ts`：① `GREETING_TEXT` 同步改成简历顾问；② Q2 LLM systemPrompt 从「AI 面试官 / 职业心态」改成「资深简历顾问 / 简历改写中最关心的具体方向（量化指标 / 关键词 / 排版 / 经历优先级）」；③ Q2 fallback 增强：题库现在只有 Q1，excludeIds 排除 q1 后 `pickNextQuestion` 退化为 Q1，加一道写死的兜底追问 "在你刚才提到的偏好里，最希望优先满足的是哪一个方向？比如先保证关键词命中、还是先突出最相关的经历、或者先把篇幅压缩到位。"（避免 Q2 = Q1）
  - `lib/hooks/use-audio-player.ts`（**bug fix**）：原判断 `audioSrc.startsWith("/")` 在 base64 mp3 数据 `//PkxA...` 上误判为 URL → chrome 把 base64 头当成 hostname `pkxa...` 报 `ERR_NAME_NOT_RESOLVED`。改成 `audioSrc.startsWith("/audio/")` 精确判断本站音频路径

- **next build**：通过（Compiled 3.1s / TypeScript 3.2s / 11 路由，`/interview` 体积按 page.tsx 685 行 + 子组件应有增长，未输出每路由 size 因 Next.js 16）

- **PC 自动化验证**（puppeteer-core + 本地 Chrome / `--use-fake-ui-for-media-stream` + `--use-fake-device-for-media-stream` + `--autoplay-policy=no-user-gesture-required`）— **4 项检查全 PASS**：

  ```
  [12:09:36.345] form-storage-set     (写 tailor:form 到 form 页 sessionStorage)
  [12:09:36.570] interview-loaded     (goto /interview, sessionStorage 跨同源保留)
  [12:09:36.791] orb-rendered         ① ★ 交互球 .siri-orb-inner DOM 找到
  [12:09:36.799] orb-animation-checked   animationName="siri-rotate" duration="24s"  ✓
  [12:09:39.290] audio-greeting-constructed=true   ② greeting Audio 构造成功
                                          src="data:audio/mp3;base64,//PkxA..." srcLen=167702 ✓
  [12:09:41.330] start-clicked=true    点 "准备好了，开始访谈"，触发 unlockAudio + 预请求 mic + 拿预取 Q1
                 (Q1 Audio 第二次构造，srcLen=321942 base64 mp3)  ✓
  [12:09:41.741] Q1-text-shown        Q1 文案 "简历优化偏好" 关键字命中
  [12:09:54.237] ready-phase=true     等 audio 朗读完，"改为文字" 按钮出现（phase=ready）
  [12:09:54.249] switched-to-text     点 "改为文字" → phase=text-input
  [12:09:55.218] typed-Q1-answer      "我希望突出 React 项目经验，压缩到一页，目标互联网大厂"
  [12:09:55.535] submit-Q1=true       点 "确认提交" → handleConfirm → setTurnIndex(1) → 取预取 Q2
  [12:10:00.473] Q2-shown=true        ③ Q2 文案命中 "第 2 / 2 题"
                                          Q2-text="在你刚才提到的偏好里，最希望优先满足的是哪一个方向？..." ✓
                                          (Q2 LLM 在 dev server log 里 2s 超时 → 走兜底追问，验证 fallback 路径正确)
  [12:10:02.579] skip-clicked         重载页面，点跳过访谈 → 弹窗 → 点跳过
  [12:10:04.582] after-skip-path=/loading   ④ 路径变 /loading ✓
  ```

- **PC Chrome DevTools 移动端模拟（375×667 iPhone SE / Pixel 5 等价视口）**：
  - 交互球 DOM 居中：`orbCenterX=187.5`（vw=375，正中），`orbCenterY=252`，`orbW=orbH=188`（占视口宽 50%）✓
  - `body.scrollWidth ≤ window.innerWidth` → 无横向溢出 ✓
  - "准备好了，开始访谈" / "跳过访谈" 按钮可点 ✓

- **Q2 LLM 状态**：实测 dev server log `[interview/question] Q2 LLM failed/timeout, fallback to bank: Error: Q2 LLM timeout 2s`。本机 MiniMax 调用 > 2s，所以总是走兜底文案。这**不阻塞 Step 8**（验证目标是 Q1→Q2 流转和文案不复用 Q1，达到了）。Step 9 计划上是「Q2 LLM 追问独立步骤」，但实际改造已在 Step 8 顺手做了（prompt + 兜底），Step 9 实际只剩「真 LLM 在配置 OK 时端到端跑一次 LLM 生成的真追问」

- **dev server 已关闭**（KillShell byf9d2yxa）

- **未做**：
  - iOS / Android 真机麦克风 + 真 TTS 播放 + 交互球真机性能 → 留 Step 26 E2E
  - 视觉精修（Step 20+）— 当前样式仍是 career-report 原版（slate / blue 蓝白系），iOS autoplay 真机声音可达性留 Step 26

## Step 7 备注

- **复制的文件**（全部一字不改，从 `D:\career-report\` 直接 `cp`）：
  - `app/api/interview/transcribe/route.ts`（48 行）：FormData → `audio` Blob + `mimeType` → `transcribeAudio()`，<3000B 直接返空字符串
  - `app/api/interview/question/route.ts`（141 行）：3 模式 — `greeting:true`（开场白 + TTS）/ 无 `previousTurns`（题库 Q1）/ 1 个 turn（LLM 追问 Q2，2s 超时回落题库）
  - `lib/volc-asr-batch.ts`（139 行）：火山批量 ASR Flash 端点，非 wav/mp3 → ffmpeg 转 16kHz 单声道 wav 后调 `https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash`，20s 超时
  - `lib/volc-tts.ts`（61 行）：火山 BigTTS V1 端点 `https://openspeech.bytedance.com/api/v1/tts`，默认 voice `zh_female_vv_uranus_bigtts`，10s 超时，返回 base64 mp3
  - `lib/minimax.ts`（28 行）：OpenAI client Proxy（lazy init，避免冷启动读 env），默认 model `MiniMax-Text-01`
  - `lib/iflytek.ts`（14 行）：讯飞 fallback OpenAI client，未配 key 时为 null（`callWithFallback` 自动退化为单路 MiniMax）
  - `lib/report-shared.ts`（252 行）：`callWithFallback` 是 question route Q2 LLM 追问的入口，附带 `JSON_ONLY_PREFIX` + 50s 硬超时 + JSON 容错管线（`stripReasoning` / `extractJson` / `tryFixAndParse`）。整文件复制（包含 `buildBaseContext` / `APPLICANT_BASELINE` 等本步未用到的导出，留给后续步骤）
  - `lib/industry-resolver.ts`（163 行）：`buildBaseContext` 间接依赖，本步未用到，复制以保 `report-shared.ts` 一字不改
  - `lib/interview-questions.ts`（94 行）：10 题职业心态题库 + `pickNextQuestion()` 顺序游标。**注**：plan 注释提到「题库 Step 8 才动」，本步原样复制只是为了让 question route build 通过，Step 8 重定位到「简历优化」主题时直接覆写本文件即可，无需改其它依赖

- **types.ts 处理**：resume-tailor 已有 `lib/types.ts`（resume-tailor 自有 schema），career-report 的 `types.ts` 不能整体覆盖。在文件**顶部追加** career-report 路由依赖的 3 个类型 `JobFormData` / `QuizDimension` / `QuizAnswer` / `InterviewTurn`（保持原始字段名，让 `report-shared.ts` 一字不改即可 import 成功）

- **.env.local.example 重写**：原文件用了 `VOLC_TTS_APP_ID/TOKEN` / `VOLC_ASR_APP_ID/TOKEN` / `IFLYTEK_APP_ID/API_SECRET`，但实际 lib 代码读的是 V3 接口规范的 `VOLC_TTS_APP_KEY` / `VOLC_TTS_ACCESS_KEY` 等，**变量名完全不一致**。已按 `process.env.X` 实际读取重写：
  - **MiniMax**：`MINIMAX_API_KEY` + 可选 `MINIMAX_BASE_URL` / `MINIMAX_MODEL`
  - **讯飞 fallback**：`IFLYTEK_API_KEY` + 可选 `IFLYTEK_BASE_URL` / `IFLYTEK_MODEL`
  - **火山 TTS / ASR**（共享 APP_KEY / ACCESS_KEY）：`VOLC_TTS_APP_KEY` + `VOLC_TTS_ACCESS_KEY` + 可选 `VOLC_TTS_SPEAKER` / `VOLC_ASR_RESOURCE_ID`

- **.env.local 同步**：career-report 已有 `D:\career-report\.env.local`，按 plan 指令把 9 个相关变量行 `grep` 后追加到 `D:\workspace\01_项目-Coding\resume-tailor\.env.local`（**未打印 secret 值**，仅核对行数 = 9）。检查无 `$` 字符（避开 dotenv 截断坑），`.gitignore` 已忽略 `.env.local`

- **next build**：通过（Compile 2.8s / TypeScript 2.8s / 11 路由，新增 `ƒ /api/interview/question` + `ƒ /api/interview/transcribe`）

- **PC live env 实跑验证**（dev server `http://localhost:3000`，`.env.local` 已加载）：

  **A · question greeting**
  ```
  POST /api/interview/question {greeting:true}
  → text="你好，我是你的 AI 职业顾问，接下来我会问你两个问题，帮你完善这份定位报告。"
  + audioBase64 (mp3 base64，火山 BigTTS 实合成) ✓
  ```

  **B · question 题库 Q1**
  ```
  POST /api/interview/question {}
  → text="你选择现在这个求职方向，最打动你的是什么？..."
  + questionId="q1" + bankSize=10 + audioBase64 长度 263680 (mp3) ✓
  ```

  **C · transcribe wav**
  ```
  PowerShell SAPI 合成中文 wav: "你好世界，这是火山语音识别测试。"（193562 字节）
  POST /api/interview/transcribe (multipart audio + mimeType=audio/wav)
  → {"text":"你好，世界。这是火山语音识别测试。"} ✓
  (wav 路径跳过 ffmpeg 转码，直接走火山 ASR Flash V3 端点)
  ```

- **dev server 已关闭**（TaskStop b27qk0s0d）

- **环境层小注**：
  - 系统 PATH 没有 ffmpeg；本步用 wav 直跳过 ffmpeg 转码做烟测，能验证「火山 ASR API 联通 + V3 鉴权头正确」。webm/mp4 转码路径要等 Step 8 浏览器实录或装 ffmpeg 后再覆盖（career-report 已踩过这坑，相关 skill `browser-audio-asr-format-mismatch`）
  - 题库 `interview-questions.ts` 当前是 career-report 的「职业心态」10 题，Step 8 会改成「简历优化」主题——届时只覆写本文件，question route 不动

- **未做**：iOS / Android 真机麦克风 → 留 Step 26 E2E

## Step 6 备注

- **复制的文件**（一字不差，`diff -bw` 与 career-report 源文件 100% 一致）：
  - `lib/hooks/use-audio-recorder.ts`（169 行）：`useAudioRecorder()` → `{ start, stop, cancel, isRecording, durationSec, mediaStream }`，封装 MediaRecorder + getUserMedia + 1s 计时器（≤ 60s），mimeType 自动选 `audio/webm;codecs=opus` → `audio/mp4` → `audio/webm`，stop() 返回 `{ blob, mimeType, durationSec }`
  - `lib/hooks/use-audio-player.ts`（82 行）：`useAudioPlayer(onEnded?)` → `{ play, stop, isPlaying }`，play 接受三种 src（`/path`、`http(s)://...`、raw base64 自动加 `data:audio/mp3;base64,` 前缀），onEnded 用 ref 保活避免 play/stop 被重新创建

- **依赖检查**：两个 hook 完全自含，仅 `react` + 浏览器 Web APIs（MediaRecorder / Audio / URL），不引用项目内部任何 `lib/types.ts` / `lib/utils.ts` 等模块，**无需补 lib/types.ts**

- **新建临时调试页**（保留作未来调试用）：
  - `app/dev/audio/page.tsx`：3 按钮 + 状态面板（isRecording / durationSec / isPlaying / blob.size / mimeType / 播放状态），handleStop 后 `URL.createObjectURL(blob)` 给 player，handlePlay 调 `player.play(blobUrl)`，onEnded 回调 setState + console.log("播放完毕")
  - **路由命名**：原计划 `app/__dev/audio`，但 Next.js 中 `_` 前缀目录是私有目录会被排除路由（含 `__dev` 双下划线也会触发），改用 `app/dev/audio` → 实际路由 `/dev/audio`，意图（临时调试页）通过 `dev` 段表达

- **next build**：通过（Compile 3.4s / TypeScript 3.1s / 9 静态页 + 3 ƒ 动态路由，新增 `○ /dev/audio`）

- **PC 自动化验证**（puppeteer-core + 本地 Chrome 147，headless，`--use-fake-ui-for-media-stream` + `--use-fake-device-for-media-stream`）：
  ```
  [+1760ms] /dev/audio 加载完成
  [+1805ms] click btn-start
  [+2038ms] isRecording=true（fake media 自动授权 + getUserMedia 拿到流）
  [+4047ms] 等 2 秒后 durationSec=2（计时器跑通）
  [+4062ms] click btn-stop
  [+4099ms] STOPPED: blob.size=25210 mimeType=audio/webm;codecs=opus
  [+4131ms] click btn-play
  [+4154ms] onEnded fired (status-play 显示「播放完毕」)
  [+4154ms] console "播放完毕" seen? true
  ```
  - **blob.size = 25210 字节**（fake stream 的 2 秒 webm/opus 数据，> 0 ✓）
  - **mimeType = audio/webm;codecs=opus**（首选项命中 ✓）
  - **onEnded 双重确认**：状态面板更新 + console.log 都触发 ✓
  - **无 page error / no warnings related to hooks**

- **dev server 已关闭**（TaskStop brnfrbtw1 + Stop-Process PID 6796，端口 3000 干净）

- **未做**：iOS / Android 真机麦克风权限 / 真实录音 → 留 Step 26 E2E（fake stream 已覆盖逻辑路径，真机只是验权限弹窗 + 设备真实录入）

## Step 5 备注

- **新建文件**：
  - `app/loading/page.tsx`（145 行）：客户端组件，mount 时读 sessionStorage `tailor:form` → 调 `generateTailor(formData, { onProgress })` → 双卡片可视化（每张卡 = StatusIcon + label + 状态文案，框/底色按 pending/loading/completed/fallback 切色）→ 完成后 `sessionStorage.setItem("tailor:report")` + 600ms 延迟跳 `/report`
  - `app/report/page.tsx`（占位）：读 `tailor:report` 后用 `<pre>` dump JSON；缺数据回 `/form`（Step 15 路由守卫会改成回 `/loading`）

- **修改文件**：
  - `app/interview/page.tsx`：原占位加「我已聊够，去看报告」Button → `router.push('/loading')`，方便 Step 5 验证（Step 8 重写整页时会替掉）
  - `lib/report-client.ts`：仅加 2 行 console.info — `[tailor] {key} consumed in-flight` / `[tailor] {key} fetched fresh`，方便 puppeteer 区分 prefetch 命中 vs 现场 fetch；**没引入新 callback**（现有 `onProgress(progress[])` 已经按章节状态切换实时回调，loading 页只 setState 数组就拿到分章节进度，原则 3「精准修改」+ 原则 2「简洁至上」）

- **report-client 是否引入新 callback**：**没引入**。原因：现有 `onProgress` 在每个 task 启动时把对应 `progress[idx].status = "loading"` + 完成时切 `"completed"` 同步触发回调，loading 页 setState 后直接渲染分章节状态。不需要 `onSectionStart/onSectionDone` 二级 API。

- **next build**：通过（Compile 3.6s / TypeScript 2.8s / 8 静态页 + 3 个 ƒ 动态路由，新增 `○ /loading` `○ /report`）

- **PC 自动化验证**（puppeteer-core + 本地 Chrome 147，headless）— 两个场景全 PASS：

  **场景 A（完整 form→interview→loading→report 流程）**
  ```
  [+8ms] form 提交：两个 stub fetch 同时启动（prefetch 同步触发）
  [+91ms] router.push('/interview')
  [+107ms 点击占位按钮] router.push('/loading')
  [+152ms] /loading 两个卡片都显示「生成中」 ✓
  [+1526ms 自 submit] /api/tailor/analyze 200 → analyze 卡片切「已完成」(rewrite 还在生成中) ✓
  [+2539ms 自 submit] /api/tailor/rewrite 200 → rewrite 卡片切「已完成」 ✓
  [+2900ms 自 submit] router.push('/report')（含 600ms「已完成」展示延迟） ✓
  sessionStorage tailor:report:
    suggestionsCount=3, interviewCount=5, hasResume=true, changesCount=4 ✓
  console: [tailor] analyze consumed in-flight + [tailor] rewrite consumed in-flight ✓
  ```

  **场景 B（SPA 内 form→interview→立即 /loading，模拟用户秒过访谈）**
  ```
  [+102ms] /interview
  [+202ms] /loading（点占位按钮立即跳）
  [+3266ms] /report（form 提交后 3.3s 总耗时 ≈ rewrite 2.5s + 600ms 完成态延迟 + 路由）
  console: 2 个 [tailor] consumed in-flight，0 个 fetched fresh ✓ — 即 prefetch 完全复用
  ```

- **PC Chrome DevTools iPhone SE 模拟（375×667）**：
  - `scrollWidth === clientWidth === 375`，无横向滚动 ✓
  - 标题居中、两张卡片纵向堆叠、loading spinner 蓝色、状态标签右对齐 → 截图 `D:\tmp\loading-mobile.png` 已存档
  - 视觉精修留 Step 20-21（Step 5 只做功能 + 基础动效）

- **dev server 已关闭**（PID 696 by Stop-Process，端口 3000 0 个连接）

- **未做**：
  - 三入口完整接入：plan 提到入口 1（访谈完成）、入口 2（用户跳过）、入口 3（路由守卫推回）。Step 5 当前只支持「占位按钮跳 loading」即入口 1+2 的等价模拟，入口 3 留 Step 15
  - iOS / Android 真机 — 留 Step 26 E2E

## Step 4 备注

- **复制 + 改造的文件**：
  - `lib/report-prefetch.ts`（改自 `D:\career-report\lib\report-prefetch.ts`）：章节列表精简 4→2（`analyze` + `rewrite`），指纹 hash 字段从 `targetPosition / targetEducation / targetCompany / targetCityTier / resumeHash` 改成 `jobTitle / jd / resumeHash / mode`，保留内存 Map 单例 + AbortController + 指纹失配 abort 旧请求逻辑
  - `lib/report-client.ts`（改自同名文件）：消费端，导出 `generateTailor(formData)`，先 `consumeReportPrefetch` 拿 in-flight，没拿到现场 fetch；并发拿 analyze + rewrite 组装成 `TailorReport`，单章节失败走静态 fallback 不抛异常给 UI
  - `lib/types.ts`：补 `TailorSuggestion / TailorInterviewQuestion / DiffChange / TailorAnalyzeResult / TailorRewriteResult / TailorReport`（resume 字段先用 `unknown` 占位，JSON Resume 完整 schema 留 Step 12）
  - `app/form/page.tsx`：顶部 import `startReportPrefetch`，提交流程 `console.log` 后立即调（fire-and-forget），不 await 立即 `router.push('/interview')`

- **bg-runner 没复制**（决定 + 原因）：
  - career-report 的 `report-bg-runner.ts` 是处理「依赖 quizAnswers 的章节」的，它在 quiz 页 startBgSections 启动 overview / positionInfo
  - resume-tailor 没有 quiz 页，访谈输入也不进 prompt（plan v3 明确：「访谈输入存 sessionStorage 但不进后台 prompt」），analyze + rewrite 都从 form 提交瞬间启动
  - 检查 `report-prefetch.ts`：完全独立，不 import bg-runner；`report-client.ts` 里 `consumeBgSections` 调用已删除（这里只走 `consumeReportPrefetch`）
  - 结论：**不复制 bg-runner**

- **stub API mock 内容**：
  - `app/api/tailor/analyze/route.ts`（POST，1500ms 延迟）：3 条 suggestions（突出 React / 量化业务影响 / 强化跨端协作）+ 5 题面试题（性能 / 组件库 API / 主导项目 / 动机匹配 / 短板）
  - `app/api/tailor/rewrite/route.ts`（POST，2500ms 延迟）：JSON Resume 简化样本（basics + 2 work + education + skills）+ 4 个 changes（replace summary / replace work[0].highlights[2] / append work[1].highlights / append skills）
  - 两个 route 都 `runtime = 'nodejs'` + `dynamic = 'force-dynamic'` + 读取 body（前端 fire-and-forget 时不会断 stream）

- **next build**：通过（Compile 3.1s / TypeScript 3.0s / 6 静态页 + 3 个 ƒ 动态路由：`/api/resume/parse` / `/api/tailor/analyze` / `/api/tailor/rewrite`）

- **PC 自动化验证**（puppeteer-core + 本地 Chrome 147，headless）：
  - 打开 `/form` → 填 jobTitle/jd/上传 tables.docx/选 aggressive → 点提交
  - 监听 `request` / `response` 事件 + 时间戳
  - **关键证据（IN-FLIGHT 抓到）**：
    ```
    [NETWORK ▶] /api/tailor/analyze started at 1777721482275
    [NETWORK ▶] /api/tailor/rewrite started at 1777721482275
    [CLICK] submit clicked at 1777721482236

    === In-flight check (T+200ms after submit) ===
    requests started: 2
      - /api/tailor/analyze IN-FLIGHT
      - /api/tailor/rewrite IN-FLIGHT
    OK: 2 个 in-flight 请求

    Final URL: http://localhost:3000/interview
    [NETWORK ✓] /api/tailor/analyze finished status=200 elapsed=1684ms
    [NETWORK ✓] /api/tailor/rewrite finished status=200 elapsed=2720ms
    ```
  - **Console 命中**：`[FORM] resumeText length: 60` ✓ + `[prefetch] start` ✓
  - **session 存活**：tailor:form 6 字段齐全
  - **导航即时**：提交即跳 /interview，**两个 stub 还在 pending**（与 plan「fire-and-forget」要求一致）

- **dev server**：已通过 TaskStop + Stop-Process 关闭（端口 3000 干净）

## Step 3 备注

- **复制的 ui 组件**（4 个，从 `D:\career-report\components\ui\` 一字不差）：`button.tsx` / `input.tsx` / `label.tsx` / `file-upload.tsx`
  - `file-upload.tsx` 唯一改动：移除「选填」badge（resume-tailor 这步必填）
- **复制的工具**：`lib/utils.ts`（cn / clsx + tailwind-merge）
- **新写**：`lib/types.ts` —— 仅 `TailorMode` + `TailorFormData`（plan 后续步骤会扩展 JSON Resume schema 等）
- **Radio 选型**：用原生 `<input type="radio">` + `register('mode')`，不引 base-ui RadioGroup —— 简单优先
- **`app/form/page.tsx`** 字段对照 plan 4 项：
  - jobTitle（input）+ jd（textarea rows=8）+ resume（FileUpload，单独 useState）+ mode（Radio 二选一，default moderate）+ 大按钮（h-12 w-full + disabled+loading）
  - Zod schema 严格按 plan：`jobTitle min(1).max(60)` / `jd min(20)` / `mode enum`
  - resume 不进 RHF 校验，提交时另行检查 `resume?.text`（缺时显示「请先上传简历」）
- **`app/interview/page.tsx`** 占位，"访谈页占位 / Step 8 实做"
- **`textarea`**：直接用原生 `<textarea>` + Tailwind class（没复制 career-report 的 textarea 组件 —— Karpathy 简洁原则，只用一次没必要单独包）
- **删掉的 import（career-report form/page.tsx 里有的）**：`startQuizPrefetch` / `startReportPrefetch` / `clearReportPrefetch` / `clearBgSections` —— 全是 Step 4 prefetch 的事；`StepIndicator` / `Select` / `framer-motion` —— 视觉 Step 20-21 再说
- **next build**：通过（Compile 3.4s / TypeScript 3.4s / 6 静态页 + `ƒ /api/resume/parse`，新增 `/form` `/interview` 两个 ○ 静态路由）
- **PC 自动化验证**（puppeteer-core + 本地 Chrome 147，headless）：
  - **空提交被 zod 拦下**：URL 仍 `/form`，可见 `请输入岗位名称` + `JD 至少 20 字` ✓
  - **上传 `tables.docx`**（mammoth fixture，60 字符过 50 阈值）→ `已解析` 状态出现 ✓
  - **切 aggressive radio + 合规提交** → 跳转 `http://localhost:3000/interview` ✓
  - **sessionStorage `tailor:form`** 6 字段齐全：jobTitle=`前端工程师` / jd len=63 / resumeText len=60 / resumeRef=`4aa38004-...` / resumeFilename=`tables.docx` / mode=`aggressive` ✓
  - **console.log 命中**：`[FORM] resumeText length: 60` ✓
  - **375x667 / 393x851 移动视口**：`scrollWidth === clientWidth`，无横向滚动 ✓（视觉精修留 Step 20-21）
- **dev server 已关闭**（PID 20968 by Stop-Process）
- **dev 启动小坑**：第一次启 dev 时撞到上次 Step 2 残留的 dev server (PID 10232) — 该残留进程已损坏（Turbopack 编译 globals.css 时 node 子进程崩 0xc0000142），强杀 + 删 `.next` 重启后恢复正常
- **未做**：iOS / Android 真机 —— plan 明确这步开发阶段先 PC 跑通，真机留 Step 26

## Step 2 备注

- **route.ts 整体复制**：从 `D:\career-report\app\api\resume\parse\route.ts` → `D:\workspace\01_项目-Coding\resume-tailor\app\api\resume\parse\route.ts`，167 行，`diff -bw` 内容 100% 一致（仅行尾 CRLF→LF），保留 E2E_MOCK_MODE 兜底
- **类型依赖**：route.ts 完全自含，仅依赖 `next/server` + `fs` / `path` / `crypto` 内置模块，**不需要复制 lib/types.ts**
- **目录**：创建 `data/temp/` + `.gitkeep`，`.gitignore` 改为 `data/temp/*` + `!data/temp/.gitkeep`
- **next build**：通过（2.2s 编译，TS 1925ms，新路由 `ƒ /api/resume/parse` 标为 dynamic）
- **PC 端 curl 验证**（dev server `http://localhost:3000`）：
  - **DOCX 200**：用 `node_modules/mammoth/test/test-data/tables.docx` → `{text:"Above\n\nTop left\n\nTop right...", charCount:60, resumeRef:<uuid>, resumeFilename:"tables.docx"}` HTTP 200
  - **PDF 200**：用 reportlab 生成的 `D:\tmp\test-resume.pdf`（Jane Doe 模拟简历，1882 字节）→ `{text:"Jane Doe - Software Engineer\nEmail:...", charCount:546, ...}` HTTP 200
  - **400 无文件**：空 multipart `-F "x=y"` → `{"error":"未检测到上传文件"}` HTTP 400 ✓
  - **415 .doc 老版**：fake `.doc` 文件 → `{"error":"暂不支持老版 .doc 格式..."}` HTTP 415 ✓
  - **422 文件过短**：`single-paragraph.docx`（mammoth 测试 fixture，<50 字符）→ `{"error":"无法从文件中提取到足够内容..."}` HTTP 422 ✓
  - 临时文件确认写入 `data/temp/<uuid>/<filename>`，验证后已清理
- **dev server** 已关闭（TaskStop bpc6iu5wn）
- **未做**：iOS / Android 端验证留到 Step 3 form 页接入后做（这一步只验 API 层）
