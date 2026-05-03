/**
 * DOCX Builder — 模板风格：微软雅黑 + 蓝色主题 + 表格头部
 *
 * 对标模板规范：
 * - 字体：微软雅黑（全文）
 * - 主题色：#4874CB（姓名、求职意向、section 标题）
 * - 姓名：22pt，蓝色，加粗
 * - 求职意向：12pt，蓝色，加粗
 * - Section 标题：字间距加宽（教 育 背 景），12pt，加粗
 * - 正文：10.5pt
 * - 工作描述：编号列表（1. 2. 3.）
 * - 页边距：上下 15mm，左右 25mm
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
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  type ParagraphChild,
  type ITableCellBorders,
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
// 字体 & 颜色常量
// ——————————————————————————

const MSYH = {
  ascii: "Microsoft YaHei",
  cs: "Microsoft YaHei",
  eastAsia: "Microsoft YaHei",
  hAnsi: "Microsoft YaHei",
} as const;

const ACCENT_BLUE = "4874CB";

// 字号（半点）
const SIZE_NAME = 44;       // 22pt
const SIZE_LABEL = 24;      // 12pt — 求职意向
const SIZE_SECTION = 24;    // 12pt — section 标题
const SIZE_ITEM = 21;       // 10.5pt — 公司/学校行
const SIZE_BODY = 21;       // 10.5pt — 正文

// 段落间距（1/20 pt）
const SP_BEFORE_SECTION = 200; // 10pt
const SP_AFTER_SECTION = 80;   // 4pt
const SP_BEFORE_ITEM = 100;    // 5pt
const SP_AFTER = 60;           // 3pt

const NO_BORDER: ITableCellBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

// ——————————————————————————
// 工具函数
// ——————————————————————————

function nonEmpty(s: string | undefined): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function fmtDateRange(start?: string, end?: string): string {
  const s = (start ?? "").trim();
  const e = (end ?? "").trim();
  if (!s && !e) return "";
  if (!e) return `${s} - 至今`;
  if (!s) return e;
  return `${s} - ${e}`;
}

function spacedTitle(text: string): string {
  return text.split("").join(" ");
}

function bodyRun(text: string, opts: { bold?: boolean; color?: string } = {}): TextRun {
  return new TextRun({
    text,
    font: MSYH,
    size: SIZE_BODY,
    bold: opts.bold,
    color: opts.color,
  });
}

function itemRun(text: string, opts: { bold?: boolean; color?: string; size?: number } = {}): TextRun {
  return new TextRun({
    text,
    font: MSYH,
    size: opts.size ?? SIZE_ITEM,
    bold: opts.bold ?? true,
    color: opts.color,
  });
}

// ——————————————————————————
// Header: 表格布局（姓名 + 求职意向 + 联系方式）
// ——————————————————————————

function buildHeaderTable(basics: ResumeBasics): Table {
  const contactLines: string[] = [];
  if (nonEmpty(basics.phone)) contactLines.push(`手机：${basics.phone}`);
  if (nonEmpty(basics.email)) contactLines.push(`邮箱：${basics.email}`);
  const city = basics.location?.city;
  if (nonEmpty(city)) contactLines.push(`现居：${city}`);
  if (nonEmpty(basics.url)) contactLines.push(basics.url);

  const labelText = nonEmpty(basics.label) ? `求职意向：${basics.label}` : "";

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          // 左列：姓名
          new TableCell({
            borders: NO_BORDER,
            width: { size: 35, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: basics.name,
                    font: MSYH,
                    size: SIZE_NAME,
                    bold: true,
                    color: ACCENT_BLUE,
                  }),
                ],
              }),
              ...(labelText
                ? [
                    new Paragraph({
                      spacing: { after: 40 },
                      children: [
                        new TextRun({
                          text: labelText,
                          font: MSYH,
                          size: SIZE_LABEL,
                          bold: true,
                          color: ACCENT_BLUE,
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
          // 右列：联系方式
          new TableCell({
            borders: NO_BORDER,
            width: { size: 65, type: WidthType.PERCENTAGE },
            children:
              contactLines.length > 0
                ? contactLines.map(
                    (line) =>
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { after: 30 },
                        children: [bodyRun(line)],
                      }),
                  )
                : [new Paragraph({})],
          }),
        ],
      }),
    ],
  });
}

// ——————————————————————————
// Section 标题（蓝色加粗 + 底部蓝线）
// ——————————————————————————

function buildSectionTitle(text: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: SP_BEFORE_SECTION, after: SP_AFTER_SECTION },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT_BLUE },
      },
      children: [
        new TextRun({
          text: spacedTitle(text),
          font: MSYH,
          size: SIZE_SECTION,
          bold: true,
          color: ACCENT_BLUE,
        }),
      ],
    }),
  ];
}

// ——————————————————————————
// Section: 教育背景
// ——————————————————————————

export function buildEducationSection(
  education: ResumeEducation[] | undefined,
): Paragraph[] {
  if (!education || education.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("教育背景"));

  for (const e of education) {
    const dateText = fmtDateRange(e.startDate, e.endDate);
    const studyType = nonEmpty(e.studyType) ? e.studyType : "";
    const area = nonEmpty(e.area) ? e.area : "";
    const right = [area, studyType].filter(Boolean).join(" / ");

    const headerChildren: ParagraphChild[] = [];
    if (dateText) {
      headerChildren.push(bodyRun(dateText));
      headerChildren.push(bodyRun("    "));
    }
    headerChildren.push(itemRun(e.institution));
    if (right) {
      headerChildren.push(new TextRun({ text: "\t", font: MSYH, size: SIZE_BODY }));
      headerChildren.push(bodyRun(right));
    }

    out.push(
      new Paragraph({
        spacing: { before: SP_BEFORE_ITEM, after: SP_AFTER },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: headerChildren,
      }),
    );

    if (nonEmpty(e.score)) {
      out.push(
        new Paragraph({
          spacing: { after: SP_AFTER },
          children: [bodyRun(`GPA / 排名：${e.score}`)],
        }),
      );
    }

    if (e.courses && e.courses.length > 0) {
      const validCourses = e.courses.filter(nonEmpty);
      if (validCourses.length > 0) {
        out.push(
          new Paragraph({
            spacing: { after: SP_AFTER },
            children: [bodyRun(`相关课程：${validCourses.join("、")}`)],
          }),
        );
      }
    }
  }

  return out;
}

// ——————————————————————————
// Section: 个人优势总结
// ——————————————————————————

function buildSummarySection(summary: string | undefined): Paragraph[] {
  if (!nonEmpty(summary)) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("个人优势总结"));

  const lines = summary
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].replace(/^\d+[.、．]\s*/, "");
    out.push(
      new Paragraph({
        spacing: { after: SP_AFTER },
        children: [bodyRun(`${i + 1}. ${text}`)],
      }),
    );
  }

  return out;
}

