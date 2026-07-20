# 已完成实施清单 — 逐方向追踪

> **日期**: 2026-07-20
> **基于**: cached-giggling-newt.md (13个系统计划) vs 实际文件系统

---

## 系统A：街区旅途全面多段式重写

**计划**: 7个街区+城市景观全部改为多段叙事，UI改为筛选芯片。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 多段叙事数据 | `scripts/data/travel-stages.js` | ✅ 完整 | 8个街区(含红灯区)+4个景点(浅草/故宫/外滩/涩谷/秋叶原)各3段 |
| 旅行交互 | `scripts/features/travel-interactions.js` | ✅ 完整 | 筛选芯片 + 多段选项点击 + assault入口 |
| 旅行核心重写 | `scripts/features/travel.js` | ✅ 完整 | 重写为startTravel()+chooseStage()+筛选UI |
| 景点多段 | `scripts/data/travel-stages.js` landmarks | ⚠ 部分 | 只有4个城市景点有专属多段，其余30+处用landmarkFallback()通用模板 |

**设计文档遗漏**: 原计划提到"新建travel-view.js"但实际写入了travel.js+travel-interactions.js，无独立view文件。✅ 不影响功能。

---

## 系统B：旅途遇见角色详情/立绘/联系方式

**计划**: 所有邂逅NPC可查看详情+生成立绘+交换联系方式。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 邂逅卡片渲染 | `travel.js` renderEncounters() | ✅ 完整 | 用 `social.card` 渲染, 包含 `data-character-id` 头像按钮 |
| 添加联系方式 | `social.js` interact('exchange') | ✅ 完整 | 复用现有逻辑 |
| 立绘生成入口 | `navigation.js` characterHtml→npcHtml | ✅ 完整 | 已有立绘面板 |
| 邂逅持久化 | `state.travel.encounters` | ✅ 完整 | 不限数量, render中显示最近6条 |

**设计文档遗漏**: 无。全部实现。

---

## 系统C：交欢UI修复

**计划**: 移动端适配 + 点击冒泡修复 + DOM容器化。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 移动端适配CSS | `style.css` | ✅ 完整 | `.encounter-overlay` max-width, vw单位, 30vh滚动 |
| 点击冒泡修复 | `encounter-system.js` handleClick() | ✅ 完整 | `event.stopPropagation()` 在所有按键处理中 |
| DOM容器 | `index.html` #encounterOverlayContainer | ✅ 完整 | 预置div, showOverlay/hideOverlay函数 |

**设计文档遗漏**: 无。全部实现。

---

## 系统D：健康疾病系统 + 整容

**计划**: 15种疾病(4类) + 5种整容手术 + 遗传影响。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 疾病池(15种) | `health-system.js` diseasePool | ✅ 完整 | 4类(常见/慢性/STD/妇科)，每种有severity/treatCost/selfHealMonths |
| STD检查 | `health-system.js` checkSTD() | ✅ 完整 | 交欢后调用, 3级风险(low/medium/high) |
| 体检+治疗 | `health-system.js` checkup()/treat() | ✅ 完整 | 体检发现隐藏疾病, 治疗扣除医保后费用 |
| 疾病自愈 | `health-system.js` monthly() | ✅ 完整 | 非致命/非不可愈疾病到期自愈 |
| 疾病叙事文本 | `health-system.js` addDisease()/monthly() | ✅ 完整 | 15种疾病+11种自愈专属叙事 |
| 整容手术 | `plastic-surgery.js` | ✅ 完整 | 5种手术(隆胸/缩胸/抽脂/处女膜修复/面部), 独立render |
| 遗传影响 | `genetics.js` cosmeticInheritance() | ✅ 完整 | inheritInto()末尾调用, BRST/BFRM/FACE基因偏移 |
| 健康安全 | `health-safety.js` | ✅ 完整 | 非致命疾病健康≥1保护, repair()修复错误game over |
| 处女膜状态 | `systems-state.js` ensurePerson() | ✅ 完整 | hymenIntact字段, 交欢/整容时更新 |
| 健康面板UI | `health-system.js` render() + `style.css` health-system.css | ✅ 完整 | 三栏布局(检测/治疗/整容) |

