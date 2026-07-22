# 华夏人生 (LifeGame) — 总体规划文档

> **最后更新**：2026-07-20
> **版本**：state.version = 27
> **语言**：文件名/标识符=英文, 注释/UI=中文
> **保护声明**：本文档及引用的3份子计划文档（cached-giggling-newt.md / economic-career-overhaul.md / time-education-overhaul.md）均为永久设计文档。**任何时候禁止删除。**

---

## 项目概述

一个竖屏优先、无框架、无远程依赖的人生模拟游戏。120+个JS文件，IIFE模块模式(`(function initXxx(root){...}(window))`)，挂载到 `root.LifeGame`。

当前已实现成人内容深度系统扩展，包括交欢/红灯区/偶像/犯罪/经营等。

---

## 文档索引

| 文档 | 内容 | 行数 |
|------|------|------|
| **MASTER-PLAN.md** (本文档) | 全局概述 + 实施状态 + 文件清单 |
| `cached-giggling-newt.md` | 方向一~七 (13个系统) 完整设计 + 叙事文本 + 决策汇总 |
| `economic-career-overhaul.md` | 方向八：税务/银行/公司/股票/职业面板/11条晋升线 |
| `time-education-overhaul.md` | 方向九：时间循环/体力/科目/考试/大学→求职管道 |
| `BUG-LOG.md` | 全局按钮失效P0 bug记录 + 5条编码准则 |

---

## 九大方向全景

| # | 方向 | 状态 | 核心文件 |
|---|------|------|---------|
| A | 街区旅途多段重写 | ✅ 已实现 | `travel.js` + `travel-stages.js` + `travel-interactions.js` |
| B | 旅途角色详情/立绘 | ✅ 已实现 | `travel.js` render, 复用 `social.card` + `navigation` |
| C | 交欢UI修复 | ✅ 已实现 | `encounter-system.js` + `style.css` + `index.html` |
| D | 健康疾病+整容 | ✅ 已实现 | `health-system.js` + `plastic-surgery.js` + `genetics.js` |
| E | 偶像系统 | ✅ 已实现 | `idol-system.js` + `idol-underground.js` + `world-data.js` |
| F | 家庭冲突 | ✅ 已实现 | `family-conflict.js` + `relationship-secrets.js` + `household-system.js` |
| 一 | 色情地下产业+强奸+犯罪 | ✅ 已实现 | `criminal-system.js` + `rape-encounter.js` |
| 二 | 心理/成瘾/创伤 | ✅ 已实现 | `psychology-system.js` |
| 三 | NPC主动互动 | ✅ 已实现 | `npc-initiative.js` (900行, 8种事件类型) |
| 四 | 多角关系/包养/复合 | 📋 设计定稿, 待实施 | `family-conflict.js` 扩展 (部分已实现) |
| 五 | 偶像深化(团体/选举/毕业) | ✅ 已实现 | `idol-system.js` 7个新函数 |
| 六 | 角色详情重构(履历时间轴) | 📋 设计定稿, 待实施 | `navigation.js` + `npc-life.js` |
| 七 | 地下偶像+辍学 | ✅ 已实现 | `idol-underground.js` (700行) |
| 八 | 经济/银行/公司/职业面板 | ✅ 大部分已实现 | `tax-system.js` + `bank-system.js` + `company-system.js` + `stock-director.js` + `career-panels.js` |
| 九 | 时间+体力+教育+大学→求职 | 🔄 阶段1完成, 阶段2待实施 | `app.js`(时间循环) + `career.js`(qualification重写) |

---

## 新建文件清单 (23个)

