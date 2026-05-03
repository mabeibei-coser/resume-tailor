/**
 * Step 17 · DOCX Builder
 *
 * 把 ResumeJSON 渲染成 .docx 文档（docx v9.6.1），输出 Buffer 供 API 流式下载。
 *
 * 排版规范（plan v3.2）：
 * - 大标题（人名）：SimHei 16pt，居中
 * - 二级标题（"工作经历" / "教育背景" / "项目经验" / "技能"）：SimHei 14pt
 * - 公司+岗位 / 学校+专业 / 项目名：SimHei 12pt
 * - 正文 / bullet：SimSun 11pt
 * - 段落间距：标题前 6pt，段落间 4pt
 * - 页边距：上下 20mm，左右 25mm
 *
 * docx v9 API 关键点：
 * - size 用半点（16pt = 32, 14pt = 28, 12pt = 24, 11pt = 22）
 * - before / after spacing 用二十分之一点（6pt = 120, 4pt = 80）
 * - font 字段是 IFontAttributesProperties（ascii / cs / eastAsia / hAnsi / hint）
 * - bullet 用 paragraph 的 `bullet: { level: 0 }`
 */

import { Buffer } from "node:buffer";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  TabStopPosition,
  type ParagraphChild,
} from "docx";

import type {
  ResumeJSON,
  ResumeBasics,
  ResumeWork,
  ResumeEducation,
  ResumeSkill,
  ResumeProject,
} from "./types";

// ——————————————————————————
// 字体常量
// ——————————————————————————

const SIM_HEI = {
  ascii: "SimHei",
  cs: "SimHei",
  eastAsia: "SimHei",
  hAnsi: "SimHei",
} as const;

const SIM_SUN = {
  ascii: "SimSun",
  cs: "SimSun",
  eastAsia: "SimSun",
  hAnsi: "SimSun",
} as const;

// 字号（半点）
const SIZE_NAME = 32;       // 16pt - 姓名
const SIZE_SECTION = 28;    // 14pt - 二级标题
const SIZE_ITEM = 24;       // 12pt - 公司 / 学校 / 项目
const SIZE_BODY = 22;       // 11pt - 正文 / bullet

// 段落间距（1/20 pt）
const SPACING_BEFORE_SECTION = 240; // 12pt - 二级标题前留白多一点
const SPACING_BEFORE_TITLE = 120;   // 6pt
const SPACING_AFTER_PARA = 80;      // 4pt

// ——————————————————————————
// 工具函数
// ——————————————————————————

function fmtDateRange(start?: string, end?: string): string {
  const s = (start ?? "").trim();
  const e = (end ?? "").trim();
  if (!s && !e) return "";
  if (!e) return `${s} - 至今`;
  if (!s) return e;
  return `${s} - ${e}`;
}

function nonEmpty(s: string | undefined): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

// 中文正文 Run（SimSun 11pt）
function bodyRun(text: string, opts: { bold?: boolean } = {}): TextRun {
  return new TextRun({
    text,
    font: SIM_SUN,
    size: SIZE_BODY,
    bold: opts.bold,
  });
}

// 黑体小标题 Run（SimHei 12pt）
function itemRun(text: string, opts: { size?: number } = {}): TextRun {
  return new TextRun({
    text,
    font: SIM_HEI,
    size: opts.size ?? SIZE_ITEM,
    bold: true,
  });
}

// ——————————————————————————
// Section: basics
// ——————————————————————————