**设计文档遗漏**: 无。全部实现。

---

## 系统E：偶像系统 + 方向五扩展

**计划**: 练习生→出道→走红→巅峰→过气 + 团体/选举/恋爱禁止/毕业转型/黑粉。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 偶像基础(训练/出道/考评) | `idol-system.js` | ✅ 完整 | 3技能(舞蹈/声乐/表情), 12月+120分出道 |
| 握手会 | `idol-system.js` handshake() | ✅ 完整 | 500粉门槛, 3月冷却 |
| 潜规则 | `idol-system.js` castingCouch() | ✅ 完整 | 6月冷却, 制作人信任影响成功率, 可致孕 |
| 粉丝增长/过气 | `idol-system.js` monthly() | ✅ 完整 | 28岁衰减, 32岁退役, 丑闻随机曝光 |
| 偶像团体 | `idol-system.js` formGroup()/groupMonthly()/renderGroup() | ✅ 完整 | 随机团名, 凝聚力机制, 退团风险 |
| 年度总选举 | `idol-system.js` election() | ✅ 完整 | 每年1月, 排名影响粉丝和收入, 连续垫底降级 |
| 恋爱禁止合约 | `idol-system.js` signLoveBan()/breakLoveBan() | ✅ 完整 | fans+15%增长, 暴露-30%惩罚 |
| 毕业公演 | `idol-system.js` graduationConcert() | ✅ 完整 | 28岁可用, 收入=fans×0.1 |
| **毕业转型UI** | `idol-system.js` render() + handleClick() | ⚠ 逻辑存在但缺UI | transitionCareer()函数已有, graduation公演按钮已有, **但缺转型选择面板**(pendingDecision弹窗) |
| 黑粉事件 | `idol-system.js` monthlyAntiCheck() | ✅ 完整 | 4种事件类型(丑闻/谣言/私生饭/恐吓信) |
| 安保反制 | `idol-system.js` hireSecurity() | ✅ 完整 | 月费2000, 降低私生饭风险 |
| 偶像面板接入 | `career-view.js` currentJob() | ✅ 完整 | isIdolJob检测→idolSystem.render() |
| **偶像→求职面板标注** | `career-view.js` | ❌ 未实现 | 偶像职业不在正规求职中显示(自由职业) |

**设计文档遗漏**: ⚠ 毕业转型UI未介入pendingDecision。计划中的"海外发展""偶像被捕复出"也未实现(计划中但未被安排为当前优先级)。

---

## 系统F：出轨/嫉妒/家庭冲突

**计划**: 怀疑度累积/对峙/摊牌/离婚/复合 + 妓女职业家庭暴露 + 子女受影响。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 怀疑度系统 | `family-conflict.js` ensure()/addSuspicion() | ✅ 完整 | 6种怀疑度累积事件(深夜不归/异常消费/距离感/香水味/熟人/子女) |
| 对峙 | `family-conflict.js` confront() | ✅ 完整 | suspicion>=40触发, -20 suspicion但trust/conflict恶化 |
| 离婚 | `family-conflict.js` divorce() | ✅ 完整 | 现金35%给前配偶, 配偶移出family |
| 复合 | `family-conflict.js` reconcile() | ✅ 完整 | 需affection>=60, trust从40起 |
| 妓女职业家庭发现 | `family-conflict.js` monthly() | ✅ 完整 | 4种关系×2种职业专属发现文本(女儿/妹妹/母亲/配偶) |
| 子女影响 | `family-conflict.js` monthly() | ✅ 完整 | 高conflict家庭子女trust每月-2, 父母职业影响子女信任 |
| **家庭冲突UI** | `household-system.js` render() | ✅ 完整 | 嵌入household面板底部 |
| **多角关系UI** | — | ❌ 未实现 | 炮友/包养/开放式婚姻无UI入口 |
| **社交卡片转关系按钮** | — | ❌ 未实现 | 无"提议开放婚姻""提议炮友""提议包养"按钮 |

