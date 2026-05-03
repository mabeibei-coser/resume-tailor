# Resume-Tailor 设计 Token（来自 career-report）

> 给 Step 20（Form 设计）/ Step 22（Report 设计）的 frontend-design skill 用的视觉规范。
> 全套 token 已在 `app/globals.css` 落地，可直接 `var(--token)` 使用。
> 视觉语言：**克制现代、温润亮色、低饱和高对比、动效细腻**。

---

## 色系（已写入 globals.css）

色彩空间用 OKLCH（感知均匀，方便调阶梯）。主色系是「品牌深蓝」+ 配套灰底。

### 主色 / 状态色
| Token | 值 | 用途 |
|---|---|---|
| `--primary` | `oklch(0.45 0.18 250)` | 主按钮、链接、聚焦边框 |
| `--primary-foreground` | `oklch(0.99 0 0)` | 主按钮文字（接近纯白） |
| `--background` | `oklch(0.985 0.002 240)` | 页面底色（极浅冷灰） |
| `--foreground` | `oklch(0.17 0.02 250)` | 正文（接近 #1a1f2e） |
| `--card` | `oklch(1 0 0)` | 卡片纯白底 |
| `--muted-foreground` | `oklch(0.5 0.02 250)` | 次要文字 |
| `--border` | `oklch(0.91 0.01 240)` | 描边 / 分隔线 |
| `--ring` | `oklch(0.55 0.15 250)` | input focus 描边 |
| `--destructive` | `oklch(0.577 0.245 27.325)` | 红 / 错误 |

### 品牌蓝阶梯（Resume-Tailor 主调色板）
```
--blue-50:  oklch(0.97 0.01 238)   极浅底，hover bg / chip bg
--blue-100: oklch(0.93 0.03 238)   渐变底
--blue-200: oklch(0.85 0.07 238)   chip border / 浅描边
--blue-300: oklch(0.75 0.12 240)   引用条 / 装饰
--blue-400: oklch(0.65 0.16 245)   小图标 / hover
--blue-500: oklch(0.55 0.18 250)   主蓝（KPI 数字、进度条主色、链接）
--blue-600: oklch(0.46 0.19 252)   按钮 hover、强调标题
--blue-700: oklch(0.38 0.20 255)   深蓝（少量点缀）
```

### 深蓝阶梯（用于次级文字）
```
--navy-600: oklch(0.42 0.16 250)   导航返回链接
--navy-700: oklch(0.35 0.12 250)   chip 文字 / 强调正文
--navy-800: oklch(0.28 0.08 250)   takeaway 框文字
--navy-900: oklch(0.22 0.06 252)
--navy-950: oklch(0.18 0.04 255)
```

### 语义色（红绿蓝 / flagged 用）
```
--semantic-positive: oklch(0.55 0.15 155)   绿 → 改进项 / 通过
--semantic-warning:  oklch(0.62 0.14 55)    黄 → flagged（diff 编辑）
--semantic-danger:   oklch(0.55 0.20 25)    红 → 危险 / 删除
```
**用法**：Report 页的 diff list 中 `flagged: true` 的条目用 warning 色；通过 / 接受用 positive；用户拒绝 / 危险动作用 danger。

### 暗色模式
当前 `.dark` 已在 globals.css 定义，但 resume-tailor V1 **建议先只做亮色模式**。等 V2 再启用。

---

## 字体

| Token | 栈 |
|---|---|
| `--font-sans` | `"PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif` |
| `--font-mono` | `"SF Mono", "Cascadia Code", "Consolas", monospace` |
| `--font-heading` | 同 sans（中文场景不区分） |

**字体源**：全部系统字体。**不需要 Google Fonts / 阿里云字体加载**，零网络成本。

### 字号阶梯
| Tailwind | px | 用途 |
|---|---|---|
| text-[10px] | 10 | 章节小标签（uppercase）|
| text-xs | 12 | 辅助说明、chip |
| text-[13px] | 13 | 引用、提示卡 |
| text-sm | 14 | 正文 / takeaway |
| text-base | 16 | 卡片标题 |
| text-lg | 18 | section 副标题 |
| text-2xl | 24 | 页面 H2 |
| text-3xl | 30 | 页面 H1（移动）|
| `clamp(20px, 3.4vw, 36px)` | 流动 | KPI 大数字 |