// ——————————————————————————
// Section: 工作经历
// ——————————————————————————

export function buildWorkSection(work: ResumeWork[] | undefined): Paragraph[] {
  if (!work || work.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("工作经历"));

  for (const w of work) {
    const dateText = fmtDateRange(w.startDate, w.endDate);
    const position = nonEmpty(w.position) ? w.position : "";

    const headerChildren: ParagraphChild[] = [];
    if (dateText) {
      headerChildren.push(bodyRun(dateText));
      headerChildren.push(bodyRun("    "));
    }
    headerChildren.push(itemRun(w.name));
    if (position) {
      headerChildren.push(new TextRun({ text: "\t", font: MSYH, size: SIZE_BODY }));
      headerChildren.push(itemRun(position));
    }

    out.push(
      new Paragraph({
        spacing: { before: SP_BEFORE_ITEM, after: SP_AFTER },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: headerChildren,
      }),
    );

    if (nonEmpty(w.summary)) {
      out.push(
        new Paragraph({
          spacing: { after: SP_AFTER },
          children: [bodyRun(w.summary)],
        }),
      );
    }

    if (w.highlights && w.highlights.length > 0) {
      const valid = w.highlights.filter(nonEmpty);
      if (valid.length > 0) {
        out.push(
          new Paragraph({
            spacing: { after: SP_AFTER },
            children: [bodyRun("工作描述：", { bold: true })],
          }),
        );
        for (let i = 0; i < valid.length; i++) {
          out.push(
            new Paragraph({
              spacing: { after: SP_AFTER },
              indent: { left: 240 },
              children: [bodyRun(`${i + 1}. ${valid[i]}`)],
            }),
          );
        }
      }
    }
  }

  return out;
}