**设计文档遗漏**: 多角关系(方向四)的逻辑大部分未实现——只有怀疑度/对峙/离婚/复合这些"一夫一妻+出轨"的冲突逻辑。炮友/包养/开放婚姻这些**额外的关系类型**完全没有UI和触发机制。

---

## 方向一：色情地下产业 + 强奸犯罪

**计划**: 三种犯罪职业(皮条客/黑市/强奸) + 各国刑法 + 警察突袭 + 黑市多段 + 皮条客经营。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 犯罪系统核心 | `criminal-system.js` | ✅ 完整 | record/arrest/jail/deathPenalty/6国法律/隐匿 |
| 强奸模式 | `rape-encounter.js` | ✅ 完整 | initRape/resistance/corruption/春药迷药/reportRape |
| 交欢强奸对接 | `encounter-system.js` finish() | ✅ 完整 | isRape检测→addCorruption/addRecord/STD/pregnancy |
| 街区袭击选项 | `travel-stages.js` | ✅ 完整 | 5个街区各有一个assault选项 |
| **皮条客职业** | — | ❌ 未创建 | 计划中的 `pimp-system.js` 从未被创建。pimpPanel在career-panels中有模板但从未被调用 |
| **黑市商人** | — | ❌ 未创建 | 计划中的 `black-market.js` 从未被创建。blackMarketPanel有模板但不接入 |
| **黑市商品系统** | — | ❌ 未实现 | 6种商品(春药/迷药/成人玩具/SM道具/假证/偷拍)无购买UI |
| **皮条客经营面板** | `career-panels.js` pimpPanel() | ⚠ 有模板无接入 | 3个Tab(妓院经营/招募/财务) HTML已写, 但routePanel不会路由到它(无jobId) |
| **黑市商人面板** | `career-panels.js` blackMarketPanel() | ⚠ 有模板无接入 | 6种商品list+买入卖出按钮, 但routePanel不会路由到它 |
| 社交assault按钮 | — | ❌ 未实现 | social.js未增加assault选项, extended-interactions未处理assault |

**设计文档遗漏**: ⚠ **皮条客和黑市在计划中设计了完整的职业线和UI, 但实施时只创建了面板模板, 没有创建对应的系统文件(pimp-system.js/black-market.js), 没有在world-data.js注册职业, routePanel不会路由到这些面板。** 春药/迷药虽然在rape-encounter.js中有applyDrug/applyAphrodisiac函数, 但没有购买渠道。

---

## 方向二：心理/成瘾/创伤

**计划**: 玩家性瘾/罪恶感/堕落 + NPC创伤/自杀/反转性瘾 + 戒治所。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 心理核心 | `psychology-system.js` | ✅ 完整 | 448行, 性瘾/罪恶感/堕落/NPC创伤/自杀pendingDecision/戒治所 |
| 交欢接入 | `encounter-system.js` finish() | ✅ 完整 | addAddiction/addGuilt/addCorruption |
| NPC被奸后性瘾 | `psychology-system.js` monthly() | ✅ 完整 | trauma/3概率触发, 辞职成妓女/主动勾引 |
| NPC自杀 | `psychology-system.js` pendingDecision | ✅ 完整 | 最后一通电话→3选项(救/通知/无视) |
| 斯德哥尔摩 | `rape-encounter.js` corruptionEffectText() | ⚠ 有函数但无UI | corruption>=90文本已写, 但NPC主动献身的事件链路未接入npc-initiative |

**设计文档遗漏**: ⚠ 斯德哥尔摩的腐败度无npc-initiative事件触发。

---

## 方向三：NPC主动互动