### 行高 / 字重
- 正文 `leading-[1.65]`（中文友好）
- 标题 `tracking-tight`（-0.02em 紧凑）
- KPI 数字 `font-weight: 700` + `font-variant-numeric: tabular-nums`

---

## 间距阶梯

Tailwind 默认就够（4 / 8 / 12 / 16 / 24 / 32 / 48 / 64）。固定模式：

- 卡片内边距：移动 `p-4`（16px）/ 桌面 `p-5`-`p-6`（20-24px）
- Section 之间：`mb-10` 或 `gap-8`（32-40px）
- 表单字段间距：`gap-3`（12px）
- 卡片之间：`gap-4`-`gap-6`（16-24px）
- 顶部 gutter：`py-8 sm:py-12`

---

## 圆角

| 元素 | Tailwind | 值 |
|---|---|---|
| 输入框 / 按钮 | `rounded-md` | `0.5rem` |
| 卡片 | `rounded-2xl` | `1.125rem` |
| 大卡片 / 提示框 | `rounded-2xl` 或自定义 16px |
| Chip / Badge | `rounded-full` | 9999px |
| 进度条 | `rounded-full` | 9999px |

`globals.css` 已定义 `--radius: 0.625rem` 基准，并衍生 `--radius-sm/md/lg/xl/2xl/3xl/4xl`。

---

## 动效

### 缓动
**唯一主缓动**：`cubic-bezier(0.22, 1, 0.36, 1)`（出场快、入场柔，类似 Apple 的 ease-out-expo）。
直接在代码里写为：
```ts
const cubicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
```

### 持续时间
- 微交互（hover / focus / chip 切换）：200-300ms
- 页面级 fade-in：450-700ms（含 stagger delay 0.1-0.12s/item）
- 长动画（球、轮播）：2-6s

### Framer Motion 常用 variants
```ts
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: cubicEase },
  }),
};

const scaleReveal = {
  hidden: { opacity: 0, scale: 0.88, y: 20 },
  visible: (i: number) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { delay: 0.4 + i * 0.12, duration: 0.6, ease: cubicEase },
  }),
};
```

### 装饰动画（career-report 已有，可按需复制）
- `aurora-bg` — 极光渐变背景，20s 漂浮
- `pulse-dot` — 数据节点呼吸，3s
- `radar-sweep` — 雷达扫描，6s
- `dash-flow` — 连线流动，1.5s
- `shimmer-text` — 标题闪烁，4s
- `cta-pulse` — 主 CTA 呼吸光环，2.4s
- `hero-grid` — 80px 网格底纹（hero 区）

---

## 组件视觉特征

### 按钮
- **主按钮**：`--primary` 背景 + 白字 + 阴影 `0 4px 20px primary/25`，hover 时阴影扩散到 `0 8px 32px primary/40` + `translateY(-1px)`
- **次按钮**：白底 + `--border` 描边 + 灰字
- **文字按钮**：纯文字（如"返回首页"），hover 时 `text-[var(--navy-800)]`，配箭头 `group-hover:-translate-x-1`

### 输入框
- 默认：`--border` 描边 + 白底
- focus：`--ring` 描边 2px + 微阴影
- 错误态：`--destructive` 描边

### 卡片
- 标准：白底 + `--border` 1px 描边 + `rounded-2xl` + 极轻阴影 `0 1px 2px / 0 2px 8px`
- hover：阴影增强到 `0 6px 20px`
- **glass-card**（首页用）：`backdrop-filter: blur(20px) saturate(1.4)` + 半透明白底 + 内描边
- **spotlight-card**：cursor-tracking 径向高亮（`--spotlight-x` / `--spotlight-y`）

### Chip / Badge（Report 页 diff 标记常用）
- 圆角胶囊 `rounded-full px-2.5 py-0.5 text-xs`
- 三种 tone：
  - `positive`：绿底绿字（接受改动）
  - `warning`：黄底黄字（flagged，需用户确认）
  - `danger`：红底红字（拒绝 / 危险）

### 进度条 / step-indicator
- 高 6px，`--blue-100` 底，`linear-gradient(90deg, --blue-400, --blue-600)` 填充，`rounded-full`
- step-indicator：圆点 + 连线，已完成填实，进行中描边动画

### 提示卡 / takeaway 框
- 左 3px 蓝实线 + `--blue-50` 浅蓝底 + 右上 `rounded-r-lg`
- 14px 字 + `--navy-800` 文字色

