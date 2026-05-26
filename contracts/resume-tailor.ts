/**
 * resume-tailor 报告数据契约。
 *
 * 「对外发布」的报告 JSON / 表单字段定义。下游项目（admin-hub）
 * 通过 sync 命令拉取，不再手抄 type。
 *
 * 上游约束：
 * - 改 / 删 / 重命名任何字段 = 破坏契约，必须：
 *   1. 同步改运行时代码（含 Zod schema）
 *   2. 通知下游消费者（目前是 admin-hub）
 *   3. 下游运行 sync 命令（admin-hub: `npm run sync-contracts tailor`）
 * - 加字段（向后兼容）= 不破坏契约，下游下次 sync 时自动拿到
 *
 * 注：resume-tailor 项目本身用 Zod schema 做入口校验；这份契约文件
 * 是「报告渲染需要的纯类型」，不含 Zod。改 Zod 时必须同步改这里。
 */

export type TailorMode = "moderate" | "aggressive";

export interface TailorFormData {
  jobTitle: string;
  jd: string;
  resumeFilename?: string;
  mode: TailorMode;
}

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

export interface ResumeBasics {
  name: string;
  label?: string;
  email?: string;
  phone?: string;
  summary?: string;
  birthday?: string;
  yearsOfExperience?: string;
  hometown?: string;
}

export interface ResumeWork {
  name: string;
  position: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
  location?: string;
}

export interface ResumeEducation {
  institution: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
}

export interface ResumeSkill {
  name: string;
  level?: string;
  keywords?: string[];
}

export interface ResumeProject {
  name: string;
  description?: string;
  highlights?: string[];
  startDate?: string;
  endDate?: string;
}

export interface ResumeJSON {
  basics: ResumeBasics;
  work?: ResumeWork[];
  education?: ResumeEducation[];
  skills?: ResumeSkill[];
  projects?: ResumeProject[];
  [key: string]: unknown;
}

export interface TailorReport {
  suggestions: TailorSuggestion[];
  interview: TailorInterviewQuestion[];
  resume: ResumeJSON;
  changes: DiffChange[];
  fallback?: boolean;
}