**计划**: 8种事件类型 + iOS通知UI + 三档开关 + NPC间谣言。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| NPC事件系统 | `npc-initiative.js` | ✅ 完整 | 900行, 8种事件(前女友/金主/回头客/同学会/仇人/报案/勾引/怀孕) |
| 待处理按钮UI | `npc-initiative.js` renderEventBadge() | ✅ 完整 | 右上角📨+红色角标 |
| 事件弹出Sheet | `npc-initiative.js` renderEventSheet() | ✅ 完整 | iOS风格 bottom sheet |
| 三档开关 | `npc-initiative.js` changeFrequency() | ✅ 完整 | high/low/off |
| NPC间谣言 | `npc-initiative.js` monthly() | ✅ 完整 | rumor_spread事件类型 |
| 妓女回头客 | `npc-initiative.js` monthly() | ✅ 完整 | 记录brothel访问次数, >=3触发 |
| **路由接入** | `interaction-router.js` | ✅ 完整 | handleEventClick已注册 |

**设计文档遗漏**: 无。全部实现。

---

## 方向五：偶像产业深化

**计划**: 偶像团体/年度选举/恋爱禁止/毕业公演+转型/黑粉+反制/海外发展/偶像被捕。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 偶像团体(7项) | `idol-system.js` | ✅ 完整 | formGroup/groupMonthly/renderGroup |
| 年度选举 | `idol-system.js` | ✅ 完整 | election(), 1月触发, 排名影响粉丝/收入 |
| 恋爱禁止 | `idol-system.js` | ✅ 完整 | signLoveBan/breakLoveBan |
| 毕业公演 | `idol-system.js` | ✅ 完整 | graduationConcert() |
| 转型函数 | `idol-system.js` | ✅ 完整 | transitionCareer() — 5种方向 |
| **转型UI** | — | ❌ 未实现 | pendingDecision弹窗缺 |
| 黑粉+反制 | `idol-system.js` | ✅ 完整 | monthlyAntiCheck/hireSecurity |
| **海外发展** | — | ❌ 未实现 | 计划中有overseasDebut()但从未实施 |
| **偶像被捕** | — | ❌ 未实现 | 计划中有idolComeback()但从未实施 |
| 写真集三档尺度 | — | ❌ 未实现 | 计划中有但未实施 |
| 粉丝类型分化 | — | ❌ 未实现 | 计划中core/casual/anti/stalker四种类型 |
| 数字单曲/实体专辑/演唱会 | — | ❌ 未实现 | 计划中作为内容发行系统 |

**设计文档遗漏**: ⚠ 转型UI、海外发展、偶像被捕、写真集、粉丝类型分化、内容发行——这些在方向五设计中明确写了但**一个都没实施**。实际只实现了基础偶像+团体+选举+恋爱禁止+毕业公演+黑粉反制。

---

## 方向六：角色详情页重构

**计划**: 完整人生履历时间轴, 卡片错开排列, 自动追踪11种事件类型。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 履历数据字段 | `systems-state.js` ensurePerson() | ✅ 完整 | `person.lifeResume = []` 已初始化 |
| **履历渲染函数** | — | ❌ 未实现 | 无 `life-resume.js`, 无 `renderResume()` |
| **自动追踪** | — | ❌ 未实现 | npc-life.js等未调用recordEvent |
| **详情页接入** | — | ❌ 未实现 | navigation.js characterHtml未追加时间轴 |
| **时间轴CSS** | — | ❌ 未实现 | 无 `.timeline` / `.timeline-card.left/right` |
| **旧存档回溯** | — | ❌ 未实现 | 无 backfillResume() |

**设计文档遗漏**: ⚠ **整个方向六（角色详情页重构）完全未实施。** 只加了 `person.lifeResume=[]` 空数组以兼容未来的存档。其余数据流/UI/CSS全部缺失。

---

## 方向七：地下偶像 + 辍学

