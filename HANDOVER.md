# 华夏人生 — 开发交接文档

## 日期
2026-07-22

## 本次会话完成内容

### 新增系统（4个大模块）

#### 1. 幽诡系统（supernatural-specter）
- **文件**: `scripts/features/supernatural-specter.js` (~600行), `scripts/ui/supernatural-view.js` (~55行)
- **核心机制**:
  - 3种幽诡类型：怨灵(HP200)/恶煞(HP280)/魅妖(HP160)
  - 3阶段寄生：潜伏→显形→掠食，不可逆，宿主无法救回
  - 月度生成：2%概率，优先寄生高affection人物
  - 8种袭击事件：夜间尾随/午夜敲门/枕边人/袭击（触发战斗）/血色晚宴等
  - 战斗系统：回合制，幽诡HP 160-280，玩家HP 100，逃跑60%
  - **男性寄生**：显形期5月+→性别强制女，体态/发式/衣着全部女性化，魅力70+，职业→妓女
  - 被寄生者性欲失控→自动注册妓女→掠夺期拖家庭成员进红灯区
- **集成点**: systems-state/月管线/交互路由/supernaturalView在刷新管线

#### 2. 魔法少女系统（magical-girl）
- **文件**: `scripts/features/magical-girl-core.js` (~140行), `scripts/features/magical-girl-system.js` (~235行), `scripts/features/magical-girl-contract.js` (~110行), `scripts/ui/magical-girl-view.js` (~80行)
- **核心机制**:
  - 隐藏职业：12-18岁女性，幽诡袭击后awareness≥50触发契约
  - 3种使魔：露娜/星夜/银铃，各不同契约文案
  - 4阶段：见习→契约→觉醒(5杀)→终焉(12杀)→魔女化(灵魂宝石归零)
  - 5阶段巡逻猎杀：线索追踪→锁定目标→对质→揭露→决战
  - 每阶段3个选项，各有消耗/奖励/净化尝试
  - 战斗加成：攻击+魔力×0.45，HP上限+魔力×0.55
  - 灵魂宝石：击杀+5，月消耗-2
  - 对质阶段起显示原主身份档案（姓名/关系/原职业/性格）
- **职业管线**: world-data→VENUE_JOBS→ability公式→应聘主属性→onJobChange→面板路由
- **集成点**: 幽诡战斗加成/感知阈值降为30/career管线完整接入

#### 3. 摇篮改造机构（cradle-institution）
- **文件**: `scripts/features/cradle-institution.js` (~280行), `scripts/ui/cradle-view.js` (~55行)
- **核心机制**:
  - 女12-17岁华夏城市，父母affection<30/贫困/学习差→入狱风险
  - 两种改造：日本化（遗忘汉语/身体改造/18岁卖日）和幻梦Cos服（从204个现有Cos角色随机）
  - 囚禁UI：改造进度+精神抵抗条，4行动按钮（顺从/抵抗/观察/伪装）
  - 5种月度事件：电击/语言测试/交欢调教/囚徒互助/禁闭
  - 逃跑：3次观察解锁，基础8%+条件加成
  - 卖到日本：改造100→日本随机城市，职业妓女，可自由行动

#### 4. 家庭系统优化
- **新文件**: `scripts/ui/family-dashboard.js` (~150行), `scripts/features/family-events.js` (~180行), `scripts/features/adoption-system.js` (~190行)
- **修改文件**: family-conflict.js, parenting.js, family-system.js
- **改进项**:
  - 统一家庭总览页（替换散落的三页面）
  - 家庭成员单列展示：44px立绘+姓名/关系/年龄/性格/职业+好感条+幽诡标记
  - 冲突预警：疑心≥30红色/金色警告条
  - 每子女独立养育策略（非全局统一）
  - 成年子女可互动（经济支援/关心近况）
  - 收养系统：角色册独立子页面，25岁+，收6-12岁养子养女，不限性别
  - 家庭事件：聚餐/代际冲突/亲戚来访/子女叛逆/婚礼/丧礼

### 参数调整
- `npc-cultural-style.js`: 媚日概率 22%→5%

---

## 管道架构回顾

```
app.js refresh():
  → healthSafety.repair()
  → view.render()
  → supernaturalView.render()      // 幽诡战斗遮罩+感知面板
  → cradleView.render()            // 囚禁面板
  → familyDashboard.render()       // 家庭总览
  → adoptionSystem.renderOrphanage() // 福利院渲染
  → lifeLoop.render()
  → actions.renderDecision()
```

```
monthly-systems.js run():
  ...28个已有系统...
  → supernaturalSpecter.monthly()   // 幽诡生成/阶段/袭击/交欢行为/男性女性化
  → familyEvents.monthly()         // 家庭事件随机
  → magicalGirlSystem.monthly()    // 魔力衰减+巡逻+契约触发
  → cradleInstitution.monthly()    // 囚禁进度+入狱判定
  → magicalGirlSystem.monthly()    // (先执行familyEvents再magic)
  → lifeEvents.maybeTrigger()
```

