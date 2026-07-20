# BUG 记录：全局按钮失效

**日期**：2026-07-20
**严重等级**：P0（阻断性 — 所有UI按钮无响应）

---

## 症状

新增10个系统模块后，浏览器中打开游戏，**所有按钮点击均无反应**——包括原有的"推进下个月""行业筛选""应聘"等按钮全部失效。页面正常渲染但完全无法交互。

---

## 根因

`interaction-router.js` 的 `handle()` 函数是全局事件分发器。它按优先级链路依次尝试匹配点击处理器。

新增的3个模块注册使用了 `?.method(event)` 语法：

```js
// ❌ 错误写法
if (Game.careerPanels?.handleClick(event)) return;
if (Game.npcInitiative?.handleEventClick(event)) return;
if (Game.undergroundIdol?.handleClick(event)) return;
```

**问题**：`?.` 可选链只保护了**模块引用**的 nullish 检查，但**不保护方法调用**。

当模块存在（`Game.careerPanels` 是对象）但其导出的 `Object.freeze` 中没有包含 `handleClick` 方法时：

- `Game.careerPanels` → 非 null → 通过 `?.`
- `Game.careerPanels.handleClick` → `undefined`
- `undefined(event)` → **TypeError: undefined is not a function**
- **整个 `handle()` 函数崩溃**
- **后续所有按钮处理器全部跳过**

由于 `handle()` 是 DOM 事件监听器的回调，错误发生在事件处理栈内，浏览器不会崩溃页面，但会静默跳过所有按钮逻辑。

---

## 修复

使用 `?.method?.(event)` 双可选链：

```js
// ✅ 正确写法
if (Game.careerPanels?.handleClick?.(event)) return;
if (Game.npcInitiative?.handleEventClick?.(event)) return;
if (Game.undergroundIdol?.handleClick?.(event)) return;
```

`?.method?.()` 会在方法不存在时返回 `undefined`（falsy），不会抛出错误，事件处理继续到下一个处理器。

**额外修复**：为 `career-panels.js` 添加了空的 `handleClick` 导出函数（返回 `false`），避免每次点击都走到 absent 分支。

---

## 教训

### 规则一：`interaction-router.js` 中所有模块 handler 必须使用 `?.method?.(event)` 双重保护

```js
// 永远不要这样写：
if (Game.someModule?.handleClick(event)) return;

// 永远这样写：
if (Game.someModule?.handleClick?.(event)) return;
```

### 规则二：每个新 feature 模块如果需要在 interaction-router 注册，必须提供 `handleClick` 导出

即使目前是空函数，也要在 `Object.freeze({ ... })` 中声明：

```js
Game.newFeature = Object.freeze({
  ensure: ensure,
  monthly: monthly,
  render: render,
  handleClick: function(event) { return false; }, // ← 必须有
});
```

### 规则三：新建模块上线前必须做交互测试

语法检查（`node --check`）只能发现 syntax error，不能发现运行时类型错误。新模块上线后必须验证：
1. 页面正常渲染
2. "推进下个月"按钮可点击
3. 至少一个原有功能按钮正常工作
4. 新模块自己的按钮正常工作

### 规则四：`interaction-router.js` 的 handler 调用链路是 "fail-fast" 的

任何一个 handler 抛出异常都会中断整条链路。**永远不要假设 handler 一定存在且是函数**。使用 `try-catch` 或双重可选链保护。

### 规则五：检查 `Object.freeze` 导出与实际调用的方法签名匹配

Agent 生成的模块可能遗漏 `handleClick` 或命名为 `handleEventClick` 而非 `handleClick`。在注册到 interaction-router 之前，验证模块确实导出了对应名称的函数。

---

## 影响范围

- **修复文件**：`interaction-router.js`（3处修改）、`career-panels.js`（1处新增）
- **新增代码行**：4行
- **无架构变更**：仅修改调用方式，不改变任何系统逻辑