**计划**: 地下偶像3阶段(练习生→出道→滑落) + Livehouse演出 + 潜规则 + 坠落缓冲 + 转正 + 辍学系统。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 地下偶像核心 | `idol-underground.js` | ✅ 完整 | 700行, train/monthlyShow/specialShow/castingCouch/fallCheck/tryPromotion |
| 训练系统 | `idol-underground.js` train() | ✅ 完整 | 比正规偶像效率-30%, 魅力每月+0.5 |
| Livehouse演出 | `idol-underground.js` monthlyShow() | ✅ 完整 | 3层粉丝量级叙事文本 |
| 潜规则 | `idol-underground.js` castingCouch() | ✅ 完整 | 3种来源(制作人/金主/经纪人), 拒绝后可能被强迫 |
| 坠落缓冲 | `idol-underground.js` fallCheck() | ✅ 完整 | 3个月缓冲+逐月叙事 |
| 转正 | `idol-underground.js` tryPromotion() | ✅ 完整 | 缺一不可(fans+charm+钱+潜规则) |
| 团体竞争 | `idol-underground.js` groupMonthly() | ✅ 完整 | 地下团排名/活力衰减/跳槽 |
| **辍学系统** | — | ❌ 未实现 | 计划中 `state.education.dropout` 字段+12岁可选辍学+求职面板入口。**完全未实施。** |
| **地下偶像面板接入** | `career-view.js` currentJob() | ✅ 完整 | routePanel→idolUnderground |
| 地下偶像职业定义 | `world-data.js` | ❌ 缺失 | 未添加地下偶像职业ID(计划中提到但实际未添加) |

**设计文档遗漏**: ⚠ 辍学系统完全未实施。地下偶像在world-data.js中没有职业定义(可能用的是临时的非正式jobId)。

---

## 方向八: 经济/职业重构

**计划**: 税务/银行/公司/股票/职业面板/11条晋升线。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 税务系统 | `tax-system.js` | ✅ 完整 | 6国税率/年度申报/避税 |
| 银行系统 | `bank-system.js` | ✅ 完整 | 3种贷款/信用分/低保 |
| 公司系统 | `company-system.js` | ✅ 完整 | 864行, 7行业/4步向导/经营/IPO |
| **公司创建向导UI** | `career-panels.js` | ⚠ 有逻辑无渲染 | companyCreationStage存在但UI不渲染 |
| 股票董事 | `stock-director.js` | ✅ 完整 | 分红/投票/收购 |
| 职业面板分离 | `career-panels.js` | ✅ 完整 | 4面板(office/sexWork/pimp/blackMarket)+路由 |
| **11条晋升线** | — | ❌ 未实现 | 计划中详细的科技/金融/文职/医疗/教育/法律/创意/制造/服务/传媒/创作者晋升轨道, 从未实施 |
| **晋升轨道可视化** | — | ❌ 未实现 | 办公室面板的晋升Tab是空壳 |
| 大学→求职 | `career.js` | ✅ 完整 | qualification(0.3-2.0x)/ability(35-72)/label重写 |
| **大学标注** | `career-view.js` | ❌ 未实现 | 高端岗位学历偏好未显示 |

**设计文档遗漏**: ⚠ **公司创建向导不可用**(UI未渲染), **11条晋升线完全未实施**(面板的晋升Tab是空壳), **大学标注未实现**。方向八完成了约40%。

---

## 方向九: 时间/体力/教育

**计划**: ⏸/1x/5x/10x时间循环 + 体力SVG圆环 + 完整科目系统 + 厌学 + 考试延迟 + 大学4学年。

