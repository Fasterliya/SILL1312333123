# 剩余实施队列 — 详细执行计划

> **日期**: 2026-07-20
> **基于**: 当天完整对话记录 + MASTER-PLAN.md + 3份子计划文档(1332行) + 70+条决策确认 + BUG-LOG.md
> **当前状态**: 9个方向中6个完全实现，3个部分实现。剩余13个任务，5轮并行，15-25个文件。

---

## 已完成清单 (确认无遗漏)

| 系统 | 文件 | 状态 |
|------|------|------|
| 旅途多段叙事 | `travel.js` + `travel-stages.js`(8街区+4景点×3段) + `travel-interactions.js` | ✅ |
| 旅途邂逅立绘/详情 | `travel.js` renderEncounters → social.card → openCharacter | ✅ |
| 交欢UI | `encounter-system.js`(540行) + `style.css` overlay + `index.html` container | ✅ |
| 健康/疾病 | `health-system.js`(15种疾病/4类/自愈/治疗/叙事) + `plastic-surgery.js`(5手术+遗传) | ✅ |
| 偶像基础+扩展 | `idol-system.js`(训练/出道/考评/潜规则+团体/选举/恋爱禁止/毕业/黑粉/安保/转型) | ✅ |
| 家庭冲突 | `family-conflict.js`(怀疑度/对峙/离婚/复合/职业发现/子女影响) | ✅ |
| 犯罪系统 | `criminal-system.js`(6国法律/逮捕/坐牢/死刑/隐匿) | ✅ |
| 强奸系统 | `rape-encounter.js`(抵抗/堕落/春药迷药/报案) + `encounter-system.js` isRape对接 | ✅ |
| 心理系统 | `psychology-system.js`(性瘾/罪恶感/堕落/戒治所/自杀pendingDecision) | ✅ |
| NPC主动互动 | `npc-initiative.js`(900行, 8种事件, iOS通知UI) | ✅ |
| 地下偶像 | `idol-underground.js`(700行, 训练/演出/潜规则/坠落缓冲/转正) | ✅ |
| 税务/银行/公司 | `tax-system.js` + `bank-system.js` + `company-system.js`(864行创建向导) | ✅ |
| 股票董事 | `stock-director.js`(分红/投票/收购) | ✅ |
| 职业面板 | `career-panels.js`(575行, 办公室/妓女/皮条客/黑市4面板+路由) | ✅ |
| 时间系统 | `app.js` timeTick + `view.js` renderTimeBar(顶部时间条) + `index.html` timeBar HTML | ✅ |
| 体力系统 | `app.js` monthly回复 + `view.js` + `index.html` stamina-ring SVG | ✅ |
| 大学→求职 | `career.js` qualification(0.3-2.0x)/ability(35-72)/label | ✅ |
| Encounter联动 | 全面接入 isRape/psychology.addAddiction/addGuilt/addCorruption/criminal.addRecord/stamina | ✅ |

---

## 待实施清单 (13个任务)

---

### P1: 体力消耗接入所有行动 ⭐⭐⭐

**目标**: 每个玩家操作消耗体力(femaleStamina改名)，体力=0时禁止消耗行动，每月1日自动回满。

**设计细节**(已确认):
```
行动消耗表:
  学习(每科):        -15~20
  工作(专注/人脉等): -10~25
  社交(聊天/约会):    -5~10
  街区旅行(单次):    -15~25
  红灯区:            -30~40
  交欢(整场 finish):  -30
  求职申请:          -10
  锻炼:              -15

体力耗尽: 保持当前速度。玩家自行等待下月1日回复(10x=0.25秒)。
不可操作消耗体力的行动(提示"体力不足")。
```