| 文件 | 行数 | 所属方向 |
|------|------|---------|
| `scripts/data/travel-stages.js` | ~160 | A (旅途多段) |
| `scripts/features/travel-interactions.js` | 38 | A (旅途交互) |
| `scripts/features/plastic-surgery.js` | 190 | D (整容) |
| `scripts/features/health-safety.js` | 41 | D (健康安全) |
| `scripts/features/criminal-system.js` | 282 | 一 (犯罪) |
| `scripts/features/rape-encounter.js` | 62 | 一 (强奸) |
| `scripts/features/psychology-system.js` | 448 | 二 (心理) |
| `scripts/features/npc-initiative.js` | 900 | 三 (NPC互动) |
| `scripts/features/family-conflict.js` | 198 | F (家庭冲突) |
| `scripts/features/idol-system.js` | ~380 | E+五 (偶像) |
| `scripts/features/idol-underground.js` | 700 | 七 (地下偶像) |
| `scripts/features/tax-system.js` | 252 | 八 (税务) |
| `scripts/features/bank-system.js` | 256 | 八 (银行) |
| `scripts/features/company-system.js` | 864 | 八 (公司) |
| `scripts/features/stock-director.js` | 526 | 八 (股票董事) |
| `scripts/engine/npc-career-life.js` | 102 | NPC AI |
| `scripts/engine/npc-life-support.js` | 73 | NPC AI |
| `scripts/engine/female-youth-style.js` | 78 | NPC装扮 |
| `scripts/features/creator-economy.js` | 69 | 创作者经济 |
| `scripts/features/creator-style-growth.js` | 88 | 创作者装扮 |
| `scripts/features/creator-growth-actions.js` | 76 | 创作者行动 |
| `scripts/features/education-fast-forward.js` | 77 | 教育快进 |
| `scripts/ui/career-panels.js` | 575 | 八 (职业面板) |
| `scripts/features/encounter-system.js` | ~540 | C+一+二 (交欢核心) |

---

## 核心架构

### 月度管线 (monthly-systems.js — 28个调用)

```
education → cityLife → property → socialWorld → populationSimulation →
careerGrowth → companyMarket → careerSpecialties → relationshipMemory →
parenting → household → relationshipSecrets → creatorCareer →
healthSystem → npcFashion → encounter.ensure → brothel.ensure →
hookup.ensure → idolSystem → npcCareerLife → familyConflict →
criminalSystem → psychology → npcInitiative → taxSystem →
bankSystem → companySystem → stockDirector → undergroundIdol → lifeEvents
```

### 事件路由链 (interaction-router.js)

```
npcInitiative → undergroundIdol → careerPanels → encounterSystem →
brothelSystem → hookupSystem → idolSystem → familyConflict →
travelInteractions → portraitGallery → characterChat → hunterMode →
saveManager → roleBook → appearance → drawSettings → schoolLines →
portrait/navigation → extendedInteractions → relations → career →
lifeSystems → assets
```

### 时间控制 (app.js)

| 按钮 | 每天数/tick | 间隔 | 每月耗时 | 空格键 |
|------|-----------|------|---------|--------|
| ⏸ | 0天 | — | 暂停 | 恢复→上次速度 |
| ▶ 1x | 1天 | 2000ms | 60秒 | 暂停→记录速度 |
| ▶▶ 5x | 15天 | 500ms | 1秒 | — |
| ▶▶▶ 10x | 30天 | 250ms | 0.25秒 | — |

- `pendingDecision` 时自动暂停
- 体力每月1日自动回满

---

## 今日 (2026-07-20) 工作记录

### 已完成
1. ✅ 全部23个新文件创建 + 语法验证通过
2. ✅ 交互路由修复 (?.method?.() 双重保护 — BUG-LOG.md记录)
3. ✅ encounter-system 全面接入 isRape/psychology/criminal/stamina
4. ✅ idol-system 7个新函数 (团体/选举/恋爱禁止/毕业/黑粉/安保/转型)
5. ✅ career.js qualification/ability 重写 (大学质量0.3-2.0x, 专业对口35-72分)
6. ✅ 时间系统: ⏸/1x/5x/10x, pendingDecision自动暂停, 空格键暂停/恢复
7. ✅ 体力系统: 右下角SVG圆环, 月度回满
8. ✅ 删除旧底部 monthBtn/yearBtn → 顶部 timeBar
9. ✅ 三份计划文档重建 + 保护声明
10. ✅ 犯罪/心理/NPC互动/地下偶像/公司/银行/税务 全部文件就位

### 待实施 (阶段2)
11. 📋 科目系统 (per-subject studyHours/aptitude/examScore)
12. 📋 学习面板科目卡片网格UI
13. 📋 体力消耗接入各行动系统 (stamina.spend on every action)
14. 📋 大学4学年体验 (精简事件: 实习招聘季+毕业论文)
15. 📋 角色详情页重构 (人生履历时间轴, 方向六)
16. 📋 多角关系系统 (方向四, 部分逻辑已实现缺UI)
17. 📋 毕业转型UI (idol retire transition 按钮)

### 关键决策 (70+条, 详见各计划文档)
- 大学质量: 薪资+岗位双重差异, 学位终身有效无补救
- 专业对口: 35-72动态分, 非对口-15分
- 时间模型: 10x = 0.25秒/月, 每日确实走30天而非跨越格数
- 速度UI: 顶部时间条, 底部monthBtn/yearBtn已删除
- 体力: 右下SVG圆环, 月度回满, 耗尽不强制加速