// ——————————————————————————
// Section: 项目经验
// ——————————————————————————

export function buildProjectsSection(
  projects: ResumeProject[] | undefined,
): Paragraph[] {
  if (!projects || projects.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("项目经验"));

  for (const p of projects) {
    const dateText = fmtDateRange(p.startDate, p.endDate);

    const headerChildren: ParagraphChild[] = [];
    if (dateText) {
      headerChildren.push(bodyRun(dateText));
      headerChildren.push(bodyRun("    "));
    }
    headerChildren.push(itemRun(p.name));

    if (p.roles && p.roles.length > 0) {
      const validRoles = p.roles.filter(nonEmpty);
      if (validRoles.length > 0) {
        headerChildren.push(new TextRun({ text: "\t", font: MSYH, size: SIZE_BODY }));
        headerChildren.push(bodyRun(validRoles.join(" / ")));
      }
    }

    out.push(
      new Paragraph({
        spacing: { before: SP_BEFORE_ITEM, after: SP_AFTER },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: headerChildren,
      }),
    );

    if (nonEmpty(p.entity)) {
      out.push(
        new Paragraph({
          spacing: { after: SP_AFTER },
          children: [bodyRun(p.entity)],
        }),
      );
    }

    if (nonEmpty(p.description)) {
      out.push(
        new Paragraph({
          spacing: { after: SP_AFTER },
          children: [bodyRun(p.description)],
        }),
      );
    }

    if (p.highlights && p.highlights.length > 0) {
      const valid = p.highlights.filter(nonEmpty);
      for (let i = 0; i < valid.length; i++) {
        out.push(
          new Paragraph({
            spacing: { after: SP_AFTER },
            indent: { left: 240 },
            children: [bodyRun(`${i + 1}. ${valid[i]}`)],
          }),
        );
      }
    }

    if (p.keywords && p.keywords.length > 0) {
      const validKw = p.keywords.filter(nonEmpty);
      if (validKw.length > 0) {
        out.push(
          new Paragraph({
            spacing: { after: SP_AFTER },
            children: [bodyRun(`关键词：${validKw.join("、")}`)],
          }),
        );
      }
    }
  }

  return out;
}

// ——————————————————————————
// Section: 技能
// ——————————————————————————