**实现文件**:
| 文件 | 改动 |
|------|------|
| `scripts/features/stamina-system.js` | **新建**: `ensure(state)`, `spend(state, amount) → {ok,message}`, `canAct(state, amount) → bool` |
| `scripts/engine/education-system.js` | 学习行动开头: `var st = staminaSystem.spend(state, U.between(15,20)); if(!st.ok) return st;` |
| `scripts/features/career.js` | `work()`开头: `staminaSystem.spend(state, 15)` |
| `scripts/features/social.js` | `interact()`中根据type开销体力(chat=5/meal=8/date=10/gift=5等) |
| `scripts/features/travel.js` | `startTravel()`: 根据街区类型开销(公园=15/红灯区=35/商业街=20) |
| `scripts/features/brothel-system.js` | `start()`: `staminaSystem.spend(state, 30)` |
| `scripts/features/encounter-system.js` | `finish()`中已有 `state.stamina.current -= 30`, 确认无误 |
| `scripts/engine/systems-state.js` | 已有 `state.stamina = {current:100, max:100}` |
| `scripts/ui/career-panels.js` | 每个面板显示体力提示 `<small>当前体力 {n} / 需要 {n} 体力</small>` |
| `index.html` | 已有 stamina-ring SVG |

**验收**:
1. 学习→体力扣15→SVG环实时变小
2. 体力=5后尝试学习→提示"体力不足，等待下月回复"
3. 10x速→每月1日自动回满→SVG环恢复

---

### P2: 科目系统 + 学习面板UI ⭐⭐⭐

**目标**: 替换preparation/discipline/examTechnique三数字，改为每科独立studyHours+aptitude+examScore。

**数据模型**:
```js
// systems-state.js ensure()
state.education.subjects = {}  // 首次进入学习时初始化
// { 语文: {studyHours: 0, examScore: 0, aptitude: 0}, 数学: {...}, ... }
// aptitude: 名字哈希随机(34-87), 体现天生偏科。首次学习时计算。

// education-system.js — 各阶段科目池+满分
var STAGE_SUBJECTS = {
  primary: { '语文':100, '数学':100, '英语':100, '科学':100 },
  middle:  { '语文':130, '数学':130, '英语':130, '政治':50, '历史':50, '物理':100, '化学':100 },
  high:    { '语文':150, '数学':150, '英语':150 },  // + 3门选科(各100分, 从track+electives获得)
  vocational: { '语文':100, '数学':100, '英语':100, '专业技能':150 },
};
function getStageSubjects(state) {
  var base = STAGE_SUBJECTS[state.education.schoolStage] || STAGE_SUBJECTS.primary;
  var result = {};
  Object.keys(base).forEach(function(k) { result[k] = base[k]; });
  if (state.education.schoolStage === 'high' && state.education.track) {
    result[state.education.track === '物理' ? '物理' : '历史'] = 100;
    (state.education.electives || []).forEach(function(e) { result[e] = 100; });
  }
  return result;
}
```

**学习面板UI** — 科目卡片网格(2列):
```html
<!-- 每张卡片 -->
<div class="subject-card">
  <span class="subj-name">数学</span>
  <span class="subj-max">150分</span>
  <span class="subj-stars">★★★★★ 天赋83</span>
  <div class="subj-bar"><i class="bar-track"><b style="width:48%"></b></i><em>72h</em></div>
  <small>上次考试: 118分</small>
  <button data-learn-subject="数学">📖 学习 -15体</button>
</div>
```

天赋星级映射: >=80★5, 65-79★4, 50-64★3, 35-49★2, <35★1

**学习逻辑**:
```js
function learnSubject(state, subject) {
  var stamina = Game.staminaSystem.spend(state, U.between(15, 20));
  if (!stamina.ok) return stamina;

  var subj = ensureSubject(state, subject);
  var efficiency = subj.aptitude / 100 * 0.6 + state.stats.智力 / 100 * 0.3 + 0.1;
  var baseGain = U.between(8, 15);
  var gain = Math.round(baseGain * efficiency);

  // 厌学惩罚
  var burnout = state.education.burnout || 0;
  if (burnout >= 50) gain = Math.round(gain * 0.7);
  if (burnout >= 80) gain = Math.round(gain * 0.3);
  subj.studyHours += gain;

  // 厌学累积
  state.education.burnout = U.clamp(burnout + U.between(3, 8), 0, 100);
  state.stamina.current = Math.max(0, state.stamina.current - U.between(15, 20));

  // 随机学习事件
  Game.studyEvents && Game.studyEvents.maybeTrigger(state, subject);

  Game.lifeDirector.addLog(state, '学习', subject + '学习+' + gain + 'h' + (burnout>=50?' (厌学中,效率降低)':''), 'good');
  return { ok: true, message: subject + ' +' + gain + 'h' };
}
```

