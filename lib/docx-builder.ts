/**
 * DOCX Builder — 严格对标模板
 *
 * 模板结构：
 * Table 1（头部）：3列 — 姓名(竖向合并) | 求职意向+联系方式 | 照片区(竖向合并)
 * Table 2（正文）：3列 — 所有内容 section 放在一个大表格里
 *   - section 标题行（蓝色，字间距加宽）
 *   - 数据行（日期 | 单位 | 岗位/专业）
 *   - 描述行（columnSpan=3 横跨）
 *   - 空行分隔
 *
 * 字体：微软雅黑
 * 颜色：#4874CB（蓝色主题），#595959（灰色正文），#3B3838（深灰标题行）
 */

import { Buffer } from "node:buffer";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  VerticalMergeType,
  AlignmentType,
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
// 常量
// ——————————————————————————

const MSYH = {
  ascii: "Microsoft YaHei",
  cs: "Microsoft YaHei",
  eastAsia: "Microsoft YaHei",
  hAnsi: "Microsoft YaHei",
} as const;

const BLUE = "4874CB";
const GRAY = "595959";
const DARK = "3B3838";

const SZ_NAME = 44;      // 22pt
const SZ_LABEL = 24;     // 12pt
const SZ_SECTION = 28;   // 14pt
const SZ_BODY = 22;      // 11pt

const NO_BORDERS: ITableCellBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

// Table 1 列宽（DXA）
const T1_COL1 = 2837;
const T1_COL2 = 4465;
const T1_COL3 = 2683;

// Table 2 列宽（DXA）
const T2_COL1 = 2602;
const T2_COL2 = 4123;
const T2_COL3 = 3231;
const T2_TOTAL = T2_COL1 + T2_COL2 + T2_COL3;

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

function emptyPara(): Paragraph {
  return new Paragraph({ spacing: { after: 0 } });
}

function textPara(
  text: string,
  opts: { size?: number; color?: string; bold?: boolean; indent?: number } = {},
): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [
      new TextRun({
        text,
        font: MSYH,
        size: opts.size ?? SZ_BODY,
        color: opts.color ?? GRAY,
        bold: opts.bold,
      }),
    ],
  });
}

/** 无边框单元格 */
function cell(
  children: Paragraph[],
  opts: {
    width?: number;
    columnSpan?: number;
    verticalMerge?: VerticalMergeType;
  } = {},
): TableCell {
  return new TableCell({
    borders: NO_BORDERS,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan: opts.columnSpan,
    verticalMerge: opts.verticalMerge,
    children: children.length > 0 ? children : [emptyPara()],
  });
}

// ——————————————————————————
// Table 1：头部
// ——————————————————————————