export function buildBasicsSection(basics: ResumeBasics): Paragraph[] {
  const out: Paragraph[] = [];

  // 姓名 - 大标题，居中
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: SPACING_AFTER_PARA },
      children: [
        new TextRun({
          text: basics.name,
          font: SIM_HEI,
          size: SIZE_NAME,
          bold: true,
        }),
      ],
    }),
  );

  // label（一句话定位）
  if (nonEmpty(basics.label)) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: SPACING_AFTER_PARA },
        children: [bodyRun(basics.label)],
      }),
    );
  }

  // 联系方式（一行：电话 | 邮箱 | url）
  const contactParts: string[] = [];
  if (nonEmpty(basics.phone)) contactParts.push(basics.phone);
  if (nonEmpty(basics.email)) contactParts.push(basics.email);
  if (nonEmpty(basics.url)) contactParts.push(basics.url);
  // location.city 也并入联系方式行
  const city = basics.location?.city;
  if (nonEmpty(city)) contactParts.push(city);

  if (contactParts.length > 0) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: SPACING_AFTER_PARA },
        children: [bodyRun(contactParts.join(" | "))],
      }),
    );
  }

  // summary 段落
  if (nonEmpty(basics.summary)) {
    out.push(...buildSectionTitle("个人简介"));
    out.push(
      new Paragraph({
        spacing: { after: SPACING_AFTER_PARA },
        children: [bodyRun(basics.summary)],
      }),
    );
  }

  return out;
}

// ——————————————————————————
// 二级标题（工作经历 / 教育背景 / ...）
// ——————————————————————————

function buildSectionTitle(text: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: SPACING_BEFORE_SECTION, after: SPACING_AFTER_PARA },
      children: [
        new TextRun({
          text,
          font: SIM_HEI,
          size: SIZE_SECTION,
          bold: true,
        }),
      ],
    }),
  ];
}

// ——————————————————————————
// Section: work
// ——————————————————————————

export function buildWorkSection(work: ResumeWork[] | undefined): Paragraph[] {
  if (!work || work.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("工作经历"));

  for (const w of work) {
    // 公司+岗位（左）+ 日期（右），用 tab stop 实现两端对齐
    const companyText = nonEmpty(w.position) ? `${w.name} · ${w.position}` : w.name;
    const dateText = fmtDateRange(w.startDate, w.endDate);

    const headerChildren: ParagraphChild[] = [itemRun(companyText)];
    if (dateText) {
      headerChildren.push(new TextRun({ text: "\t", font: SIM_SUN, size: SIZE_BODY }));
      headerChildren.push(bodyRun(dateText));
    }
    if (nonEmpty(w.location)) {
      headerChildren.push(bodyRun(`  ${w.location}`));
    }

    out.push(
      new Paragraph({
        spacing: { before: SPACING_BEFORE_TITLE, after: SPACING_AFTER_PARA },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: headerChildren,
      }),
    );

    // summary 段落
    if (nonEmpty(w.summary)) {
      out.push(
        new Paragraph({
          spacing: { after: SPACING_AFTER_PARA },
          children: [bodyRun(w.summary)],
        }),
      );
    }

    // highlights bullets
    if (w.highlights && w.highlights.length > 0) {
      for (const h of w.highlights) {
        if (!nonEmpty(h)) continue;
        out.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: SPACING_AFTER_PARA },
            children: [bodyRun(h)],
          }),
        );
      }
    }
  }

  return out;
}

// ——————————————————————————
// Section: education
// ——————————————————————————

export function buildEducationSection(
  education: ResumeEducation[] | undefined,
): Paragraph[] {
  if (!education || education.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("教育背景"));

  for (const e of education) {
    // 学校+学历（左）+ 日期（右）
    const studyType = nonEmpty(e.studyType) ? e.studyType : "";
    const head = studyType ? `${e.institution} · ${studyType}` : e.institution;
    const dateText = fmtDateRange(e.startDate, e.endDate);

    const headerChildren: ParagraphChild[] = [itemRun(head)];
    if (dateText) {
      headerChildren.push(new TextRun({ text: "\t", font: SIM_SUN, size: SIZE_BODY }));
      headerChildren.push(bodyRun(dateText));
    }

    out.push(
      new Paragraph({
        spacing: { before: SPACING_BEFORE_TITLE, after: SPACING_AFTER_PARA },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: headerChildren,
      }),
    );

    // 专业 / GPA
    const detailParts: string[] = [];
    if (nonEmpty(e.area)) detailParts.push(`专业：${e.area}`);
    if (nonEmpty(e.score)) detailParts.push(`GPA / 排名：${e.score}`);
    if (detailParts.length > 0) {
      out.push(
        new Paragraph({
          spacing: { after: SPACING_AFTER_PARA },
          children: [bodyRun(detailParts.join("    "))],
        }),
      );
    }

    // courses
    if (e.courses && e.courses.length > 0) {
      const validCourses = e.courses.filter(nonEmpty);
      if (validCourses.length > 0) {
        out.push(
          new Paragraph({
            spacing: { after: SPACING_AFTER_PARA },
            children: [bodyRun(`相关课程：${validCourses.join("、")}`)],
          }),
        );
      }
    }
  }

  return out;
}