**厌学值系统**(已确认):
```
每次学习+3~8
每天自然-1(不学习时)
0-30: 正常
30-50: 效率-20%
50-70: 效率-40%, 心情-3/月
70-85: 效率-70%, 不能连续学同一科(需换科目)
85-100: 无法学习任何科目。必须"休息"(跳过3天, -20厌学)
```

**考试**(中考15岁6月, 高考18岁6月):
```
时间: 持续2天(每天考3科)
考后: 3-5天等待期(心情-5), 全部出分→触发志愿填报
```

每科独立roll:
```js
function examScore(subj, maxScore, state) {
  var burnout = state.education.burnout || 0;
  var rate = U.clamp(
    0.16 + subj.studyHours/200*0.35 + subj.aptitude/100*0.2
    + state.stats.智力/100*0.12 + state.stats.健康/100*0.05
    + state.stats.心情/100*0.04 + (state.health.sleep||7)/8*0.03
    - burnout/100*0.05 - (Math.random()-0.5)*0.16
  , 0.22, 0.93);
  return Math.round(maxScore * rate);
}
```

**实现文件**:
| 文件 | 改动 |
|------|------|
| `scripts/ui/subject-panel.js` | **新建**: `renderSubjects(state)`, `handleClick(event)` |
| `scripts/engine/education-system.js` | 重写: 新增 `getStageSubjects/ensureSubject/learnSubject/getAptitude`, 重写 `exam()` 使用每科studyHours |
| `scripts/engine/systems-state.js` | `ensure()`中新增 `state.education.subjects` + `state.education.burnout` |
| `index.html` | 新脚本引用 |
| `style.css` | `.subject-card` 网格卡片CSS |

**验收**: 小学4科卡片, 初中7科, 高中3+3科。天赋★化显示。考试每科独立roll。

---

### P3: 大学4学年体验 ⭐⭐

**目标**: 42个月不走快进, 4个学年有两个精简pendingDecision事件。

**学年结构**(已确认):
```
学年1(月1-12):  基础课(自动)。结识同学。新生适应。
学年2(月13-24): 专业课。社团活动。暑期实习可能(月18-24, 概率触发)。
学年3(月25-36): 深度专业课。实习招聘季 pendingDecision(本学年内随机触发)。
学年4(月37-42): 毕业论文 pendingDecision(月42)。求职季。
```

**实习招聘季 pendingDecision**(第3学年):
```
title: 大三实习招聘
text:  各大公司来校园招聘。选择一个方向——
options:
  ['bigtech', '冲刺大厂(竞争激烈但成功起薪x1.3)', '录取率基于智力+大学资源']
  ['normal',  '选择普通公司(稳妥)', '无风险加5点经验']
  ['skip',    '不找实习(省钱省时间)', '无影响']
```

**毕业论文 pendingDecision**(第4学年末月42):
```
自动通过(智力>30), 否则延迟6个月再答辩
通过→ state.education.graduated = true → 可以求职
```

**无GPA**。毕业分"正常毕业"和"优秀毕业生"(智力+专业aptitude>阈值140→求职额外+5%录取率)。

