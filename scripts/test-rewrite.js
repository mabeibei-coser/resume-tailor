/**
 * Step 13 验证脚本：跑一份中文社招 5 年简历 + 产品经理 JD，
 * 验证 /api/tailor/rewrite 真 LLM 实现。
 *
 * 双跑 moderate / aggressive，对比 changes 数 / flagged 数 / 耗时。
 *
 * 用法：node scripts/test-rewrite.js [port]   # port 默认 3002
 *   依赖 dev server 已起在 localhost:port 上
 */

const PORT = process.argv[2] || "3002";
const ENDPOINT = `http://localhost:${PORT}/api/tailor/rewrite`;

// ============================================================================
// 简历样本（中文社招 5 年，产品经理）— 与 test-parser.js 样本 C 一致
// ============================================================================
const RESUME_TEXT = `王志远 / 男 / 1995.08 / 北京 / 18610002345 / wangzy.dev@gmail.com

个人简介
5 年互联网产品经理经验，主要负责 C 端产品的用户增长与商业化。曾在 SaaS 与电商两个行业有完整产品周期经验。

工作经历

2023.03-至今  Acme 电商科技  高级产品经理
- 主导用户成长体系从 0 到 1 搭建，覆盖签到、任务、积分、勋章四大模块
- 推动核心转化漏斗优化，新用户首单转化从 12% 提升到 18%
- 负责跨部门 AB 实验框架升级，每月支撑 20+ 业务实验
- 带领 2 名初级产品经理，建立需求评审和复盘机制

2021.05-2023.02  BetaCloud SaaS  产品经理
- 负责企业版后台产品线，年度续费率从 65% 提升至 78%
- 主导付费版账户体系重构，支持单租户 1000+ 子账户管理
- 与销售、客户成功团队对接，每周输出客户反馈分析报告

2019.07-2021.04  GammaTech  助理产品经理
- 跟进 C 端 App 的活动模块迭代，月度活动配置上线 8-12 场
- 整理用户调研报告 30+ 份，输出关键洞察推动 3 次产品方向调整
- 参与从 0 到 1 的小程序版本立项

教育背景
2015.09-2019.06  北京邮电大学  信息管理与信息系统  本科  GPA 3.5/4.0
2017.07-2017.08  斯坦福大学  暑期交流项目（产品创新方向）

项目经历
增长黑客内部分享会 (2022)
- 牵头组织公司内部增长方法论分享，输出 12 期内容、累计 200+ 人参与
- 沉淀 1 套适配 SaaS 行业的增长漏斗分析模板，被横向推广到 3 个产品线

技能与证书
- 工具：SQL、Tableau、神策、Figma、Jira、Notion
- 方法论：AB 测试、增长黑客、OKR、用户画像、漏斗分析
- 证书：PMP（2022 年获得）、英语 CET-6
- 语言：中文（母语）、英语（流利）`;

// ============================================================================
// 产品经理 JD（用户增长方向）— 与 test-analyze.js 第一份 JD 一致
// ============================================================================
const JOB_TITLE = "高级产品经理 / 用户增长方向";
const JD = `岗位职责：
- 负责公司核心产品的用户增长，包括拉新、激活、留存全链路
- 主导 A/B 测试和增长实验，从假设提出到方案落地、数据复盘形成闭环
- 制定 OKR 目标并拆解到周度执行，跨团队协调研发、设计、运营资源
- 通过用户调研、数据分析定位增长瓶颈，输出可执行的产品方案

任职要求：
- 3 年以上互联网产品经理经验，有用户增长 / 留存提升 / 转化优化项目经历
- 熟练使用 SQL、Tableau / 神策 / GA 等数据分析工具，能独立完成漏斗分析
- 有完整的 A/B 测试经验，包括实验设计、统计显著性判断、上线推广
- 良好的跨团队沟通能力，能用 OKR 推动多角色协作
- 加分项：MBA / 数据科学背景 / 增长黑客方法论实践`;

// ============================================================================
// 调用工具
// ============================================================================

async function callRewrite(mode) {
  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      formData: {
        jobTitle: JOB_TITLE,
        jd: JD,
        resumeText: RESUME_TEXT,
        mode,
      },
    }),
  });
  const elapsed = Date.now() - t0;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  const j = await res.json();
  return { ...j.data, _elapsedMs: elapsed };
}

function trunc(s, n) {
  if (typeof s !== "string") return "(无)";
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

function summarizeFlagReasons(changes) {
  const dist = {};
  for (const c of changes) {
    if (c.flagged) {
      const r = c.flagReason || "(无 reason)";
      dist[r] = (dist[r] || 0) + 1;
    }
  }
  return dist;
}

async function runOne(mode) {
  console.log(`\n========== mode = ${mode} ==========`);
  try {
    const data = await callRewrite(mode);

    const isFallback = data.fallback === true;
    if (isFallback) {
      console.log(`!!! FALLBACK 触发（双 LLM 失败或 parser 失败）`);
    }

    console.log(`耗时（客户端总）：${data._elapsedMs} ms`);
    console.log(`resume 字段：basics.name="${data.resume?.basics?.name}", work=${data.resume?.work?.length || 0}, edu=${data.resume?.education?.length || 0}, skills=${data.resume?.skills?.length || 0}`);

    const changes = data.changes || [];
    console.log(`\nchanges 数：${changes.length}`);

    const flagged = changes.filter((c) => c.flagged);
    console.log(`flagged 数：${flagged.length} / ${changes.length}`);
    const flagDist = summarizeFlagReasons(changes);
    if (Object.keys(flagDist).length > 0) {
      console.log(`flagReason 分布：`);
      for (const [r, n] of Object.entries(flagDist)) {
        console.log(`  ${r}: ${n}`);
      }
    }

    console.log(`\n--- 前 3 条 changes ---`);
    changes.slice(0, 3).forEach((c, i) => {
      console.log(`  [${i + 1}] path="${c.path}" action="${c.action}"${c.flagged ? " ⚠️ flagged" : ""}`);
      console.log(`      oldText: ${trunc(c.oldText || "", 30)}`);
      console.log(`      newText: ${trunc(c.newText || "", 30)}`);
      console.log(`      reason : ${trunc(c.reason || "", 50)}`);
      if (c.flagged) console.log(`      flagReason: ${c.flagReason}`);
    });

    return {
      mode,
      ok: true,
      isFallback,
      elapsedMs: data._elapsedMs,
      changesCount: changes.length,
      flaggedCount: flagged.length,
      flagDist,
    };
  } catch (e) {
    console.error(`FAIL: ${e.message}`);
    return { mode, ok: false, error: e.message };
  }
}

async function main() {
  console.log(`[test-rewrite] 端点：${ENDPOINT}`);

  const results = [];
  for (const mode of ["moderate", "aggressive"]) {
    const r = await runOne(mode);
    results.push(r);
  }

  console.log(`\n\n============= 总结 =============`);
  for (const r of results) {
    if (r.ok) {
      const tag = r.isFallback ? "[FALLBACK]" : "[PASS]";
      console.log(`  ${tag} mode=${r.mode} → changes=${r.changesCount}, flagged=${r.flaggedCount}, ${r.elapsedMs}ms`);
    } else {
      console.log(`  [FAIL] mode=${r.mode} → ${r.error}`);
    }
  }
}

main().catch((e) => {
  console.error("script error:", e);
  process.exit(1);
});
