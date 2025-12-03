# PPA UI 自动化测试方案（基于 Chrome DevTools MCP）

**版本**: v1.0  
**关联文档**: `docs/regression-test-plan.md`、`docs/prd/automated-testing-prd.md`

---

## 1. 目标与范围

- **目标**
  - 使用 Chrome DevTools 协议的 MCP 能力，对 PPA Web 前端进行 UI 自动化测试，重点覆盖回归方案中的核心业务路径：
    - Dashboard 可视化与统计展示；
    - 新建评估全流程（含模板/非模板）；
    - 历史项目/模板管理与详情/导出；
    - 参数配置中心；
    - 模型配置与关键 AI 流程的 UI 交互。
  - 形成可复用的自动化脚本与场景描述，支持未来集成到本地或 CI 任务中。

- **范围**
  - 浏览器：Chrome（通过 DevTools 协议控制）。
  - 页面与路由：
    - `/dashboard`
    - `/assessment/new`
    - `/assessment/history`
    - `/assessment/detail/:id`
    - `/config`
    - `/model-config`（若已实现）
  - 不在本方案覆盖：
    - 纯 API 级测试（已由 Jest + Supertest 覆盖）。
    - 纯视觉像素级对比（暂不做快照比对，仅做结构与关键内容断言）。

---

## 2. 技术方案概述

- **控制通道**
  - 通过 MCP 中的 Chrome DevTools 工具（假设已由上层配置好 MCP server），以会话方式控制本地运行的 Chrome：
    - 打开新 Tab，访问指定 URL；
    - 操作 DOM（点击、输入、选择、滚动）；
    - 监听网络请求、控制台报错等。

- **测试编排方式**
  - 由“测试代理”对 Chrome MCP 发起结构化调用，执行：
    - `navigate(url)`：跳转到目标页面；
    - `querySelector` / `querySelectorAll`：查找元素；
    - `click` / `type` / `select`：执行交互；
    - `waitForSelector` / `waitForNetworkIdle`：等待页面稳定；
    - 自定义断言逻辑（如读取文本内容、DOM 属性）。
  - 用“场景脚本”或“工作流”描述每个测试用例步骤，保持与业务 PRD 一一对应。

- **断言与报告**
  - 基于 MCP 返回的 DOM/文本数据进行断言：
    - 元素存在性（按钮、表格、表单字段）；
    - 文本内容（标题、副标题、金额、风险评分）；
    - DOM 状态（禁用/启用、是否可见）。
  - 将每个测试步骤的结果记录为结构化日志（JSON），可由上层工具汇总为测试报告。

---

## 3. 环境与前置条件

- 后端服务
  - 已在本地启动 Express 后端，端口 `3001`。
  - 目标 API 主机：`http://localhost:3001`，前端 `/api` 代理正确。
  - 数据库为回归专用实例（例如 `ppa.regression.db`），初始数据准备参考 `docs/regression-test-plan.md` 第 4 章。

- 前端服务
  - 已在本地启动 Umi Max 前端（或使用已构建版本），端口 `8000`。
  - 根路径 `http://localhost:8000` 能正常访问。

- MCP 与 Chrome DevTools
  - MCP 侧已配置好 Chrome DevTools 工具：
    - 能启动或连接本地 Chrome 实例；
    - 支持导航、DOM 操作与网络监听；
    - 支持在会话间共享 Cookie/本地存储（如后续引入登录能力）。
  - 本方案仅定义需要的能力与调用模式，不约束具体 MCP server 实现细节。

> 本方案只描述 UI 自动化的设计与步骤，不包含任何实际执行或命令。

---

## 4. 用例选取与优先级（基于 UI 自动化）

> 下列用例是对 `docs/regression-test-plan.md` 中 P0/P1 场景的 UI 自动化子集，适合用 Chrome MCP 落地。

### 4.1 核心链路（P0）

- **UA-001 新建评估（不使用模板）端到端**
  - 步骤要点：
    - 打开 `/assessment/new`；
    - Step1：为所有风险项选择选项（通过下拉或单选组件）；
    - Step2：在“新功能开发”Tab 新增 1 行，填写模块信息与角色工时；
    - Step3：填写差旅、运维和风险成本；
    - Step4：点击“计算最新报价”，校验成本明细区域出现，金额字段非空；
    - 输入项目名称，点击“提交”，验证跳转到 `/assessment/detail/:id`；
    - 在详情页验证：项目名称、总成本、风险总分与前一页展示一致。

- **UA-002 使用模板创建评估端到端**
  - 步骤要点：
    - 确保已有模板 T1（可在用例前置钩子中创建，或用预置数据）；
    - 到 `/assessment/new`，在模板选择区域选择 T1 并应用；
    - 验证表单字段被预填；
    - 修改至少一个模块工时，重新计算并保存；
    - 校验历史列表中新增项目记录，详情页成本数据与表单页面一致。