function buildHeaderTable(basics: ResumeBasics): Table {
  const contactPairs: [string, string][] = [];

  if (nonEmpty(basics.phone)) contactPairs.push(["手机：" + basics.phone, ""]);
  if (nonEmpty(basics.email))
    contactPairs.push(
      contactPairs.length > 0
        ? [contactPairs.pop()![0], "邮箱：" + basics.email]
        : ["邮箱：" + basics.email, ""],
    );

  const city = basics.location?.city;
  if (nonEmpty(city)) contactPairs.push(["现居：" + city, ""]);

  // 确保至少有一对联系方式 + label 行
  const labelText = nonEmpty(basics.label) ? `求职意向：${basics.label}` : "";

  const rows: TableRow[] = [];

  // Row 1: 姓名(merge start) | 空 | 右列(merge start)
  rows.push(
    new TableRow({
      children: [
        cell(
          [
            new Paragraph({
              children: [
                new TextRun({
                  text: basics.name,
                  font: MSYH,
                  size: SZ_NAME,
                  bold: true,
                  color: BLUE,
                }),
              ],
            }),
          ],
          { width: T1_COL1, verticalMerge: VerticalMergeType.RESTART },
        ),
        cell([emptyPara()], { width: T1_COL2 }),
        cell([emptyPara()], {
          width: T1_COL3,
          verticalMerge: VerticalMergeType.RESTART,
        }),
      ],
    }),
  );

  // Row 2: (continue) | 求职意向 | (continue)
  if (labelText) {
    rows.push(
      new TableRow({
        children: [
          cell([emptyPara()], {
            width: T1_COL1,
            verticalMerge: VerticalMergeType.CONTINUE,
          }),
          cell(
            [
              new Paragraph({
                children: [
                  new TextRun({
                    text: labelText,
                    font: MSYH,
                    size: SZ_LABEL,
                    bold: true,
                    color: BLUE,
                  }),
                ],
              }),
            ],
            { width: T1_COL2 },
          ),
          cell([emptyPara()], {
            width: T1_COL3,
            verticalMerge: VerticalMergeType.CONTINUE,
          }),
        ],
      }),
    );
  }

  // 联系方式行（每行两个字段）
  for (const [left, right] of contactPairs) {
    rows.push(
      new TableRow({
        children: [
          cell([textPara(left, { color: GRAY, bold: true })], {
            width: T1_COL1,
          }),
          cell(
            right
              ? [textPara(right, { color: GRAY, bold: true })]
              : [emptyPara()],
            { width: T1_COL2 },
          ),
          cell([emptyPara()], {
            width: T1_COL3,
            verticalMerge: VerticalMergeType.CONTINUE,
          }),
        ],
      }),
    );
  }

  return new Table({
    width: { size: T1_COL1 + T1_COL2 + T1_COL3, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    rows,
  });
}

// ——————————————————————————
// Table 2：正文内容（所有 section 在一个大表格里）
// ——————————————————————————

/** Section 标题行 */
function sectionTitleRow(title: string): TableRow {
  return new TableRow({
    children: [
      cell(
        [
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: spacedTitle(title),
                font: MSYH,
                size: SZ_SECTION,
                bold: true,
                color: BLUE,
              }),
            ],
          }),
        ],
        { width: T2_COL1 },
      ),
      cell([emptyPara()], { width: T2_COL2 }),
      cell([emptyPara()], { width: T2_COL3 }),
    ],
  });
}

/** 三列数据行（日期 | 单位 | 岗位） */
function threeColRow(
  col1: string,
  col2: string,
  col3: string,
): TableRow {
  return new TableRow({
    children: [
      cell([textPara(col1, { color: DARK, bold: true })], { width: T2_COL1 }),
      cell([textPara(col2, { color: DARK, bold: true })], { width: T2_COL2 }),
      cell([textPara(col3, { color: DARK, bold: true })], { width: T2_COL3 }),
    ],
  });
}

/** 横跨全宽的描述行（columnSpan=3） */
function fullWidthRow(paragraphs: Paragraph[]): TableRow {
  return new TableRow({
    children: [
      cell(paragraphs.length > 0 ? paragraphs : [emptyPara()], {
        width: T2_TOTAL,
        columnSpan: 3,
      }),
    ],
  });
}

/** 空分隔行 */
function separatorRow(): TableRow {
  return new TableRow({
    children: [
      cell([emptyPara()], { width: T2_COL1 }),
      cell([emptyPara()], { width: T2_COL2 }),
      cell([emptyPara()], { width: T2_COL3 }),
    ],
  });
}

// ——————————————————————————
// 构建各 section 的 rows
// ——————————————————————————

function buildEducationRows(
  education: ResumeEducation[] | undefined,
): TableRow[] {
  if (!education || education.length === 0) return [];
  const rows: TableRow[] = [sectionTitleRow("教育背景")];

  for (const e of education) {
    const dateText = fmtDateRange(e.startDate, e.endDate);
    const studyType = nonEmpty(e.studyType) ? e.studyType : "";
    const area = nonEmpty(e.area) ? e.area : "";
    const col2 = nonEmpty(e.institution) ? e.institution : "";
    const col3 = [area, studyType].filter(Boolean).join("/");

    rows.push(threeColRow(dateText, col2, col3));

    if (nonEmpty(e.score)) {
      rows.push(
        fullWidthRow([textPara(`GPA / 排名：${e.score}`)]),
      );
    }
  }

  rows.push(separatorRow());
  return rows;
}

