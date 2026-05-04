/**
 * DOCX Builder · docxtemplater 模板渲染主路径 + 旧版代码硬画 fallback
 *
 * 模板：lib/templates/resume-template.docx（由 scripts/generate-template.mjs 生成）
 * 渲染失败（占位符不匹配 / 模板缺失 / 任何 docxtemplater 异常）→ 自动回落到 docx-builder-legacy
 *
 * 公共入口签名 buildResumeDocx(resume): Promise<Buffer> 与 legacy 一致，
 * 路由 / 测试 不需要改任何调用方。
 */

import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

import type { ResumeJSON } from "./types";
import { buildResumeDocx as buildResumeDocxLegacy } from "./docx-builder-legacy";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "lib",
  "templates",
  "resume-template.docx",
);

let cachedTemplate: Buffer | null = null;

function loadTemplate(): Buffer {
  if (!cachedTemplate) {
    cachedTemplate = fs.readFileSync(TEMPLATE_PATH);
  }
  return cachedTemplate;
}

// ——————————————————————————
// viewModel：把 ResumeJSON 转成模板友好的形状
//   - highlights: string[] → Array<{displayIndex, text}>（模板用 {displayIndex}. {text}）
//   - keywords: string[] → keywords_str: "kw1、kw2、kw3"（用 {#keywords_str}…{/keywords_str} 条件渲染）
//   - skill.level: string → level_str: "（熟练）"（含括号；空字符串则模板跳过）
//   - certs/awards 把 issuer/awarder + date 拼成 tail
// ——————————————————————————

function nonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function indexedHighlights(items: unknown): Array<{ displayIndex: number; text: string }> {
  if (!Array.isArray(items)) return [];
  return items
    .filter((s): s is string => nonEmpty(s))
    .map((text, i) => ({ displayIndex: i + 1, text }));
}

function joinKeywords(items: unknown): string {
  if (!Array.isArray(items)) return "";
  const list = items.filter(nonEmpty);
  return list.length > 0 ? list.join("、") : "";
}

function joinTail(parts: Array<string | undefined>): string {
  const valid = parts.filter(nonEmpty);
  return valid.length > 0 ? valid.join(" · ") : "";
}

function fmtDateRange(start?: string, end?: string): { startDate: string; endDate: string } {
  const s = (start ?? "").trim();
  const e = (end ?? "").trim();
  return {
    startDate: s,
    endDate: e || (s ? "至今" : ""),
  };
}

function buildViewModel(resume: ResumeJSON): Record<string, unknown> {
  return {
    basics: resume.basics ?? { name: "" },

    education: (resume.education ?? []).map((e) => ({
      ...fmtDateRange(e.startDate, e.endDate),
      institution: e.institution ?? "",
      area: e.area ?? "",
      studyType: e.studyType ?? "",
      score: e.score ?? "",
    })),

    work: (resume.work ?? []).map((w) => ({
      ...fmtDateRange(w.startDate, w.endDate),
      name: w.name ?? "",
      position: w.position ?? "",
      summary: w.summary ?? "",
      highlights: indexedHighlights(w.highlights),
    })),

    projects: (resume.projects ?? []).map((p) => ({
      ...fmtDateRange(p.startDate, p.endDate),
      name: p.name ?? "",
      description: p.description ?? "",
      roles: Array.isArray(p.roles) ? p.roles.filter(nonEmpty) : [],
      highlights: indexedHighlights(p.highlights),
      keywords_str: joinKeywords(p.keywords),
    })),

    skills: (resume.skills ?? []).map((s) => ({
      name: s.name ?? "",
      level_str: nonEmpty(s.level) ? `（${s.level}）` : "",
      keywords_str: joinKeywords(s.keywords),
    })),

    languages: (resume.languages ?? []).map((l) => ({
      language: l.language ?? "",
      fluency: l.fluency ?? "",
    })),

    certifications: (resume.certifications ?? []).map((c) => ({
      name: c.name ?? "",
      tail: joinTail([c.issuer, c.date]),
    })),

    awards: (resume.awards ?? []).map((a) => ({
      title: a.title ?? "",
      tail: joinTail([a.awarder, a.date]),
    })),

    volunteer: (resume.volunteer ?? []).map((v) => ({
      ...fmtDateRange(v.startDate, v.endDate),
      organization: v.organization ?? "",
      position: v.position ?? "",
      summary: v.summary ?? "",
      highlights: indexedHighlights(v.highlights),
    })),
  };
}

// ——————————————————————————
// docxtemplater 渲染主路径
// ——————————————————————————

async function renderFromTemplate(resume: ResumeJSON): Promise<Buffer> {
  const tplBuf = loadTemplate();
  const zip = new PizZip(tplBuf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // 模板里允许字段缺失（用 {#x}{.}{/x} 条件跳过）；任何兜底解析都返回空串而非 "undefined"
    nullGetter: () => "",
  });
  doc.render(buildViewModel(resume));
  const out = doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
  return out;
}

// ——————————————————————————
// 公共入口（保留旧签名）
// ——————————————————————————

export async function buildResumeDocx(resume: ResumeJSON): Promise<Buffer> {
  try {
    return await renderFromTemplate(resume);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[docx-builder] template render failed → fallback to legacy: ${msg}`);
    return buildResumeDocxLegacy(resume);
  }
}