| 需求 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 时间循环 | `app.js` timeTick | ✅ 完整 | 3档速度(0.25s/1s/60s月), pendingDecision自动暂停, 空格键暂停 |
| 时间条UI | `view.js` renderTimeBar + `index.html` timeBar | ✅ 完整 | 顶部绿色条, 日期+进度+速度按钮 |
| 体力SVG | `index.html` stamina-ring + `style.css` | ✅ 完整 | 右下固定SVG圆环, 月度回复 |
| **体力接入行动** | — | ❌ 未实现 | 没有stamina-system.js, 学习/工作/社交/旅行都未消耗体力 |
| **科目系统** | — | ❌ 未实现 | preparation/discipline/examTechnique仍在使用(旧系统) |
| **学习面板UI** | — | ❌ 未实现 | 无subject-panel.js, 科目卡片网格不存在 |
| **厌学值** | — | ❌ 未实现 | 无burnout字段和逻辑 |
| **大学4学年** | — | ❌ 未实现 | 无university-life.js, 大学目前仍是用education-fast-forward快进 |
| **考试延迟** | — | ❌ 未实现 | 无exam-system.js, 考试成绩仍在考试当天即时显示 |
| **学习随机事件** | — | ❌ 未实现 | 无study-events.js |
| 大学→求职管道 | `career.js` | ✅ 完整 | qualification重写(0.3-2.0x) |
| 大学质量差异可视化 | `career.js` eligibility | ✅ 完整 | qualificationLabel/requirementLabel新增"顶尖大学"级别 |

**设计文档遗漏**: ⚠ **方向九只完成了时间+体力+大学→求职管道。其余7个子系统(体力接入/科目/学习面板/厌学/大学学年/考试延迟/学习事件)全部未实施。** 方向九完成了约35%。

---

## 总体实施进度

| 方向 | 完成度 | 缺少的核心功能 |
|------|--------|---------------|
| A (旅途多段) | 95% | 部分景点用通用模板 |
| B (邂逅详情) | 100% | — |
| C (交欢UI) | 100% | — |
| D (健康整容) | 100% | — |
| E (偶像) | 85% | 毕业转型UI/海外/被捕/写真/粉丝类型 |
| F (家庭冲突) | 80% | 多角关系UI/转关系按钮 |
| 一 (犯罪) | 65% | 皮条客系统文件/黑市系统文件/职业注册/面板接入 |
| 二 (心理) | 95% | 斯德哥尔摩NPC事件 |
| 三 (NPC互动) | 100% | — |
| 四 (多角关系) | 15% | 全部UI/炮友/包养/开放婚姻/嫉妒独立值 |
| 五 (偶像深化) | 60% | 转型UI/海外/被捕/写真/粉丝类型/内容发行 |
| 六 (履历) | 5% | 全部未实施(只有空数组字段) |
| 七 (地下偶像) | 85% | 辍学系统/职业注册 |
| 八 (经济职业) | 40% | 公司向导UI/11条晋升线/大学标注 |
| 九 (时间教育) | 35% | 体力接入/科目/学习面板/厌学/大学/考试延迟/学习事件 |

---

## 最关键的遗漏 (按优先级)

| 优先级 | 遗漏项 | 所属方向 | 影响 |
|--------|-------|---------|------|
| 🔴 | **皮条客+黑市系统文件** | 方向一 | 两个完整职业线不可用 |
| 🔴 | **role 详情页重构** | 方向六 | 完全不可见 |
| 🔴 | **公司创建向导UI** | 方向八 | 核心功能不可用 |
| 🔴 | **体力接入行动** | 方向九 | 体力SVG在动但无实际消耗 |
| 🟡 | **多角关系UI** | 方向四 | 炮友/包养/开放婚姻无入口 |
| 🟡 | **毕业转型UI** | 方向五 | transitionCareer函数有但触达不了 |
| 🟡 | **assault社交按钮** | 方向一 | 熟人强奸无触发入口 |
| 🟡 | **科目系统** | 方向九 | 旧preparation系统仍在运行 |
| 🟡 | **11条晋升线** | 方向八 | career-panels晋升Tab是空壳 |
| 🟢 | **大学标注** | 方向八 | 小程序量 |
| 🟢 | **辍学系统** | 方向七 | 小程序量 |
| 🟢 | **学习面板UI** | 方向九 | 需新建文件 |
| 🟢 | **体检出行** | 方向九 | 需新建文件 |
