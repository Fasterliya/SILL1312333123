<!-- ⚠ 禁止删除本文件任何内容 — 这是永久设计文档 -->
# 方向九：时间系统重构 + 体力系统 + 教育系统重写

## 概述

三个关联系统的一体化改造。分两阶段实施：先时间+体力（架构级），后教育重写。

---

## 第一部分：时间系统重构

### 数据模型

```js
state.day = 1;           // 1-30 (每月30天)
state.timeSpeed = 0;     // 0=暂停, 1=1x, 5=5x, 10=10x
state.totalMonths        // 保持不变, 月度结算用
state.year, state.month  // 保持不变, timeSystem.syncCalendar()继续使用
```

### 速度映射

| 速度 | 现实时间/天 | 现实时间/月 | 用途 |
|------|-----------|-----------|------|
| ⏸ 暂停 | — | — | 查看信息、做决策、使用体力行动 |
| ▶ 1x | 2秒 | 60秒 | 观察日常、慢慢体验 |
| ▶▶ 5x | 0.4秒 | 12秒 | 常规快进 |
| ▶▶▶ 10x | ~0.03秒 | ~1秒 | 快速跳过等待期 |

### 自动推进循环 (app.js)

```js
let timeInterval = null;

function startTimeLoop() {
  timeInterval = setInterval(() => {
    const s = state;
    if (!s || s.timeSpeed === 0 || s.pendingDecision || s.gameOver) return;
    const ticksPerCall = s.timeSpeed >= 10 ? 30 : (s.timeSpeed >= 5 ? 6 : 1);
    for (let i = 0; i < ticksPerCall; i++) {
      s.day += 1;
      if (s.day > 30) {
        s.day = 1;
        s.totalMonths += 1;
        Game.timeSystem.syncCalendar(s);
        Game.monthlySystems.run(s);
        s.stamina.current = s.stamina.max;
        /* daily log events at month boundary */
      }
      /* daily random log events */
      if (Math.random() < 0.08) dailyLogEvent(s);
    }
    refresh();
  }, 1000 / getTickRate(s.timeSpeed));
}
```

### pendingDecision自动暂停

```js
// 在 setState 或 refresh 中检测
if (state.pendingDecision && state.timeSpeed > 0) {
  state.timeSpeed = 0;  // 自动暂停
  Game.view.showToast('重要事件需要你的决定', 'warning');
}
```

### UI：顶部时间条

删除底部 `#monthBtn` 和 `#yearBtn`。替换为顶部常驻时间条：

```html
<div class="time-bar" id="timeBar">
  <span class="time-date">{year}年{month}月{day}日</span>
  <div class="time-progress">
    <i class="bar-track"><b style="width:{day/30*100}%"></b></i>
    <small>本月剩余 {30-day} 天</small>
  </div>
  <div class="time-controls">
    <button data-time-speed="0" class="{active}">⏸</button>
    <button data-time-speed="1">▶</button>
    <button data-time-speed="5">▶▶</button>
    <button data-time-speed="10">▶▶▶</button>
  </div>
</div>
```

---

## 第二部分：体力系统

### 数据模型

```js
state.stamina = {
  current: 100,
  max: 100,
}
```

### 体力消耗表

| 行动类型 | 消耗 |
|---------|------|
| 学习(每科) | 15-20 |
| 工作(专注/人脉/培训/加班) | 10-25 |
| 社交(聊天/约会/送礼) | 5-10 |
| 街区旅行(单次) | 15-25 |
| 红灯区 | 30-40 |
| 交欢(每次体位) | 10 |
| 锻炼 | 15 |
| 求职申请 | 10 |

### 月度回复

每月1日自动：`current = max`

### 体力耗尽

保持当前速度继续流逝。玩家可选择：
- 等待时间流逝到下月1日体力回满（10x速≈几秒）
- 暂停后做其他事情（如社交消耗低）

### UI：右下角浮动圆环

```html
<div class="stamina-ring" id="staminaRing">
  <svg viewBox="0 0 100 100">
    <circle class="bg" cx="50" cy="50" r="40"/>
    <circle class="fg" cx="50" cy="50" r="40" 
      stroke-dasharray="{percent * 251} 251"/>
  </svg>
  <span>{current}/{max}</span>
</div>
```

