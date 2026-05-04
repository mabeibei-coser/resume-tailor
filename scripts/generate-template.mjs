/**
 * 一次性脚本：用 docx 库生成 lib/templates/resume-template.docx。
 * 视觉风格对标 简历模板_0503.docx（韩梅梅样例）：
 *   - 表头 Table 1：3 列 — 姓名(竖向合并) | 求职意向+联系方式 | 照片(竖向合并)
 *   - 正文 Table 2：3 列大表，section 标题 + 数据行 + 描述行
 *   - 微软雅黑；BLUE #4874CB / GRAY #595959 / DARK #3B3838
 *
 * docxtemplater 3.68 用法关键点（已踩坑）：
 *   - 不要 {basics.name} dot-path 在根作用域，会渲染成 "undefined"
 *     → 用 {#basics}…{name}…{/basics} 进入 basics 作用域
 *   - 字符串字段做条件渲染，不要 {#x}{x}{/x}（内层 {x} 解析在 string scope 里失败）
 *     → 用 {#x}{.}{/x}（{.} = 当前作用域值）
 *   - 循环 bullet 要每条一段：把 {#xxx} / {/xxx} 各自占一段，paragraphLoop:true 才会生效
 *
 * 用法：node scripts/generate-template.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
} from "docx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ——————————————————————————
// 常量
// ——————————————————————————

const MSYH = {
  ascii: "Microsoft YaHei",
  cs: "Microsoft YaHei",
  eastAsia: "Microsoft YaHei",
  hAnsi: "Microsoft YaHei",
};

const BLUE = "4874CB";
const GRAY = "595959";
const DARK = "3B3838";

const SZ_NAME = 44;
const SZ_LABEL = 24;
const SZ_SECTION = 28;
const SZ_BODY = 22;

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

const T1_COL1 = 2837;
const T1_COL2 = 4465;
const T1_COL3 = 2683;

const T2_COL1 = 2602;
const T2_COL2 = 4123;
const T2_COL3 = 3231;
const T2_TOTAL = T2_COL1 + T2_COL2 + T2_COL3;

// ——————————————————————————
// 工具
// ——————————————————————————

function spacedTitle(text) {
  return text.split("").join(" ");
}

function emptyPara() {
  return new Paragraph({ spacing: { after: 0 } });
}

function rawPara(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.spacingAfter ?? 0 },
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

function textPara(text, opts = {}) {
  return rawPara(text, { ...opts, spacingAfter: opts.spacingAfter ?? 40 });
}

function cell(children, opts = {}) {
  return new TableCell({
    borders: NO_BORDERS,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan: opts.columnSpan,
    verticalMerge: opts.verticalMerge,
    children: children.length > 0 ? children : [emptyPara()],
  });
}

// ——————————————————————————
// Table 1：表头（用 {#basics}…{/basics} 进 basics 作用域）
// ——————————————————————————

function buildHeaderTable() {
  return new Table({
    width: { size: T1_COL1 + T1_COL2 + T1_COL3, type: WidthType.DXA },
    // tblGrid — 必填，否则 WPS / 部分 Word 渲染器会把列拍扁成 100 DXA
    columnWidths: [T1_COL1, T1_COL2, T1_COL3],
    borders: {
      ...NO_BORDERS,
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      // 行 1：姓名(merge) | 求职意向 | 照片(merge)
      new TableRow({
        children: [
          cell(
            [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "{#basics}{name}{/basics}",
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
          cell(
            [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "{#basics}{#label}求职意向：{label}{/label}{/basics}",
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
            verticalMerge: VerticalMergeType.RESTART,
          }),
        ],
      }),
      // 行 2：生日 + 工作经验
      new TableRow({
        children: [
          cell([emptyPara()], {
            width: T1_COL1,
            verticalMerge: VerticalMergeType.CONTINUE,
          }),
          cell(
            [
              textPara(
                "{#basics}{#birthday}生日：{birthday}{/birthday}    {#yearsOfExperience}工作经验：{yearsOfExperience}{/yearsOfExperience}{/basics}",
                { color: GRAY, bold: true },
              ),
            ],
            { width: T1_COL2 },
          ),
          cell([emptyPara()], {
            width: T1_COL3,
            verticalMerge: VerticalMergeType.CONTINUE,
          }),
        ],
      }),
      // 行 3：籍贯 + 现居
      new TableRow({
        children: [
          cell([emptyPara()], {
            width: T1_COL1,
            verticalMerge: VerticalMergeType.CONTINUE,
          }),
          cell(
            [
              textPara(
                "{#basics}{#hometown}籍贯：{hometown}{/hometown}    {#location}{#city}现居：{city}{/city}{/location}{/basics}",
                { color: GRAY, bold: true },
              ),
            ],
            { width: T1_COL2 },
          ),
          cell([emptyPara()], {
            width: T1_COL3,
            verticalMerge: VerticalMergeType.CONTINUE,
          }),
        ],
      }),
      // 行 4：手机 + 邮箱
      new TableRow({
        children: [
          cell([emptyPara()], {
            width: T1_COL1,
            verticalMerge: VerticalMergeType.CONTINUE,
          }),
          cell(
            [
              textPara(
                "{#basics}{#phone}手机：{phone}{/phone}    {#email}邮箱：{email}{/email}{/basics}",
                { color: GRAY, bold: true },
              ),
            ],
            { width: T1_COL2 },
          ),
          cell([emptyPara()], {
            width: T1_COL3,
            verticalMerge: VerticalMergeType.CONTINUE,
          }),
        ],
      }),
    ],
  });
}

// ——————————————————————————
// Table 2 行级工具
// ——————————————————————————

function sectionTitleRow(title) {
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

function separatorRow() {
  return new TableRow({
    children: [
      cell([emptyPara()], { width: T2_COL1 }),
      cell([emptyPara()], { width: T2_COL2 }),
      cell([emptyPara()], { width: T2_COL3 }),
    ],
  });
}

// ——————————————————————————
// section rows（每个 section 都用"{#xxx} 占首格段 + 内容 + {/xxx} 占末格段"做行级循环）
// 关键：每个段单独写 paragraph 才能让 paragraphLoop 起效
// ——————————————————————————

function buildEducationRows() {
  return [
    sectionTitleRow("教育背景"),
    new TableRow({
      children: [
        cell(
          [textPara("{#education}{startDate} - {endDate}", { color: DARK, bold: true })],
          { width: T2_COL1 },
        ),
        cell([textPara("{institution}", { color: DARK, bold: true })], {
          width: T2_COL2,
        }),
        cell(
          [textPara("{studyType} / {area}", { color: DARK, bold: true })],
          { width: T2_COL3 },
        ),
      ],
    }),
    // GPA 行 + 关闭 {/education}（条件渲染：有 score 才显示）
    new TableRow({
      children: [
        cell(
          [
            textPara("{#score}GPA / 排名：{score}{/score}", { color: GRAY }),
            rawPara("{/education}", { color: GRAY }),
          ],
          { width: T2_TOTAL, columnSpan: 3 },
        ),
      ],
    }),
    separatorRow(),
  ];
}

function buildSummaryRows() {
  return [
    sectionTitleRow("个人优势总结"),
    new TableRow({
      children: [
        cell(
          [textPara("{#basics}{#summary}{summary}{/summary}{/basics}", {
            color: GRAY,
            bold: true,
          })],
          { width: T2_TOTAL, columnSpan: 3 },
        ),
      ],
    }),
    separatorRow(),
  ];
}

// 工作经历：行 1 = 数据三列；行 2 = "工作描述："；行 3-5 = highlights 多段循环；行 6 = 关闭 {/work}
function buildWorkRows() {
  return [
    sectionTitleRow("工作经历"),
    new TableRow({
      children: [
        cell(
          [textPara("{#work}{startDate} - {endDate}", { color: DARK, bold: true })],
          { width: T2_COL1 },
        ),
        cell([textPara("{name}", { color: DARK, bold: true })], {
          width: T2_COL2,
        }),
        cell([textPara("{position}", { color: DARK, bold: true })], {
          width: T2_COL3,
        }),
      ],
    }),
    new TableRow({
      children: [
        cell(
          [
            textPara("工作描述：", { color: GRAY, bold: true }),
            // paragraphLoop：每段单独写
            rawPara("{#highlights}", { color: GRAY }),
            rawPara("{displayIndex}. {text}", { color: GRAY, bold: true, spacingAfter: 40 }),
            rawPara("{/highlights}", { color: GRAY }),
            rawPara("{/work}", { color: GRAY }),
          ],
          { width: T2_TOTAL, columnSpan: 3 },
        ),
      ],
    }),
    separatorRow(),
  ];
}

function buildProjectRows() {
  return [
    sectionTitleRow("项目经验"),
    new TableRow({
      children: [
        cell(
          [textPara("{#projects}{startDate} - {endDate}", { color: DARK, bold: true })],
          { width: T2_COL1 },
        ),
        cell([textPara("{name}", { color: DARK, bold: true })], {
          width: T2_COL2,
        }),
        cell(
          [textPara("{#roles}{.}/{/roles}", { color: DARK, bold: true })],
          { width: T2_COL3 },
        ),
      ],
    }),
    new TableRow({
      children: [
        cell(
          [
            textPara("{#description}{description}{/description}", { color: GRAY, bold: true }),
            rawPara("{#highlights}", { color: GRAY }),
            rawPara("{displayIndex}. {text}", { color: GRAY, bold: true, spacingAfter: 40 }),
            rawPara("{/highlights}", { color: GRAY }),
            textPara("{#keywords_str}关键词：{keywords_str}{/keywords_str}", { color: GRAY }),
            rawPara("{/projects}", { color: GRAY }),
          ],
          { width: T2_TOTAL, columnSpan: 3 },
        ),
      ],
    }),
    separatorRow(),
  ];
}

function buildSkillRows() {
  return [
    sectionTitleRow("专业技能"),
    new TableRow({
      children: [
        cell(
          [
            rawPara("{#skills}", { color: GRAY }),
            rawPara("{name}{level_str}{#keywords_str}：{keywords_str}{/keywords_str}", {
              color: GRAY,
              spacingAfter: 40,
            }),
            rawPara("{/skills}", { color: GRAY }),
          ],
          { width: T2_TOTAL, columnSpan: 3 },
        ),
      ],
    }),
    separatorRow(),
  ];
}

function buildLanguageRows() {
  return [
    sectionTitleRow("语言能力"),
    new TableRow({
      children: [
        cell(
          [textPara("{#languages}{language}{#fluency}（{fluency}）{/fluency}    {/languages}", {
            color: GRAY,
          })],
          { width: T2_TOTAL, columnSpan: 3 },
        ),
      ],
    }),
    separatorRow(),
  ];
}

function buildCertsRows() {
  return [
    sectionTitleRow("证书荣誉"),
    new TableRow({
      children: [
        cell(
          [
            rawPara("{#certifications}", { color: GRAY }),
            rawPara("{name}{#tail}（{tail}）{/tail}", { color: GRAY, spacingAfter: 40 }),
            rawPara("{/certifications}", { color: GRAY }),
            rawPara("{#awards}", { color: GRAY }),
            rawPara("{title}{#tail}（{tail}）{/tail}", { color: GRAY, spacingAfter: 40 }),
            rawPara("{/awards}", { color: GRAY }),
          ],
          { width: T2_TOTAL, columnSpan: 3 },
        ),
      ],
    }),
    separatorRow(),
  ];
}

function buildVolunteerRows() {
  return [
    sectionTitleRow("志愿者经历"),
    new TableRow({
      children: [
        cell(
          [textPara("{#volunteer}{startDate} - {endDate}", { color: DARK, bold: true })],
          { width: T2_COL1 },
        ),
        cell([textPara("{organization}", { color: DARK, bold: true })], {
          width: T2_COL2,
        }),
        cell([textPara("{position}", { color: DARK, bold: true })], {
          width: T2_COL3,
        }),
      ],
    }),
    new TableRow({
      children: [
        cell(
          [
            textPara("{#summary}{summary}{/summary}", { color: GRAY, bold: true }),
            rawPara("{#highlights}", { color: GRAY }),
            rawPara("{displayIndex}. {text}", { color: GRAY, bold: true, spacingAfter: 40 }),
            rawPara("{/highlights}", { color: GRAY }),
            rawPara("{/volunteer}", { color: GRAY }),
          ],
          { width: T2_TOTAL, columnSpan: 3 },
        ),
      ],
    }),
    separatorRow(),
  ];
}

// ——————————————————————————
// 主入口
// ——————————————————————————

const headerTable = buildHeaderTable();

const contentRows = [
  ...buildEducationRows(),
  ...buildSummaryRows(),
  ...buildWorkRows(),
  ...buildProjectRows(),
  ...buildSkillRows(),
  ...buildLanguageRows(),
  ...buildCertsRows(),
  ...buildVolunteerRows(),
];

const contentTable = new Table({
  width: { size: T2_TOTAL, type: WidthType.DXA },
  // tblGrid — 必填，否则 WPS / 部分 Word 渲染器会把列拍扁成 100 DXA
  columnWidths: [T2_COL1, T2_COL2, T2_COL3],
  borders: {
    ...NO_BORDERS,
    insideHorizontal: { style: BorderStyle.NONE, size: 0 },
    insideVertical: { style: BorderStyle.NONE, size: 0 },
  },
  rows: contentRows,
});

const doc = new Document({
  creator: "resume-tailor",
  title: "Resume Template",
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
          margin: { top: 1440, bottom: 1440, left: 1800, right: 866 },
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

const outDir = path.join(projectRoot, "lib", "templates");
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, "resume-template.docx");
await fs.writeFile(outPath, buffer);

console.log(`Template generated: ${outPath} (${buffer.length} bytes)`);