---

## 编码准则 (来自 BUG-LOG.md)

1. **interaction-router.js 所有 handler 必须用 `?.method?.(event)` 双重保护**
2. **每个新 feature 模块必须提供 `handleClick` 导出** (即使空函数)
3. **新模块上线前做交互测试, 不只靠语法检查**
4. **handler 链路 fail-fast, 一个崩溃全部断**
5. **Agent 生成模块验证导出函数名与调用名匹配**

---

## 快速入口

- 启动: 打开 `publish/index.html`
- 调试: 浏览器 F12 → Console
- 语法检查: `for f in publish/*.js publish/scripts/**/*.js; do node --check "$f"; done`
- 加载测试: `node tools/test-load.js`



CK3 活动的关键并不是事件数量，而是：选择活动变体 → 配置规模与人员 → 选择意图 → 旅行和分阶段事件 → 按活动进度结算长期结果。角色参加活动时还能选择“意图”，改变事件权重；比武大会还包含自由活动区域、资格进度、多个比赛项目以及参赛或旁观选择。(ck3.paradoxwikis.com)

统一活动结构

js


activity = {
  type: 'convention',
  variant: 'cosplay-contest',
  role: 'host',
  intent: 'win',
  phase: 'planning',
  location: '上海会展中心',
  route: [],
  guests: [],
  entourage: [],
  options: {},
  meters: {
    progress: 0,
    quality: 50,
    risk: 10
  },
  flags: {},
  history: []
};
每场活动固定经过：

筹备：地点、规模、预算、装备、邀请对象。
出行：路线、同行者、速度与风险事件。
抵达：自由选择活动区域。
主体阶段：2–5个事件或比赛阶段。
闭幕结算：排名、关系、压力、特质经验和长期记忆。
意图系统

意图不直接保证成功，而是改变事件出现概率和奖励方向：

夺冠：更多比赛事件，体能与魅力检定。
交友：更多Coser、摄影师和社团互动。
商业合作：品牌、摊位和委托事件。
学习取材：作品讨论、服装制作和摄影知识。
放松：减少压力，但活动进度较低。
暗中调查：发现秘密、骗局或竞争者弱点。
NPC也应拥有自己的意图。外向Coser可能寻找合作，狡猾NPC可能抢资源，内向角色可能只在安静区域出现。这会让活动产生人物故事，而不是固定剧情。

四类活动改写

城市巡游
对应 CK3 的路线与多个停靠点。CK3巡游可以根据目标采用不同变体，并通过随行人员、奢华程度和停靠地点改变结果。(ck3.paradoxwikis.com)

现代版本可以包括：

城市观光巡游
全国漫展巡回
校园访问
公司门店巡查
旅行拍摄企划
玩家选择2–5个地点，每站只能进行有限行动。快速路线疲劳低但事件少；绕行路线事件丰富但风险和花费更高。

比武大会
改成：

Cosplay比赛
体育比赛
电竞比赛
辩论赛
才艺选秀
校园竞赛
CK3大会会先在训练场等区域积累“获胜进度”，达到资格线后才能进入比赛，并且不同项目使用不同能力和风险。(ck3.paradoxwikis.com)

我们的比赛可以使用：

text


舞台表现 = 魅力 + 体能
服装还原 = 学识 + 管理
临场问答 = 交涉 + 学识
应对竞争 = 心计 + 管理
玩家可以训练、社交、休息、观察对手或暗中准备，但时间有限，不能全部完成。

宴会
CK3宴会会配置食物和菜品数量，主要产出关系、压力缓解、宴会经验，也可能发现秘密。(ck3.paradoxwikis.com)

现代版本包括：

家庭聚餐
同学聚会
公司晚宴
生日宴会
粉丝庆功宴
漫展After Party
核心不是“吃一顿饭”，而是安排座位、邀请对象和宴会目的。席间发生敬酒、争执、告白、合作、秘密泄露或关系修复。

狩猎与探索
CK3狩猎会考虑地点适合度、随行规模、健康条件和风险，产出战利品、经验、声望与压力缓解。(ck3.paradoxwikis.com)

现代化后可写成：

户外徒步
摄影采风
寻宝活动
野外考察
钓鱼露营
城市探店挑战
阶段为：发现线索 → 追踪目标 → 遭遇风险 → 最终收获。体能负责追踪，学识负责识别线索，管理负责准备物资，心计负责判断陷阱。



下一步设计应先确定 年度漫展数据结构、年度日历界面、综合展与Only展筛选规则，然后再扩展公司筹备和参展路线。