**实现文件**:
| 文件 | 改动 |
|------|------|
| `scripts/features/university-life.js` | **新建**: `monthly(state)`, `checkYear(state)`, `triggerInternship(state)`, `triggerThesis(state)` |
| `scripts/engine/monthly-systems.js` | 新增 `Game.universityLife?.monthly(state)` |
| `scripts/engine/systems-state.js` | `ensure()`中新增 `state.education.universityYear`(1-4) + `state.education.internshipDone`(bool) |

**验收**: 入学→第3学年触发实习选择→第4学年末→论文→毕业→求职。

---

### P4: 角色详情页重构 — 人生履历时间轴 ⭐⭐

**目标**: 每个NPC底部追加交错卡片时间轴, 追踪完整人生。详情页从单栏"立绘→折叠块"改为"小头像+信息→折叠块→时间轴"。

**数据模型**(已确认):
```js
person.lifeResume = [
  { age: 0,  event: '出生',   detail: '出生在北京', month: 0 },
  { age: 6,  event: '入学',   detail: '进入北京向日葵幼儿园' },
  { age: 12, event: '升学',   detail: '进入北京启明小学' },
  { age: 22, event: '就业',   detail: '加入云帆科技担任软件工程师' },
  { age: 28, event: '被捕',   detail: '被司法机关拘留' },
  { age: 30, event: '刑满释放', detail: '重获自由' },
  { age: 32, event: '死亡',   detail: '因慢性疾病离世' },
]
// 最多30条, 超出删除最旧(保留出生+死亡)
// 以NPC视角写(不直接写玩家名字): "遭遇了一次暴力事件" 而非 "被{玩家名}强奸"
// 已故NPC: 最后一条标灰 + 整条时间轴灰色调
// 旧存档NPC: 首次查看时回溯生成所有历史记录
```

**自动追踪触发点**(在哪里调用 `recordEvent(person, event, detail)`):
| 触发时机 | 代码位置 |
|---------|---------|
| 进入新学校 | `npc-life.js` education() 中 `person.educationName` 变化时 |
| 毕业 | education()中 `educationStage` 变为 graduate/workforce |
| 首次就业 | `npc-life.js` career() 中首次设置 `person.job` |
| 结婚 | `npc-life-support.js` relationships() 中 `npcMarried=true` |
| 生子 | `demography.js` deliver() |
| 职业变更 | npc-life 中 jobName 变化 |
| 被捕 | `criminal-system.js` arrest() |
| 出狱 | `criminal-system.js` serveJail() 末尾 |
| 整容 | `plastic-surgery.js` perform() 成功时 |
| 偶像退役/转型 | `idol-system.js` transitionCareer() |
| 地下偶像坠落 | `idol-underground.js` fallCheck() 滑落时 |
| 死亡 | `mortality.js` / `legacy-system.js` prepareDeath() |

**时间轴UI**(卡片错开排列):
```html
<div class="timeline">
  <article class="timeline-card left">
    <time>0岁</time><strong>出生</strong><span>出生在北京</span></article>
  <article class="timeline-card right">
    <time>6岁</time><strong>入学</strong><span>进入北京向日葵幼儿园</span></article>
  <article class="timeline-card left deceased">
    <time>32岁</time><strong>离世</strong><span>因慢性疾病离世</span></article>
</div>
```

**详情页布局**(单栏滚动):
```
┌─ 小头像 + 姓名/年龄/性别/职业 ─┐
├─ 折叠: 外貌表现 ──────────────┤
├─ 折叠: 遗传信息 ──────────────┤
├─ 折叠: 互动选项 ──────────────┤
├─ 时间轴 ─────────────────────┤  ← 新增, 放在最后面
│  ┌─ 0岁 出生 ─────────────┐  │
│  │    ┌─ 6岁 入学 ────┐   │  │
│  │    │               │   │  │
└──┴────┴───────────────┴───┴──┘
```