颜色：>50绿色, 20-50黄色, <20红色

---

## 第三部分：教育系统重写

### 科目数据模型

```js
// 所有可能科目
const ALL_SUBJECTS = ['语文','数学','英语','物理','化学','生物','政治','历史','地理','科学','专业技能'];

state.education.subjects = {}  // { 语文: {studyHours: 0, examScore: 0, aptitude: 0}, ... }

// 各阶段科目池+满分:
const STAGE_SUBJECTS = {
  primary: { 语文:100, 数学:100, 英语:100, 科学:100 },
  middle:  { 语文:130, 数学:130, 英语:130, 政治:50, 历史:50, 物理:100, 化学:100 },
  high:    { 语文:150, 数学:150, 英语:150 },  // + 选科(物理/历史100 + 2门选科100)
  vocational: { 语文:100, 数学:100, 英语:100, '专业技能':150 },
}
```

### 学习面板UI

科目卡片网格。每张卡片显示：
```
┌─────────────┐
│ 数学      150│  ← 科目名 + 满分
│ ████████░░ 72│  ← 进度条 + studyHours
│ 上次考试: 118│  ← 最近一次examScore
│ [学习 -15体] │  ← 消耗体力按钮
└─────────────┘
```

不同阶段的卡片数量不同——小学4张, 初中7张, 高中3+3张。

### 学习行动

```
点击"学习"→消耗体力→该科目studyHours+{基础8-15 * 效率系数}
效率系数 = f(aptitude, 智力, 学校质量, 睡眠)
aptitude: 出生时随机(34-87), 体现天生的偏科
```

### 学习事件（随机触发）

| 事件 | 效果 | 概率 |
|------|------|------|
| 同学约图书馆 | 社交+该科studyHours+10 | 8% |
| 老师表扬 | 心情+5, 该科studyHours+5 | 5% |
| 发现高效学习法 | 该科studyHours+15 | 3% |
| 考前焦虑失眠 | 睡眠-2天, 考试debuff | 10%(考前7天内) |

### 厌学值

```js
state.education.burnout = 0;  // 0-100
```

| 厌学值 | 效果 |
|--------|------|
| 0-30 | 正常 |
| 30-50 | 学习效率-20% |
| 50-70 | 学习效率-40%, 心情-3 |
| 70-85 | 学习效率-70%, 不能连续学同一科 |
| 85-100 | 无法学习。必须休息(不消耗体力, 跳过3天)来降低 |

厌学增长：每次学习+3~8, 每天自然-1(不学习时), 休息行动-20

### 考试

```
时间: 中考(15岁6月), 高考(18岁6月)
考试持续: 2天(每天考3-4科)
考试期间: 时间自动暂停, 每天出部分成绩
考后: 3-5天等待期(心情-5), 然后全部出分→触发志愿填报
```

每科独立roll：
```js
examScore = Math.round(maxScore * clamp(
  0.16 + studyHours/maxStudy * 0.35 + aptitude/100 * 0.2 
  + 智力/100 * 0.12 + 健康/100 * 0.05 + 心情/100 * 0.04
  + 睡眠/8 * 0.03 - burnout/100 * 0.05 - random(0, 0.08)
, 0.22, 0.93));
```

### 天赋可视化

学习面板科目卡片上显示天赋星星(★1-5)：
- 天赋 >= 80: ★★★★★
- 天赋 65-79: ★★★★
- 天赋 50-64: ★★★
- 天赋 35-49: ★★
- 天赋 < 35: ★

### 大学：4学年制（走时间，不快进）

**大学每年(12月)结构**：
```
第1学年: 基础课(自动)。结识同学。新生适应。
第2学年: 专业课开始。社团活动。暑期实习机会出现(第18-24月)。
第3学年: 深度专业课。实习招聘季(第25-36月, 关键事件)。
第4学年: 毕业论文(第48月, 通过=毕业)。求职季。
```

**精简事件**（仅两个关键节点）：
- 实习招聘季(第3学年): pendingDecision→选择实习方向。影响毕业时的初始经验值
- 毕业论文答辩(第4学年末): pendingDecision→通过/不通过。通过=毕业, 不通过=延迟6个月再答辩