function buildSummaryRows(summary: string | undefined): TableRow[] {
  if (!nonEmpty(summary)) return [];

  const rows: TableRow[] = [sectionTitleRow("个人优势总结")];

  const lines = summary
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const paras: Paragraph[] = lines.map((line, i) => {
    const text = line.replace(/^\d+[.、．]\s*/, "");
    return textPara(`${i + 1}. ${text}`, { color: GRAY, bold: true });
  });

  rows.push(fullWidthRow(paras));
  rows.push(separatorRow());
  return rows;
}

function buildWorkRows(work: ResumeWork[] | undefined): TableRow[] {
  if (!work || work.length === 0) return [];
  const rows: TableRow[] = [sectionTitleRow("工作经历")];

  for (const w of work) {
    const dateText = fmtDateRange(w.startDate, w.endDate);
    const position = nonEmpty(w.position) ? w.position : "";
    rows.push(threeColRow(dateText, w.name, position));

    const descParas: Paragraph[] = [];

    if (w.highlights && w.highlights.length > 0) {
      const valid = w.highlights.filter(nonEmpty);
      if (valid.length > 0) {
        descParas.push(textPara("工作描述：", { color: GRAY, bold: true }));
        for (let i = 0; i < valid.length; i++) {
          descParas.push(
            textPara(`${i + 1}. ${valid[i]}`, { color: GRAY, bold: true }),
          );
        }
      }
    } else if (nonEmpty(w.summary)) {
      descParas.push(textPara("工作描述：", { color: GRAY, bold: true }));
      descParas.push(textPara(w.summary, { color: GRAY, bold: true }));
    }

    if (descParas.length > 0) {
      rows.push(fullWidthRow(descParas));
    }

    rows.push(separatorRow());
  }

  return rows;
}

function buildProjectRows(
  projects: ResumeProject[] | undefined,
): TableRow[] {
  if (!projects || projects.length === 0) return [];
  const rows: TableRow[] = [sectionTitleRow("项目经验")];

  for (const p of projects) {
    const dateText = fmtDateRange(p.startDate, p.endDate);
    const roles =
      p.roles && p.roles.length > 0
        ? p.roles.filter(nonEmpty).join(" / ")
        : "";
    rows.push(threeColRow(dateText, p.name, roles));

    const descParas: Paragraph[] = [];

    if (nonEmpty(p.description)) {
      descParas.push(textPara(p.description, { color: GRAY, bold: true }));
    }

    if (p.highlights && p.highlights.length > 0) {
      const valid = p.highlights.filter(nonEmpty);
      for (let i = 0; i < valid.length; i++) {
        descParas.push(
          textPara(`${i + 1}. ${valid[i]}`, { color: GRAY, bold: true }),
        );
      }
    }

    if (p.keywords && p.keywords.length > 0) {
      const kw = p.keywords.filter(nonEmpty);
      if (kw.length > 0) {
        descParas.push(
          textPara(`关键词：${kw.join("、")}`, { color: GRAY }),
        );
      }
    }

    if (descParas.length > 0) {
      rows.push(fullWidthRow(descParas));
    }

    rows.push(separatorRow());
  }

  return rows;
}

function buildSkillRows(skills: ResumeSkill[] | undefined): TableRow[] {
  if (!skills || skills.length === 0) return [];
  const rows: TableRow[] = [sectionTitleRow("专业技能")];

  const paras: Paragraph[] = [];
  for (const s of skills) {
    const kw = (Array.isArray(s.keywords) ? s.keywords : []).filter(nonEmpty);
    const level = nonEmpty(s.level) ? `（${s.level}）` : "";
    const tail = kw.length > 0 ? `：${kw.join("、")}` : "";
    paras.push(textPara(`${s.name}${level}${tail}`, { color: GRAY }));
  }

  rows.push(fullWidthRow(paras));
  rows.push(separatorRow());
  return rows;
}