**实现文件**:
| 文件 | 改动 |
|------|------|
| `scripts/ui/life-resume.js` | **新建**: `ensureResume(person)`, `recordEvent(person, event, detail)`, `renderResume(person) → HTML`, `backfillResume(state, person)` 回溯生成旧存档 |
| `scripts/engine/npc-life.js` | `updatePerson()`关键节点调用 `lifeResume.recordEvent()` |
| `scripts/engine/npc-life-support.js` | relationships()结婚/生子调用 |
| `scripts/engine/demography.js` | deliver()生子调用 |
| `scripts/features/criminal-system.js` | arrest()/serveJail()调用 |
| `scripts/features/plastic-surgery.js` | perform()调用 |
| `scripts/features/idol-system.js` | transitionCareer()调用 |
| `scripts/features/idol-underground.js` | fallCheck()滑落调用 |
| `scripts/engine/mortality.js` | 死亡调用 |
| `scripts/ui/navigation.js` | `characterHtml()`末尾追加 `Game.lifeResume.renderResume(person)` |
| `scripts/engine/systems-state.js` | `ensurePerson()`中已有 `person.lifeResume`(空数组) |
| `style.css` | `.timeline`, `.timeline-card.left`, `.timeline-card.right` CSS |

**验收**: 任意NPC→详情页底部时间轴。新建NPC自动追踪。旧存档首次查看回溯生成。

---

### P5: 多角关系UI ⭐⭐

**当前状态**: 怀疑度/对峙/离婚/复合逻辑已实现(`family-conflict.js`)。包养/炮友/开放式婚姻**无UI入口**。

**实现文件**:
| 文件 | 改动 |
|------|------|
| `scripts/features/relationship-panel.js` | **新建**: 独立关系管理面板。显示所有伴侣(姓名/类型/affection/嫉妒值)。按钮: 提议开放婚姻/提议炮友/开始包养/分手。 |
| `scripts/features/social.js` | `detailActions()`: 新增 `['propose-open', '提议开放婚姻']`, `['fwb', '提议炮友关系']`, `['sugar', '提议包养']` |
| `scripts/features/family-conflict.js` | 新增 `proposeOpenMarriage(state, partnerId)`, `proposeFWB(state, partnerId)`, `startSugarBaby(state, partnerId, monthlyAmount)` |

**关系面板UI**:
```html
<div class="relationship-panel">
  <h4>伴侣关系 · {count}人</h4>
  {伴侣列表: 姓名 | 关系类型(婚姻/恋人/炮友/包养) | affection | 嫉妒值 | 操作按钮}
</div>
```

**验收**: 多伴侣时→家庭面板中看到关系面板→每人独立嫉妒值→可转换关系。

---

### P6: 毕业转型UI ⭐

**目标**: 偶像点击毕业公演后, 弹出转型方向选择。

**当前状态**: `graduationConcert()` + `transitionCareer()` 已实现, render中有毕业公演按钮。缺转型选择UI。

**实现**:
```js
// graduationConcert() 末尾设置:
state.pendingDecision = {
  type: 'idolTransition',
  title: '偶像毕业 — 选择未来方向',
  text: '你的偶像生涯走到了终点。粉丝们会记住你。现在，选择下一个方向——',
  options: [
    {value:'welfare', label:'福利姬 · 继承30%粉丝 · 金主约会x1.5'},
    {value:'coser',   label:'职业Coser · 继承25%粉丝 · 漫展x1.5'},
    {value:'vtuber',  label:'虚拟主播 · 继承35%粉丝 · 直播x1.3'},
    {value:'beautyblog', label:'美妆博主 · 继承20%粉丝 · 品牌x1.3'},
    {value:'retire',  label:'彻底引退 · 无加成'},
  ]
};
```

`actions.js decide()` 中新增 `idolTransition` 分支→调用 `transitionCareer(state, value)`。

**实现文件**: 仅 `idol-system.js` (graduationConcert末尾 + actions处理)

**验收**: 28岁→毕业公演→弹出5个转型按钮→选择→职业切换+粉丝继承+履历记录。

---

### P7: 社交卡片 assault 按钮 ⭐

**目标**: 联系人/邂逅NPC的社交互动菜单中出现"暴力侵犯"选项。

