# 华夏人生 UI 设计规范

> 移动端优先 · 触控友好 · 所有新增 CSS 参考本文档
> 目标设备: 移动端竖屏 (max-width 540px)，min-height 44px 触控区域

## 色彩系统

```css
:root {
  --ui-ink: #263b37;        /* 主文字 — 深墨绿 */
  --ui-muted: #69736f;      /* 次要文字 — 灰绿 */
  --ui-line: #d8d5c9;       /* 边框 — 暖灰 */
  --ui-paper: #fffdf7;      /* 卡片背景 — 暖白 */
  --ui-soft: #f4f1e8;       /* 面板背景 — 奶油 */
  --ui-green: #315f58;      /* 主CTA/品牌色 — 深绿 */
  --ui-green-soft: #edf3ef; /* 柔和按钮背景 */
  --ui-red: #a8453a;        /* 危险/警告 — 红棕 */
  --ui-red-soft: #fff0ed;   /* 柔和警告背景 */
  --ui-gold: #b88a35;       /* 金色高亮 — 职业/声望 */
}
```

**页面背景**: `#f7f4eb` · **面板**: `#f4f1e8` / `#f5f2e8` / `#f8f5ea`

### 漫展专色

| 用途 | 色值 |
|------|------|
| 品牌主色 | `#a33b56` |
| 深色变体 | `#8e3850` |
| 柔和背景 | `#fbf6f7` |
| 边框 | `#dfd2d6` / `#ded5d8` |
| 状态进行中 | `#a33b56` 白字 |
| 状态报名中 | `#efd48f` 案文字 `#543d16` |
| 金色反馈 | `#d0a658` |

## 卡片模板

### 标准卡片
```css
padding: 10px;
border: 1px solid var(--ui-line);
border-radius: 6px;
background: var(--ui-paper);
```

### 漫展重点卡片（左侧红条）
```css
padding: 14px;
border: 1px solid #dfd2d6;
border-left: 4px solid #a33b56;
border-radius: 6px;
background: #fbf6f7;
```

### 金色职业卡片
```css
padding: 12px;
border: 1px solid #cfc6ae;
border-left: 4px solid #a77a22;
border-radius: 6px;
background: #fffaf0;
```

### 警告卡片
```css
border-left: 4px solid #c23b32;
background: #fff8eb;
```

### 成功/盈利结算
```css
border-left: 3px solid #577a65;
background: #edf5ef;
```

### 亏损结算
```css
border-left: 3px solid #9a5961;
background: #f8eaea;
```

## 按钮规范

### 主要 CTA（绿色填充）
```css
min-height: 44px;          /* 触控最小 44px */
padding: 8px 12px;
border: none;
border-radius: 5px;
background: #315f58;
color: #fff;
font-size: 11px;
font-weight: 750;
```

### 红色危险按钮
```css
background: #bd3d33 / #c23b32 / #9a4339;
color: #fff;
```

### 漫展特色按钮（玫瑰红）
```css
min-width: 88px;
padding: 8px 10px;
background: #8e3850;
color: #fff;
```

### 次要按钮（绿色轮廓）
```css
min-height: 44px;
border: 1px solid #c9d5d1;
background: #edf3ef;
color: #315f58;
font-weight: 750;
```

### 漫展旅程选项（深色背景+金色文字）
```css
min-height: 48px;
padding: 10px 12px;
background: #263b37;
color: #fff;
/* 描述文字: color: rgba(255,255,255,0.72) */
/* 奖励标签: color: #f1d59b */
```

### 禁用状态
```css
opacity: 0.45;
```
或漫展按钮: `color: rgba(255,255,255,0.75)`

## 网格布局

| 用途 | CSS |
|------|-----|
| 双列卡片 | `grid-template-columns: repeat(2, minmax(0, 1fr))` |
| 三列指标 | `grid-template-columns: repeat(3, minmax(0, 1fr))` |
| 四列统计 | `grid-template-columns: repeat(4, minmax(0, 1fr))` |
| 内容+按钮 | `grid-template-columns: minmax(0, 1fr) auto` |
| 头像+内容 | `grid-template-columns: 44px minmax(0, 1fr)` |
| 日历行 | `grid-template-columns: 52px minmax(0, 1fr) auto` |
| 网格间距 | `gap: 7px` (最常用) / `8px` |

## 排版

```css
font-family: serif;            /* 大标题 */
font-size: 8px~24px;           /* 标签→英雄标题 */
font-weight: 700(粗) 750(强调) 800(极强);
line-height: 1.35~1.55;        /* 正文常用 1.45 */
overflow-wrap: anywhere;        /* 防止溢出 */
text-overflow: ellipsis;       /* 单行截断 */
```