export function buildSkillsSection(
  skills: ResumeSkill[] | undefined,
): Paragraph[] {
  if (!skills || skills.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("专业技能"));

  for (const s of skills) {
    const kw = (Array.isArray(s.keywords) ? s.keywords : []).filter(nonEmpty);
    const level = nonEmpty(s.level) ? `（${s.level}）` : "";
    const tail = kw.length > 0 ? `：${kw.join("、")}` : "";
    out.push(
      new Paragraph({
        spacing: { after: SP_AFTER },
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
// Section: 证书荣誉（合并 certifications + awards）
// ——————————————————————————

function buildCertsAndAwardsSection(resume: ResumeJSON): Paragraph[] {
  const certs = resume.certifications ?? [];
  const awards = resume.awards ?? [];
  if (certs.length === 0 && awards.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("证书荣誉"));

  for (const c of certs) {
    const parts: string[] = [];
    if (nonEmpty(c.issuer)) parts.push(c.issuer);
    if (nonEmpty(c.date)) parts.push(c.date);
    const tail = parts.length > 0 ? `（${parts.join(" · ")}）` : "";
    out.push(
      new Paragraph({
        spacing: { after: SP_AFTER },
        children: [bodyRun(`${c.name}${tail}`)],
      }),
    );
  }

  for (const a of awards) {
    const parts: string[] = [];
    if (nonEmpty(a.awarder)) parts.push(a.awarder);
    if (nonEmpty(a.date)) parts.push(a.date);
    const tail = parts.length > 0 ? `（${parts.join(" · ")}）` : "";
    out.push(
      new Paragraph({
        spacing: { after: SP_AFTER },
        children: [bodyRun(`${a.title}${tail}`)],
      }),
    );
  }

  return out;
}

// ——————————————————————————
// Section: 志愿者 / 语言（保留但不常用）
// ——————————————————————————

export function buildVolunteerSection(resume: ResumeJSON): Paragraph[] {
  const items = resume.volunteer;
  if (!items || items.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("志愿者经历"));

  for (const v of items) {
    const head = nonEmpty(v.position)
      ? `${v.organization} · ${v.position}`
      : v.organization;
    const dateText = fmtDateRange(v.startDate, v.endDate);

    const headerChildren: ParagraphChild[] = [];
    if (dateText) {
      headerChildren.push(bodyRun(dateText));
      headerChildren.push(bodyRun("    "));
    }
    headerChildren.push(itemRun(head));

    out.push(
      new Paragraph({
        spacing: { before: SP_BEFORE_ITEM, after: SP_AFTER },
        children: headerChildren,
      }),
    );

    if (nonEmpty(v.summary)) {
      out.push(
        new Paragraph({
          spacing: { after: SP_AFTER },
          children: [bodyRun(v.summary)],
        }),
      );
    }

    if (v.highlights && v.highlights.length > 0) {
      const valid = v.highlights.filter(nonEmpty);
      for (let i = 0; i < valid.length; i++) {
        out.push(
          new Paragraph({
            spacing: { after: SP_AFTER },
            indent: { left: 240 },
            children: [bodyRun(`${i + 1}. ${valid[i]}`)],
          }),
        );
      }
    }
  }

  return out;
}

export function buildLanguagesSection(resume: ResumeJSON): Paragraph[] {
  const items = resume.languages;
  if (!items || items.length === 0) return [];

  const out: Paragraph[] = [];
  out.push(...buildSectionTitle("语言能力"));

  const line = items
    .filter((l) => nonEmpty(l.language))
    .map((l) =>
      nonEmpty(l.fluency) ? `${l.language}（${l.fluency}）` : l.language,
    )
    .join("    ");

  if (line) {
    out.push(
      new Paragraph({
        spacing: { after: SP_AFTER },
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
  const headerTable = buildHeaderTable(resume.basics);

  const bodyParagraphs: Paragraph[] = [
    ...buildEducationSection(resume.education),
    ...buildSummarySection(resume.basics.summary),
    ...buildWorkSection(resume.work),
    ...buildProjectsSection(resume.projects),
    ...buildSkillsSection(resume.skills),
    ...buildCertsAndAwardsSection(resume),
    ...buildVolunteerSection(resume),
    ...buildLanguagesSection(resume),
  ];

  const doc = new Document({
    creator: "resume-tailor",
    title: resume.basics.name ? `${resume.basics.name} - 简历` : "简历",
    styles: {
      default: {
        document: {
          run: {
            font: MSYH,
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
              top: "15mm",
              bottom: "15mm",
              left: "25mm",
              right: "25mm",
            },
          },
        },
        children: [headerTable, ...bodyParagraphs],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