**条件**: 对方为女性、健康、同城、非直系亲属(kinship excluded)、年龄≥18

**实现文件**:
| 文件 | 改动 |
|------|------|
| `scripts/features/social.js` | `detailActions()`: 符合条件时追加 `['assault', '暴力侵犯']` |
| `scripts/features/travel.js` | `renderEncounters()`: 邂逅NPC卡片中的互动选项也加assault |
| `scripts/controllers/extended-interactions.js` | `handle(event, state, finish)`: 检测 `[data-contact-action="assault"]` → `finish(Game.rapeEncounter.initRape(state, partner, 'contact'))` |

**验收**: 女性联系人卡片→互动菜单→"暴力侵犯"→点击→进入强奸交欢(抵抗条+堕落累积)。

---

### P8: 公司创建向导接入 ⭐⭐

**目标**: `company-system.js`(864行)有完整4步向导逻辑(`state.companyCreationStage`), 但UI未渲染。

**问题**: 资产页只有老的简单"购入产业"按钮。公司创建向导HTML从未被渲染。

**实现**:
```js
// career-panels.js routePanel() 中:
if (state.companyCreationStage && state.companyCreationStage.active) {
  return Game.companySystem.renderCreationStage(state);  // ← 当前缺失
}
```

`company-system.js` 的 `renderCreationStage()` 按stage渲染:
```
stage 0: 7个行业选择按钮(餐饮/科技/零售/娱乐/制造/金融/成人)
stage 1: 3个性质按钮(个人独资/有限责任公司/合伙)
stage 2: 名称输入(系统随机+可改) + 投资金额
stage 3: 3个策略按钮(保守/激进/差异化)
```

**实现文件**:
| 文件 | 改动 |
|------|------|
| `scripts/ui/career-panels.js` | `routePanel()` 检测 creationStage → 渲染创建向导 |
| `scripts/features/company-system.js` | `renderCreationStage()` 完善HTML |

**验收**: 资产页→点击"创建公司"→4步向导→公司成立→显示在经营面板。

---

### P9: 皮条客经营面板 ⭐⭐

**目标**: `career-panels.js` 的 `pimpPanel()` 从未被调用(皮条客不是系统职业ID)。

**实现文件**:
| 文件 | 改动 |
|------|------|
| `scripts/data/world-data.js` | 新增 `{id:'pimp', name:'皮条客', company:'自营妓院', industry:'风俗业', salary:8000, need:30, category:'社交', education:0, tier:3, freelance:true, recommendedGender:'男'}` |
| `scripts/features/brothel-system.js` | 收购会所后自动设置 career 为皮条客 |
| `scripts/ui/career-panels.js` | `routePanel()` 检测 jobId==='pimp' → 调用 `pimpPanel(state)` |

**验收**: 资产足够→红灯区收购会所→career=皮条客→经营面板(妓女列表/客流量/警察风险)。

---

### P10: 黑市商人面板 ⭐

**目标**: `career-panels.js` 的 `blackMarketPanel()` 从未被调用。

**实现文件**:
| 文件 | 改动 |
|------|------|
| `scripts/data/world-data.js` | 新增 `{id:'blackmarket', name:'黑市商人', company:'地下市场', industry:'黑市', salary:5000, need:25, category:'商业', education:0, tier:3, freelance:true}` |
| `scripts/features/criminal-system.js` | 新增 `enterBlackMarket(state)` — 设置 career 后路由到 blackMarketPanel |
| `scripts/ui/career-panels.js` | `routePanel()` 检测 jobId==='blackmarket' → 调用 `blackMarketPanel(state)` |

**验收**: 犯罪值>0→选择"进入黑市"→库存面板→6种商品买卖。

---

### P11: 大学排名→求职面板标注 ⭐

**目标**: 高端职位卡片显示学历偏好，可视化大学质量差异。