// ——————————————————————————
// Section: projects
// ——————————————————————————

export function buildProjectsSection(
  projects: ResumeProject[] | undefined,
): Paragraph[] {
  if (!projects || projects.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("项目经验"));

  for (const p of projects) {
    const dateText = fmtDateRange(p.startDate, p.endDate);

    const headerChildren: ParagraphChild[] = [itemRun(p.name)];
    if (dateText) {
      headerChildren.push(new TextRun({ text: "\t", font: SIM_SUN, size: SIZE_BODY }));
      headerChildren.push(bodyRun(dateText));
    }

    out.push(
      new Paragraph({
        spacing: { before: SPACING_BEFORE_TITLE, after: SPACING_AFTER_PARA },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: headerChildren,
      }),
    );

    // entity / roles 一行（如有）
    const subParts: string[] = [];
    if (nonEmpty(p.entity)) subParts.push(p.entity);
    if (p.roles && p.roles.length > 0) {
      const validRoles = p.roles.filter(nonEmpty);
      if (validRoles.length > 0) subParts.push(validRoles.join(" / "));
    }
    if (subParts.length > 0) {
      out.push(
        new Paragraph({
          spacing: { after: SPACING_AFTER_PARA },
          children: [bodyRun(subParts.join("  "))],
        }),
      );
    }

    // description
    if (nonEmpty(p.description)) {
      out.push(
        new Paragraph({
          spacing: { after: SPACING_AFTER_PARA },
          children: [bodyRun(p.description)],
        }),
      );
    }

    // highlights bullets
    if (p.highlights && p.highlights.length > 0) {
      for (const h of p.highlights) {
        if (!nonEmpty(h)) continue;
        out.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: SPACING_AFTER_PARA },
            children: [bodyRun(h)],
          }),
        );
      }
    }

    // keywords
    if (p.keywords && p.keywords.length > 0) {
      const validKw = p.keywords.filter(nonEmpty);
      if (validKw.length > 0) {
        out.push(
          new Paragraph({
            spacing: { after: SPACING_AFTER_PARA },
            children: [bodyRun(`技术关键词：${validKw.join("、")}`)],
          }),
        );
      }
    }
  }

  return out;
}

// ——————————————————————————
// Section: skills
// ——————————————————————————

export function buildSkillsSection(
  skills: ResumeSkill[] | undefined,
): Paragraph[] {
  if (!skills || skills.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("技能"));

  for (const s of skills) {
    const kw = (s.keywords ?? []).filter(nonEmpty);
    const level = nonEmpty(s.level) ? `（${s.level}）` : "";
    const tail = kw.length > 0 ? `：${kw.join("、")}` : "";
    out.push(
      new Paragraph({
        spacing: { after: SPACING_AFTER_PARA },
        children: [
          itemRun(`${s.name}${level}`),
          bodyRun(tail),
        ],
      }),
    );
  }

  return out;
}

// ——————————————————————————
// Section: volunteer / awards / certifications / languages
// ——————————————————————————