- **UA-003 历史项目列表与详情**
  - 步骤要点：
    - 打开 `/assessment/history`；
    - 验证表格列（名称、总成本、风险总分、创建时间）存在；
    - 在搜索框输入项目名称关键字，校验列表过滤；
    - 点击某条记录的“查看”，跳转详情页；
    - 在详情中展开折叠区域，校验风险评分、工作量列表的行数与关键字段。

- **UA-004 项目导出 PDF/Excel**
  - 步骤要点：
    - 打开某项目详情页；
    - 点击“导出 PDF”，通过 DevTools 网络监听验证：
      - 触发 `GET /api/projects/:id/export/pdf` 请求；
      - 响应状态为 200，`Content-Type` 包含 `application/pdf`。
    - 点击“导出 Excel”，验证对应 Excel 请求与 Content-Type；
    - 可选：读取下载列表中的文件名（若 MCP 有文件系统集成），校验包含项目名称。

### 4.2 配置中心（P0/P1）

- **UA-101 角色配置 CRUD 与前端联动**
  - 步骤要点：
    - 打开 `/config` → “角色与单价管理”Tab；
    - 点击“新建”，输入新的角色名称与单价，保存；
    - 刷新页面或重新打开 Config，验证新增角色存在；
    - 导航到 `/assessment/new` Step2，验证表格中出现该角色列；
    - 返回 Config，编辑单价并保存，再次在 Step2 输入工时，验证计算结果变化；
    - 删除该角色，验证列表和 Step2 表头中均不再出现。

- **UA-102 风险项配置 CRUD 与 Step1 联动**
  - 步骤要点：
    - 在 Config “风险评估项管理”Tab 新建一条风险项（含多个选项）；
    - 打开 `/assessment/new` Step1，验证 UI 中出现该评估项；
    - 删除或修改该风险项，再次打开 Step1，验证 UI 更新。

### 4.3 Dashboard 与辅助页面（P1/P2）

- **UA-201 Dashboard 数据展示**
  - 步骤要点：
    - 打开 `/dashboard`；
    - 验证「评估项目总数」「项目平均成本」「风险等级分布」等卡片存在；
    - 与历史项目列表中的数据进行简单比对（例如：总数与列表条数一致）。

---

## 5. MCP 场景脚本设计（抽象示例）

> 以下为抽象设计，用于指导如何在 MCP 中组织对 Chrome DevTools 的调用，实际字段与 schema 由上层实现决定。

- 场景定义结构（建议）：
  - `id`: 用例编号（如 `UA-001`）。
  - `description`: 用例描述。
  - `steps`: 步骤数组，每步包括：
    - `action`: 如 `navigate`, `click`, `type`, `waitForSelector` 等；
    - `target`: CSS 选择器或文本定位方式；
    - `value`: 输入内容（如表单值）；
    - `assert`: 可选断言信息（如预期文本、存在性）。

- 示例：UA-001 的部分步骤（伪代码）
  - Step1 导航与基本验证：
    - `navigate` → `http://localhost:8000/assessment/new`
    - `waitForSelector` `.risk-step-form`
    - `assert` 页面标题包含“新建评估”
  - Step2 填写风险评分：
    - 对每个风险项执行：
      - `click` 对应选择器；
      - `click` 下拉中的选项；
    - `assert` 右侧统计卡片中的“风险总分”文本不为空。
  - 后续步骤类推。

- 断言策略：
  - 尽量使用稳定的 data-testid 或唯一的 className/id（视当前前端实现情况而定）。
  - 避免依赖易变的 DOM 层级结构或纯文本，只在必要时使用文本匹配。

---

## 6. 维护与演进

- 与 PRD/回归方案联动
  - 当 `docs/PRD.md` 或 `docs/regression-test-plan.md` 更新（例如新增页面、调整流程），应同步评估：
    - 哪些 UI 自动化用例需要新增或调整；
    - 是否需要新增 MCP 脚本模板或公共操作封装。

- 脚本复用与抽象
  - 将常见操作抽象为可复用的“子流程”，例如：
    - 登录（未来引入权限后）；
    - 导航到某页面并等待加载完成；
    - 通用表单填写与提交逻辑；
    - 等待全局 loading 消失。

- 稳定性与抗脆弱性
  - 优先使用稳定的选择器与 data 属性；
  - 对于网络请求与复杂渲染，引入合理的 `waitFor*` 超时与重试机制；
  - 定期审查失败用例是否因需求变更/前端结构调整导致，并更新脚本。

---

## 7. 与整体回归流程的关系

- 在 `docs/regression-test-plan.md` 中的批次划分下：
  - 批次 A / 核心链路冒烟：优先映射到 UA-001、UA-002、UA-003、UA-004。
  - 批次 B / 业务回归：逐步扩展到 UA-101、UA-102、UA-201 等。
  - 非功能和 AI 相关场景，可在 UI 自动化中只做“前端交互是否成功触发请求”的轻量验证，性能与结果质量仍由其他测试层负责。

> 本文档仅提供基于 Chrome DevTools MCP 的 UI 自动化测试总体设计与用例框架，不包含任何具体执行命令或脚本实现细节，可在后续迭代中与实际 MCP server 的 schema 对齐，并逐步沉淀为可运行的自动化脚本集。