### 引用块（report-quote）
- 左 2px 蓝虚线 + 极浅灰底
- mono 字体 + 13px

---

## 已搬到 / 计划搬到 resume-tailor 的视觉资产

> 注：以下资产**部分已搬到 resume-tailor，部分仍在 career-report 原位置**，Step 20/22 实施时按需复制或重写。

| 资产 | career-report 原路径 | 用途 |
|---|---|---|
| AI 球 | `app/interview/_components/ai-orb.tsx` | 简历优化进度 / 状态指示（idle/processing/speaking）|
| 双章节卡片 | `app/loading/page.tsx` | Loading 页等待时双卡 + 轮播 tips |
| 轮播 tips | `app/loading/page.tsx` `RotatingTips` | 长等待降低焦虑 |
| Report 章节 | `components/report/*.tsx` | 章节卡片骨架 |
| FileUpload | `components/ui/file-upload.tsx` | 简历上传组件（PDF/DOCX）|
| StepIndicator | `components/ui/step-indicator.tsx` | 多步表单进度 |
| 装饰背景 | globals.css 中 `.hero-grid` / `.aurora-bg` / 模糊球 | 表单页 / 首页氛围 |

### globals.css 当前状态
- **已复制**（Step 1）：`@theme inline`、`:root` 基础 token、`--blue-*` 全套、`--navy-*` 全套、`--semantic-*`、`.dark`、字体栈、radius
- **未复制**（Step 20/22 按需补）：
  - `--report-ink` / `--report-ink-soft` / `--report-ink-muted` / `--report-border` / `--report-divider`（Report 页 ink token）
  - `.report-shell` / `.report-card` / `.report-kpi` / `.report-chip` / `.report-quote` / `.report-bar` / `.report-divider` / `.report-takeaway`（Report 章节样式）
  - `.hero-grid` / `.aurora-bg` / `.glass-card` / `.btn-glow` / `.spotlight-card` / `.border-beam` / `.text-shimmer` / `.animate-cta-pulse`（首页 / 表单装饰）
  - print 样式（`@page` + `@media print`，PDF 导出时需要）

---

## 风格关键词（一句话）

> **克制现代的蓝色调专业产品 — 低饱和高对比、白底卡片为主、动效细腻、数字感强、无炫技。**

参考定位：Linear / Vercel / Stripe Docs 的克制感 + Apple 设计的细腻动效 + 中文字体的温润。

---

## 给 Step 20（Form 设计）的提示

**目标**：用户上传简历 + 输入 JD + 点"开始优化" → 跳转到 loading。

**视觉重点**：
1. **首屏引导感**：标题 + 一句话副标题（"AI 帮你按 JD 重写简历，30 秒出初稿"），CTA 按钮位置突出（用 `btn-glow` 风格）。
2. **简历上传是主角**：拖拽框做大（min-h-32），未上传时虚线描边，上传后变成"已选 xxx.pdf [更换]"chip 状态。
3. **JD 输入区**：textarea 默认 6 行，`placeholder` 给具体例子（"产品经理，3 年经验，需要数据分析 & SQL"），focus 时蓝色 ring。
4. **背景**：`bg-gradient-to-br from-[var(--blue-50)] via-white to-[var(--blue-100)]` + 两个模糊球 + 可选 hero-grid。
5. **进度感**：右上角放 `StepIndicator`（如果是多步流程）或顶部进度条。

## 给 Step 22（Report 设计）的提示

**目标**：展示 AI 改写后的简历 + diff list + 接受/拒绝交互。

**视觉重点**：
1. **专业感**：用 `.report-shell` 蓝白渐变底 + 白色 `.report-card`，避免装饰过多。
2. **Diff list 可读性**：每条 diff 是一行卡片，左侧 chip 标记 `+ 添加 / ~ 修改 / - 删除`，flagged 项用 warning 黄 chip 提醒。
3. **Side-by-side 视图**：原文 vs 新文，两栏对比，新文用绿色高亮新增片段，删除用删除线 + 红色。
4. **用户操作**：每条 diff 右侧 "接受 / 拒绝" 按钮，操作后 chip 颜色立刻反馈（positive / 灰）。
5. **末尾 CTA**：「下载新简历 PDF」用 `.animate-cta-pulse` 主按钮。
6. **打印 / PDF 模式**：保留 `@media print` 规则，导出时干掉装饰、保留卡片白底 + 边框。