export function buildVolunteerSection(
  resume: ResumeJSON,
): Paragraph[] {
  const items = resume.volunteer;
  if (!items || items.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("志愿者经历"));

  for (const v of items) {
    const head = nonEmpty(v.position) ? `${v.organization} · ${v.position}` : v.organization;
    const dateText = fmtDateRange(v.startDate, v.endDate);
    const headerChildren: ParagraphChild[] = [itemRun(head)];
    if (dateText) {
      headerChildren.push(new TextRun({ text: "\t", font: SIM_SUN, size: SIZE_BODY }));
      headerChildren.push(bodyRun(dateText));
    }

    out.push(
      new Paragraph({
        spacing: { before: SPACING_BEFORE_TITLE, after: SPACING_AFTER_PARA },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: headerChildren,
      }),
    );

    if (nonEmpty(v.summary)) {
      out.push(
        new Paragraph({
          spacing: { after: SPACING_AFTER_PARA },
          children: [bodyRun(v.summary)],
        }),
      );
    }

    if (v.highlights && v.highlights.length > 0) {
      for (const h of v.highlights) {
        if (!nonEmpty(h)) continue;
        out.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: SPACING_AFTER_PARA },
            children: [bodyRun(h)],
          }),
        );
      }
    }
  }

  return out;
}

export function buildAwardsSection(resume: ResumeJSON): Paragraph[] {
  const items = resume.awards;
  if (!items || items.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("荣誉奖项"));

  for (const a of items) {
    const parts: string[] = [];
    if (nonEmpty(a.awarder)) parts.push(a.awarder);
    if (nonEmpty(a.date)) parts.push(a.date);
    const tail = parts.length > 0 ? `（${parts.join(" · ")}）` : "";
    const children: ParagraphChild[] = [itemRun(a.title), bodyRun(tail)];

    out.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: SPACING_AFTER_PARA },
        children,
      }),
    );

    if (nonEmpty(a.summary)) {
      out.push(
        new Paragraph({
          spacing: { after: SPACING_AFTER_PARA },
          children: [bodyRun(a.summary)],
        }),
      );
    }
  }

  return out;
}

export function buildCertificationsSection(resume: ResumeJSON): Paragraph[] {
  const items = resume.certifications;
  if (!items || items.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("证书"));

  for (const c of items) {
    const parts: string[] = [];
    if (nonEmpty(c.issuer)) parts.push(c.issuer);
    if (nonEmpty(c.date)) parts.push(c.date);
    const tail = parts.length > 0 ? `（${parts.join(" · ")}）` : "";
    out.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: SPACING_AFTER_PARA },
        children: [itemRun(c.name), bodyRun(tail)],
      }),
    );
  }

  return out;
}

export function buildLanguagesSection(resume: ResumeJSON): Paragraph[] {
  const items = resume.languages;
  if (!items || items.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("语言"));

  const line = items
    .filter((l) => nonEmpty(l.language))
    .map((l) => (nonEmpty(l.fluency) ? `${l.language}（${l.fluency}）` : l.language))
    .join("    ");

  if (line) {
    out.push(
      new Paragraph({
        spacing: { after: SPACING_AFTER_PARA },
        children: [bodyRun(line)],
      }),
    );
  }

  return out;
}

// ——————————————————————————
// 主入口
// ——————————————————————————

export async function buildResumeDocx(resume: ResumeJSON): Promise<Buffer> {
  const children: Paragraph[] = [
    ...buildBasicsSection(resume.basics),
    ...buildWorkSection(resume.work),
    ...buildEducationSection(resume.education),
    ...buildProjectsSection(resume.projects),
    ...buildSkillsSection(resume.skills),
    ...buildVolunteerSection(resume),
    ...buildAwardsSection(resume),
    ...buildCertificationsSection(resume),
    ...buildLanguagesSection(resume),
  ];

  const doc = new Document({
    creator: "resume-tailor",
    title: resume.basics.name ? `${resume.basics.name} - 简历` : "简历",
    // 全文档默认字体
    styles: {
      default: {
        document: {
          run: {
            font: SIM_SUN,
            size: SIZE_BODY,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              // 1 mm = 56.7 twips；上下 20mm ≈ 1134；左右 25mm ≈ 1418
              top: "20mm",
              bottom: "20mm",
              left: "25mm",
              right: "25mm",
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