层级:
- 卡标题: `font-size: 13px; font-weight: 700;`
- 副标题: `font-size: 10px; color: 次级色;`
- 数值: `font-size: 12px; font-weight: 750;`
- 标签: `font-size: 9px;`

## 模态/弹窗

### 底部弹出（任务、NPC事件）
```css
position: fixed;
right: 0; bottom: 0; left: 0;
z-index: 600;
max-height: min(68dvh, 560px);
padding: 10px 18px calc(18px + env(safe-area-inset-bottom));
border-radius: 16px 16px 0 0;
background: #fff;
box-shadow: 0 -8px 28px rgb(24 29 38 / 20%);
```

### 全屏覆盖层（导航、详情）
```css
position: fixed; z-index: 30;
top: 0; bottom: 0;
left: 50%;
width: min(100%, 540px);
height: 100dvh;
background: #f7f4eb;
transform: translateX(-50%);
animation: screen-in 160ms ease-out;
```

### 决策弹窗
```css
position: fixed; z-index: 50;
inset: 0;
background: rgba(21, 31, 29, 0.58);
/* 内容区 */
width: min(100%, 540px);
max-height: 82dvh;
border-radius: 8px 8px 0 0;
animation: rise 180ms;
```

### Toast
```css
position: fixed; z-index: 60;
bottom: calc(82px + env(safe-area-inset-bottom));
border-radius: 4px;
/* info: #243834 · warn: #8b5c20 · success: #315f58 */
```

## 过滤芯片

```css
display: flex;
gap: 6px;
overflow-x: auto;
scrollbar-width: none;
```
```css
/* 单个芯片 */
min-height: 36px;
padding: 0 13px;
border: 1px solid #d4d1c6;
border-radius: 18px;
/* 激活: border-color: #315f58; background: #315f58; color: #fff; */
```

## 进度条

```css
height: 4-6px;
overflow: hidden;
background: #e5e4da;
/* 填充: background: #3d796a */
```

## 空状态

```css
margin: 0;
padding: 20px 10px;
color: #858b86;
font-size: 11px;
line-height: 1.6;
text-align: center;
```

## 响应式设计

```css
/* 断点 */
@media (max-width: 420px) { }
@media (max-width: 360px) { }
@media (max-width: 350px) { }
```

**420px 以下通用策略:**
- 所有 grid 变为 `1fr` 单列
- padding/gap 缩减 2-4px
- 按钮 `width: 100%`
- 状态徽章 `grid-column: 1 / -1`

### 漫展专属响应式 (420px)
- `.convention-roster-grid` → 单列
- `.convention-options` → 单列
- `.convention-registration` → 单列
- `.convention-calendar-summary` → 单列 + 按钮全宽
- `.convention-calendar-row` → `48px minmax(0, 1fr)` + 状态换行
- `.convention-detail-grid` → 单列
- `.convention-company-license` / `.convention-tender` → 单列
- `.convention-brand > div` → 单列
- `.convention-partner-group > div` → 单列
- `.convention-operations > div` → 单列

## 动画

```css
@keyframes screen-in { from { opacity: 0; transform: translateY(12px); } }
/* 160ms ease-out */
@keyframes rise { from { transform: translateY(24px); } }
/* 180ms */
/* 进度条: transition: width 180ms ease-out */
```

**无障碍**: `@media (prefers-reduced-motion: reduce)` 所有动画设为 0.01ms

## 图标/头像

头像统一 `44px × 44px`，用于卡片头像列和 coser 卡片。
角色头像使用 `.person-avatar` 类。

## 文本安全

- 只用 `textContent` 渲染用户输入
- 模板字符串生成结构 HTML
- 使用 `escape()` 函数处理动态内容: `replace(/[&<>"']/g, ...)`

## 新增文件清单

所有新的漫展相关内容放入:
- `publish/scripts/features/convention-contest.js` — 大赛淘汰制
- `publish/scripts/features/convention-risk.js` — 风险事件系统
- `publish/styles/convention-contest.css` — 大赛 UI
- `publish/styles/convention-risk.css` — 风险提示 UI

修改已有文件:
- `publish/scripts/data/convention-catalog.js` — 调整 intents 为 4 个
- `publish/scripts/data/convention-routes.js` — 新增比赛路线节点
- `publish/scripts/features/convention-travel.js` — 整合大赛+风险
- `publish/scripts/features/convention-participant.js` — 差异 intent 事件池
- `publish/scripts/features/convention-company.js` — 公司竞争
- `publish/scripts/ui/convention-travel-view.js` — 大赛 UI
- `publish/index.html` — 添加新 script 和 link 标签