function buildCertsRows(resume: ResumeJSON): TableRow[] {
  const certs = resume.certifications ?? [];
  const awards = resume.awards ?? [];
  if (certs.length === 0 && awards.length === 0) return [];

  const rows: TableRow[] = [sectionTitleRow("证书荣誉")];

  const paras: Paragraph[] = [];

  for (const c of certs) {
    const parts: string[] = [];
    if (nonEmpty(c.issuer)) parts.push(c.issuer);
    if (nonEmpty(c.date)) parts.push(c.date);
    const tail = parts.length > 0 ? `（${parts.join(" · ")}）` : "";
    paras.push(textPara(`${c.name}${tail}`, { color: GRAY }));
  }

  for (const a of awards) {
    const parts: string[] = [];
    if (nonEmpty(a.awarder)) parts.push(a.awarder);
    if (nonEmpty(a.date)) parts.push(a.date);
    const tail = parts.length > 0 ? `（${parts.join(" · ")}）` : "";
    paras.push(textPara(`${a.title}${tail}`, { color: GRAY }));
  }

  rows.push(fullWidthRow(paras));
  return rows;
}

function buildVolunteerRows(resume: ResumeJSON): TableRow[] {
  const items = resume.volunteer;
  if (!items || items.length === 0) return [];

  const rows: TableRow[] = [sectionTitleRow("志愿者经历")];

  for (const v of items) {
    const dateText = fmtDateRange(v.startDate, v.endDate);
    const position = nonEmpty(v.position) ? v.position : "";
    rows.push(threeColRow(dateText, v.organization, position));

    const descParas: Paragraph[] = [];
    if (nonEmpty(v.summary)) {
      descParas.push(textPara(v.summary, { color: GRAY, bold: true }));
    }
    if (v.highlights && v.highlights.length > 0) {
      const valid = v.highlights.filter(nonEmpty);
      for (let i = 0; i < valid.length; i++) {
        descParas.push(
          textPara(`${i + 1}. ${valid[i]}`, { color: GRAY, bold: true }),
        );
      }
    }
    if (descParas.length > 0) rows.push(fullWidthRow(descParas));
    rows.push(separatorRow());
  }

  return rows;
}

function buildLanguageRows(resume: ResumeJSON): TableRow[] {
  const items = resume.languages;
  if (!items || items.length === 0) return [];

  const rows: TableRow[] = [sectionTitleRow("语言能力")];

  const line = items
    .filter((l) => nonEmpty(l.language))
    .map((l) =>
      nonEmpty(l.fluency) ? `${l.language}（${l.fluency}）` : l.language,
    )
    .join("    ");

  if (line) {
    rows.push(fullWidthRow([textPara(line, { color: GRAY })]));
  }

  return rows;
}

// ——————————————————————————
// 主入口
// ——————————————————————————

export async function buildResumeDocx(resume: ResumeJSON): Promise<Buffer> {
  const headerTable = buildHeaderTable(resume.basics);

  // Table 2: 所有正文 section
  const contentRows: TableRow[] = [
    ...buildEducationRows(resume.education),
    ...buildSummaryRows(resume.basics.summary),
    ...buildWorkRows(resume.work),
    ...buildProjectRows(resume.projects),
    ...buildSkillRows(resume.skills),
    ...buildCertsRows(resume),
    ...buildVolunteerRows(resume),
    ...buildLanguageRows(resume),
  ];

  const contentTable = new Table({
    width: { size: T2_TOTAL, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    rows: contentRows,
  });

  const doc = new Document({
    creator: "resume-tailor",
    title: resume.basics.name ? `${resume.basics.name} - 简历` : "简历",
    styles: {
      default: {
        document: {
          run: {
            font: MSYH,
            size: SZ_BODY,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1800,
              right: 866,
            },
          },
        },
        children: [
          headerTable,
          new Paragraph({ spacing: { after: 120 } }),
          contentTable,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