```
interaction-router.js handle() 链:
  ...已有handlers...
  → supernaturalSpecter.handleClick()  // 幽诡战斗/质问
  → magicalGirlSystem.handleClick()    // 巡逻/许愿/任务选项
  → cradleInstitution.handleClick()    // 囚禁行动
  → adoptionSystem.handleClick()       // 收养按钮
  ...
```

---

## 状态结构新增字段

```js
state.supernatural = { enabled, specters[], playerAwareness, spiritCorruption, combat{} }
state.magicalGirl = { active, stage, magicPower, soulGem, kills, contracts[], familiar, corruption, wish, activeMission{} }
state.cradle = { imprisoned, reformType, reformProgress, mental, inmateId, dailyLog[], escapeAttempts, soldToJapan, orderCharacter }
state.familyEvents = []
state.familyEventsLastMonth
state.adoption = { orphans[], lastRefreshMonth, adoptedCount }
```

---

## 已知待办/后续方向

1. **隐界系统** — 魔法少女世界观拓展，城市维度可能需要在config.js新增隐藏城市
2. **魔法少女人形化/使魔深化** — 与npc-life联动，使魔可作为NPC出现
3. **摇篮机构NPC背景运行** — 目前仅玩家入狱，NPC的机构关押是背景模拟
4. **幻梦Cos服从catalog动态选取** — 目前随机取，可以加入"金主订单"按系列筛选
5. **女性幽诡寄生男性** — 当前只实现了男→女方向
6. **代际传承完善** — 房产/股票/债券在legacy.resolve中未实际转移
7. **家庭全景可视化** — 族谱树形图
8. **UI美化** — 遵循`ui-design-guidelines.md`，当前新模块已部分引用但仍有内联样式

---

## 测试要点

- 幽诡寄生频率（2%/月，最多5只）是否合理
- 魔法少女契约触发条件（女12-18岁+被袭击6月内+awareness≥50）
- 巡逻猎杀5阶段按钮在战斗中的表现
- 摇篮入狱频率（risk累计公式）是否过高/过低
- 逃跑成功后家庭关系是否正确destroy
- 收养后子女在家庭总览中的显示
- 男性幽诡女性化后外貌是否正确更新
- 所有新系统的存档迁移（旧存档缺state字段→ensure补充）

---

## 文件清单

### 新建文件（11个）
| 路径 | 行数 |
|---|---|
| `publish/scripts/features/supernatural-specter.js` | ~600 |
| `publish/scripts/ui/supernatural-view.js` | ~55 |
| `publish/scripts/features/magical-girl-core.js` | ~140 |
| `publish/scripts/features/magical-girl-system.js` | ~235 |
| `publish/scripts/features/magical-girl-contract.js` | ~110 |
| `publish/scripts/ui/magical-girl-view.js` | ~80 |
| `publish/scripts/features/cradle-institution.js` | ~280 |
| `publish/scripts/ui/cradle-view.js` | ~55 |
| `publish/scripts/features/family-events.js` | ~180 |
| `publish/scripts/features/adoption-system.js` | ~190 |
| `publish/scripts/ui/family-dashboard.js` | ~150 |
| **总计** | **~2075行** |

### 修改文件（15个）
| 路径 | 改动要点 |
|---|---|
| `publish/app.js` | refresh管线+3行 |
| `publish/index.html` | 脚本引用+子页面容器 |
| `publish/scripts/engine/systems-state.js` | ensure注册 |
| `publish/scripts/engine/monthly-systems.js` | 月度管线 |
| `publish/scripts/engine/npc-cultural-style.js` | 22→5 |
| `publish/scripts/controllers/interaction-router.js` | handleClick注册+parenting子ID |
| `publish/scripts/controllers/actions.js` | mgContract+gen-conflict处理 |
| `publish/scripts/data/world-data.js` | magicalgirl职业定义 |
| `publish/scripts/data/company-catalog.js` | VENUE_JOBS加入magicalgirl |
| `publish/scripts/features/career.js` | ability+onJobChange |
| `publish/scripts/features/career-action-resolution.js` | 应聘主属性 |
| `publish/scripts/features/career-ladders.js` | 特殊排除 |
| `publish/scripts/features/job-market-capacity.js` | LOW_THRESHOLD+demand |
| `publish/scripts/ui/career-view.js` | 面板路由 |
| `publish/scripts/ui/career-office-panel.js` | usesLegacyPanel |
| `publish/scripts/features/family-conflict.js` | 移除details折叠 |
| `publish/scripts/features/parenting.js` | 每子女独立策略 |
| `publish/scripts/features/family-system.js` | 成年子女+养子互动 |