**设计**(已确认):
```
仅高端岗位标注(管理层/董事/高管):
  技术总监   — [偏好: 顶尖大学级别]
  CTO       — [要求: 顶尖大学毕业]
普通岗位不标注。标注在职位卡片的`<small>`行中。
```

**实现**:
```js
// career-view.js renderCareer() 中每个job卡片:
var prestigeHint = '';
if (job.tier <= 1 && job.education >= 3) {
  prestigeHint = '<small class="prestige-hint">偏好: 顶尖大学毕业生</small>';
}
```

**实现文件**: 仅 `scripts/ui/career-view.js`

**验收**: 华夏大学毕业→看到高管职位标注。高职毕业→看不到标注(仅普通岗位)。

---

### P12: 考试延迟出分 ⭐⭐

**目标**: 中考/高考成绩考后3-5天焦虑等待, 不立即出分。

**设计**(已确认):
```
考试日(Day 1-2): 时间暂停, 每天考3科。每天log部分科目成绩。
考后(Day 3-7): 时间恢复正常速度。心情-5(焦虑)。
Day 8: 触发 pendingDecision → 全部成绩公布+总分排名 → 志愿填报。
```

**实现文件**:
| 文件 | 改动 |
|------|------|
| `scripts/features/exam-system.js` | **新建**: `conductExam(state, type)`, `revealResults(state)` — 使用timeSystem追踪 |
| `scripts/controllers/actions.js` | `decide()`: examResults分支 → 触发志愿填报 |
| `scripts/engine/education-system.js` | `exam()` 不再立即可用, 改为调用 `examSystem.conductExam()` |

**验收**: 考试日暂停→每日log出分→3天后总分公布→志愿填报。

---

### P13: 学习随机事件 ⭐⭐

**目标**: 学习期间概率触发事件, 加入叙事变化。

**设计**(已确认):
| 事件 | 效果 | 概率/次学习 |
|------|------|-----------|
| 同学约图书馆 | 该科studyHours+10, 与该同学affection+3 | 8% |
| 老师表扬进步 | 心情+5, 该科+5h | 5% |
| 发现高效学习法 | 该科+15h | 3% |
| 考前焦虑失眠 | 睡眠-2天, 考试debuff(扣分-3%) | 10%(仅考前7天内触发) |

**实现**:
```js
// study-events.js
function maybeTrigger(state, subject) {
  if (Math.random() >= 0.08) return null;
  var events = [...]; // 根据条件筛选
  var evt = events[Math.floor(Math.random() * events.length)];
  // 应用效果
  Game.lifeDirector.addLog(state, '学习插曲', evt.text, 'good');
  return evt;
}
```

**实现文件**: 仅 `scripts/features/study-events.js` (新建)

**验收**: 连续学习多科后概率触发→log出现→效果自动应用。

---

## 实施计划

```
第1轮(并行3个Agent):
  P1  体力接入 (stamina-system.js新建 + 6个文件改写)
  P2  科目系统 (subject-panel.js新建 + education-system重写)
  P4  角色详情重构 (life-resume.js新建 + 8个文件加recordEvent调用)

第2轮(并行3个Agent):
  P3  大学体验 (university-life.js新建)
  P5  多角关系UI (relationship-panel.js新建 + social.js/family-conflict.js扩展)
  P8  公司创建向导 (company-system.js + career-panels.js)

第3轮(并行2个Agent):
  P7  assault按钮 (social.js + travel.js + extended-interactions.js)
  P11 大学标注 (career-view.js)

第4轮(并行3个Agent):
  P6  毕业转型UI (idol-system.js)
  P9  皮条客 (world-data.js + brothel-system.js + career-panels.js)
  P10 黑市 (world-data.js + criminal-system.js + career-panels.js)

第5轮(并行2个Agent):
  P12 考试延迟 (exam-system.js新建 + actions.js + education-system.js)
  P13 学习事件 (study-events.js新建)

总计: 13任务, 5轮, 15-25个文件, 约3000-5000行代码
```