**无GPA**。每学年自动通过(只要没有不及格事件)。毕业时只分"正常毕业"和"优秀毕业生"(如果智力+专业天赋>某阈值)。

### 大学质量→求职管道（核心改造）

**新 `qualification()` 函数**：
```js
function qualification(state) {
  if (!state.education.graduated) return 0;
  if (!state.education.university) return 1;
  
  const school = universities.find(...);
  const resource = institutionResource(school);  // 50-99
  const prestige = 0.3 + (resource - 50) / 49 * 1.7;  // 0.3-2.0x
  const isElite = resource >= 85;  // 顶尖大学标志
  
  if (state.education.universityType === '高职专科') return Math.round(2 * prestige * 10) / 10;
  const base = isElite ? 4 : 3;
  return Math.round(base * prestige * 10) / 10;
}
// 华夏大学(资源92): 3 * (0.3 + 42/49*1.7) = 3 * 1.76 = 5.3
// 普通大学(资源65):  3 * (0.3 + 15/49*1.7) = 3 * 0.82 = 2.5
// 高职专科(资源55):  2 * (0.3 + 5/49*1.7)  = 2 * 0.47 = 0.9
```

**大学质量效果分层**：

| 大学层级 | 资源分 | 薪资乘数 | 岗位解锁 | 晋升天花板 |
|---------|--------|---------|---------|-----------|
| 顶尖(≥85) | 90+ | 1.8-2.0x | 解锁高管/董事岗位 | 无上限 |
| 优秀(≥75) | 80-89 | 1.3-1.5x | 解锁管理层岗位 | 中层以上需绩效补齐 |
| 普通(≥60) | 65-79 | 1.0x | 标准岗位 | 管理层概率极低 |
| 及格(<60) | 50-64 | 0.7x | 仅技术/服务岗 | **卡在L2, 无法晋升L3+** |

**专业对口加强**：
```js
// ability() 中:
const majorRelevance = job.majors.includes(state.education.major)
  ? 35 + Math.floor(readiness(state) / 100 * 37)  // 35-72 动态
  : (state.education.university ? -15 : 0);        // 非对口-15惩罚(大学生), 高中生无惩罚
// 无大学学历不受专业惩罚(因为没专业)
```

**终身学历效力**：
- 学位伴随整个职业生涯
- 35-45岁晋升中层以上时, 学位不足→直接卡住
- **无补救**(无在职进修)。年轻时的高考选择影响一生
- 顶尖大学毕业+专业对口 = 终身职业高速公路
- 高职毕业 = 技术岗天花板, 永远做不到管理层

**高端岗位标注**：
```
职位卡片上:
  软件工程师 — 普通岗位
  技术总监   — 【偏好: 华夏大学/东海交通大学级别】
  CTO       — 【要求: 顶尖大学毕业】
普通岗位不标注。高端岗位的学历门槛可视化。
```

---

## 第四部分：实施

### 阶段1：时间+体力（架构级）

| 文件 | 改动 |
|------|------|
| `scripts/engine/time-system.js` | 新增 day/speed 字段, dailyLogEvent函数 |
| `scripts/engine/systems-state.js` | 新增 state.day/state.timeSpeed/state.stamina |
| `scripts/features/stamina-system.js` | **新建**: 体力消耗/回复/UI圆环 |
| `app.js` | 删除advance()手动跳月, 新增startTimeLoop/setSpeed/timeTick, 删除monthBtn/yearBtn引用 |
| `view.js` | 删除monthBtn/yearBtn渲染, 新增timeBar渲染 |
| `index.html` | 新增time-bar HTML, 删除time-controls footer |
| `style.css` | 新增time-bar/stamina-ring CSS |

### 阶段2：教育重写

| 文件 | 改动 |
|------|------|
| `scripts/engine/education-system.js` | **完全重写**: 科目系统/学习事件/厌学/考试/大学快进 |
| `scripts/ui/education-view.js` | **新建**: 科目卡片网格/学习面板 |
| `scripts/controllers/admissions.js` | 保持志愿填报逻辑不变 |
| `scripts/engine/systems-state.js` | 新增subjects/burnout字段 |
| `index.html` | 新脚本引用 |
| `style.css` | 科目卡片CSS |
