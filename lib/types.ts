// resume-tailor 项目专用类型
// 后续步骤会继续扩展（JSON Resume schema 完整化等）

import { z } from "zod";

// ==========================================================================
// career-report 共享类型（Step 7 复制 interview/question + report-shared 时
// 顺手把它们用到的类型搬过来；保持原始字段名以便 lib 文件一字不改）
// ==========================================================================

export interface JobFormData {
  targetPosition: string;
  targetEducation: string;
  targetCompany: string;
  targetCityTier: string;
  resumeText?: string;
  resumeFileName?: string;
}

export type QuizDimension = "E-I" | "S-N" | "T-F" | "J-P" | "risk" | "value";

export interface QuizAnswer {
  questionId: string;
  dimension: QuizDimension;
  selectedKey: "A" | "B" | "C" | "D";
  questionText: string;
  selectedLabel: string;
}

export interface InterviewTurn {
  index: 0 | 1;
  questionText: string;
  userAnswerText: string;
  inputMethod: "voice" | "text";
  audioDurationSec?: number;
}

export interface InterviewData {
  turns: InterviewTurn[];
  summary: string;
  skipped: boolean;
  generatedAt: string;
}

// ==========================================================================
// resume-tailor 自身类型
// ==========================================================================

export type TailorMode = "moderate" | "aggressive";

export interface TailorFormData {
  jobTitle: string;
  jd: string;
  resumeText: string;
  resumeRef?: string;
  resumeFilename?: string;
  mode: TailorMode;
  parsedResume?: ResumeJSON;
}

// ——————————————————————————
// Step 4 / Step 10 · analyze 输出
// ——————————————————————————

export interface TailorSuggestion {
  title: string;
  problem: string;
  action: string;
  example: string;
}

export interface TailorInterviewQuestion {
  question: string;
  why: string;
  sampleAnswer: string;
  keypoints: string[];
}

export interface TailorAnalyzeResult {
  suggestions: TailorSuggestion[];
  interview: TailorInterviewQuestion[];
  /** Step 24：双 LLM 兜底标记。true 表示走的是静态 mock，前端可据此提示「降级模式」 */
  fallback?: boolean;
}

// ——————————————————————————
// Step 4 / Step 13 · rewrite 输出
// ——————————————————————————

export type DiffAction = "replace" | "append" | "delete";

export interface DiffChange {
  path: string;
  action: DiffAction;
  oldText?: string;
  newText: string;
  reason: string;
  flagged?: boolean;
  flagReason?: string;
}

// ——————————————————————————
// JSON Resume 标准 schema（参考 jsonresume.org）
// Wave 1 共享依赖：Step 12 Parser / Step 14 Validator / Step 16 Applier / Step 17 DOCX 共用
// 字段对齐 reactive-resume（36.6k Stars）使用的 JSON Resume 标准
// ——————————————————————————

export const ResumeBasicsSchema = z.object({
  name: z.string(),
  label: z.string().optional(), // 当前职位 / 一句话定位 = 求职意向
  email: z.string().optional(),
  phone: z.string().optional(),
  url: z.string().optional(),
  summary: z.string().optional(), // 自我介绍 / 求职意向段落
  // 模板需要的扩展字段（身份相关，不允许 AI 改）
  birthday: z.string().optional(),          // 1997.2.18 / 1997-02
  yearsOfExperience: z.string().optional(), // 5 年 / 5+ years
  hometown: z.string().optional(),          // 籍贯（广东广州）
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    countryCode: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  profiles: z.array(z.object({
    network: z.string(),
    username: z.string(),
    url: z.string().optional(),
  })).optional(),
});

export const ResumeWorkSchema = z.object({
  name: z.string(), // 公司名
  position: z.string(), // 岗位
  startDate: z.string().optional(), // YYYY-MM 或 YYYY-MM-DD
  endDate: z.string().optional(),
  url: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(), // bullet points
  location: z.string().optional(),
});

export const ResumeEducationSchema = z.object({
  institution: z.string(),
  url: z.string().optional(),
  area: z.string().optional(), // 专业
  studyType: z.string().optional(), // 学历层次（本科 / 硕士 / 博士）
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  score: z.string().optional(), // GPA / 排名
  courses: z.array(z.string()).optional(),
});

export const ResumeSkillSchema = z.object({
  name: z.string(),
  level: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

export const ResumeProjectSchema = z.object({
  name: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  url: z.string().optional(),
  roles: z.array(z.string()).optional(),
  entity: z.string().optional(),
  type: z.string().optional(),
});

export const ResumeVolunteerSchema = z.object({
  organization: z.string(),
  position: z.string(),
  url: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

export const ResumeAwardSchema = z.object({
  title: z.string(),
  date: z.string().optional(),
  awarder: z.string().optional(),
  summary: z.string().optional(),
});

export const ResumeCertificationSchema = z.object({
  name: z.string(),
  date: z.string().optional(),
  issuer: z.string().optional(),
  url: z.string().optional(),
});

export const ResumeLanguageSchema = z.object({
  language: z.string(),
  fluency: z.string().optional(),
});

export const ResumeJSONSchema = z.object({
  basics: ResumeBasicsSchema,
  work: z.array(ResumeWorkSchema).optional(),
  education: z.array(ResumeEducationSchema).optional(),
  skills: z.array(ResumeSkillSchema).optional(),
  projects: z.array(ResumeProjectSchema).optional(),
  volunteer: z.array(ResumeVolunteerSchema).optional(),
  awards: z.array(ResumeAwardSchema).optional(),
  certifications: z.array(ResumeCertificationSchema).optional(),
  languages: z.array(ResumeLanguageSchema).optional(),
});

export type ResumeJSON = z.infer<typeof ResumeJSONSchema>;
export type ResumeBasics = z.infer<typeof ResumeBasicsSchema>;
export type ResumeWork = z.infer<typeof ResumeWorkSchema>;
export type ResumeEducation = z.infer<typeof ResumeEducationSchema>;
export type ResumeSkill = z.infer<typeof ResumeSkillSchema>;
export type ResumeProject = z.infer<typeof ResumeProjectSchema>;

// 路径白名单（Diff Validator 用 / Step 14）
// 禁止改的字段：身份相关，AI 不应越权
export const RESUME_PATH_FORBIDDEN_PATTERNS = [
  /^basics\.name$/,
  /^basics\.birthday$/,
  /^basics\.hometown$/,
  /^basics\.yearsOfExperience$/,
  /^work\[\d+\]\.name$/,       // 公司名
  /^work\[\d+\]\.position$/,   // 历史岗位
  /^work\[\d+\]\.startDate$/,
  /^work\[\d+\]\.endDate$/,
  /^education\[\d+\]\.institution$/,
  /^education\[\d+\]\.area$/,
  /^education\[\d+\]\.studyType$/,
  /^education\[\d+\]\.startDate$/,
  /^education\[\d+\]\.endDate$/,
];

// ——————————————————————————
// rewrite 输出（用上面的 ResumeJSON 类型）
// ——————————————————————————

export interface TailorRewriteResult {
  resume: ResumeJSON;
  changes: DiffChange[];
  /** Step 24：双 LLM 兜底标记。true 表示 changes 是静态 mock，前端可据此提示「降级模式」 */
  fallback?: boolean;
}

// ——————————————————————————
// 最终聚合（loading 页消费）
// ——————————————————————————

export interface TailorReport {
  suggestions: TailorSuggestion[];
  interview: TailorInterviewQuestion[];
  resume: ResumeJSON;
  changes: DiffChange[];
  /** Step 24：任一上游接口（analyze 或 rewrite）走兜底时为 true */
  fallback?: boolean;
}
