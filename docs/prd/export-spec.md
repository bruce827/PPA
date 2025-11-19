# FR-6 导出能力详细设计规范

**作者:** bruce  
**日期:** 2025-11-17  
**版本:** 2.0  
**关联PRD:** docs/PRD.md#FR-6

---

## 1. 概述

导出能力是 PPA 评估流程的终点环节，负责将结构化评估数据转化为可对外交付的 Excel 报告。设计目标是确保导出内容与实时计算结果**严格一致**、**可追溯**，并支持内部版本与对外版本两种导出模式。

### 1.1 核心原则

1. **数据一致性**：导出内容必须与最新一次 `POST /api/calculate` 返回的数据完全一致，避免前端重复计算或手工填充。
2. **可追溯性**：每个导出文件携带元数据（`snapshot_id`、`exported_at`），支持外部对账与历史回溯。
3. **结构化驱动**：所有导出逻辑基于 `assessment_details_json` 字段，禁止直接读取分散的配置表或重新计算。
4. **后端实现**：所有导出逻辑在后端完成，包含完整的异常捕获与日志记录，确保健壮性。
5. **双版本支持**：支持内部版本（完整成本拆解）与对外版本（成本分摊到模块）两种导出模式。

---

## 2. 功能需求详解

### FR-6.1 导出触发与管线流程 (P0)

**场景**：用户在历史列表中点击"导出 Excel"按钮，可选择导出版本（内部版/对外版）。

**后端管线**：

```text
触发请求 → 校验项目存在性 → 加载项目与 assessment_details_json 
→ 数据准备（解析 JSON） 
→ 根据导出版本选择渲染模板（内部版 / 对外版）
→ Excel 渲染（exceljs） 
→ 流式输出（直接写入 HTTP Response）
→ 异常捕获与日志记录
```

**关键约束**：

- 导出过程中禁止修改数据库，确保幂等性（同一项目多次导出结果一致）。
- 导出失败必须记录到日志（`logs/export-error.log`），包含：项目 ID、导出版本、失败原因、完整堆栈、请求时间。
- 所有异常必须被捕获，返回友好的错误信息给前端，避免服务崩溃。

**API 规范**：

```http
GET /api/projects/:id/export/excel

Query 参数：
- version: 导出版本，internal（内部版，默认）| external（对外版）

响应：
- 成功: 200 + 文件流（Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet）
- 项目不存在: 404 + { "error": "Project not found", "project_id": ":id" }
- 数据解析失败: 500 + { "error": "Failed to parse assessment data", "details": "..." }
- 渲染失败: 500 + { "error": "Failed to generate export file", "details": "..." }
```

---

### FR-6.2 Excel 导出内容结构 (P0)

导出支持两种版本：**内部版本**（完整成本拆解）与**对外版本**（成本分摊到模块）。

#### 2.1 内部版本（Internal Version）

内部版本用于团队内部评审、存档和追溯，包含完整的成本拆解与风险评估明细。

**工作表结构**（多 Sheet）：

#### Sheet 1: Summary（概览）

| 字段 | 值 |
| --- | --- |
| 项目名称 | {project.name} |
   | 项目描述 | {project.description} |
   | 报价总计（万元） | {final_total_cost} |
   | 风险总分 | {final_risk_score} |
   | 总工作量（人天） | {final_workload_days} |
   | Rating Factor | {rating_factor} |
   | 评估完成时间 | {completed_at} |
   | 导出时间 | {exported_at} |

#### Sheet 2: 角色成本明细

| 角色 | 单价（元/人/天） | 工作量（人天） | 小计（元） | 小计（万元） |
| --- | --- | --- | --- | --- |
| （数据来源：`assessment_details_json.role_costs`） |||||

- 最后一行汇总：显示"总计"及各列合计
- 数字格式：单价/小计保留 2 位小数，工作量保留 1 位小数

#### Sheet 3: 差旅成本明细

| 项目 | 月度成本（元） | 项目周期（月） | 小计（元） | 小计（万元） |
| --- | --- | --- | --- | --- |
| （数据来源：`assessment_details_json.travel_costs`） |||||

- 最后一行汇总：显示"总计"及各列合计

#### Sheet 4: 维护成本

| 项目 | 值 |
   | --- | --- |
   | 维护月数 | {maintenance_months} |
   | 月度维护成本（万元） | {monthly_maintenance_cost} |
   | 维护成本总计（万元） | 计算值 |

#### Sheet 5: 风险评估明细

| 类别 | 评估项 | 选择/描述 | 得分 |
| --- | --- | --- | --- |
| （数据来源：`assessment_details_json.risk_items`） ||||

- 最后一行汇总：显示"风险总分"

#### Sheet 6: Rating Factor 说明

   | 项目 | 值 |
   | --- | --- |
   | 风险总分 | {final_risk_score} |
   | 最大风险分值 | {max_risk_score} |
   | 放大系数 | {amplification_factor} |
   | Rating Factor | 计算值：1 + (风险总分/最大风险分值) × 放大系数 |

**样式要求**：

- 标题行：背景 #4472C4（蓝色）、字体白色、加粗
- 汇总行：背景 #F0F0F0（灰色）、加粗
- 数字格式：金额列保留 2 位小数，工作量列保留 1 位小数
- 列宽自动适配（至少 10 字符宽度）

---

#### 2.2 对外版本（External Version）

对外版本用于向客户提供报价，将所有成本（包括风险成本、差旅、维护）按比例分摊到各个功能模块中，仅展示模块级的工作量与成本。

**核心逻辑**：

1. **成本分摊计算**：
   - 总成本 = 角色成本 + 差旅成本 + 维护成本 + 风险成本
   - 风险成本 = 角色成本 × (Rating Factor - 1)
   - 每个模块的成本占比 = 该模块角色成本 / 总角色成本
   - 每个模块的最终成本 = 总成本 × 该模块成本占比

2. **工作量分摊**：
   - 每个模块的工作量保持不变（来自 `role_costs`）
   - 总工作量 = 所有模块工作量之和

3. **验证**：
  - 所有模块最终成本之和 = 系统计算的总成本（`final_total_cost`）
    - 误差容忍度：± 0.05 万元（四舍五入及浮点运算精度导致）

**工作表结构**：

#### Sheet 1: 项目概览

| 字段 | 值 |
   | --- | --- |
   | 项目名称 | {project.name} |
   | 项目描述 | {project.description} |
   | 报价总计（万元） | {final_total_cost} |
   | 总工作量（人天） | {final_workload_days} |
   | 导出时间 | {exported_at} |

#### Sheet 2: 模块报价明细

| 模块名称 | 工作量（人天） | 成本（万元） | 备注 |
   | --- | --- | --- | --- |
   | 新功能开发模块1 | 计算值 | 分摊后成本 | 从 role_costs 提取模块信息 |
   | 新功能开发模块2 | 计算值 | 分摊后成本 | |
   | 系统集成模块1 | 计算值 | 分摊后成本 | |
   | ... | | | |
   | **总计** | **{final_workload_days}** | **{final_total_cost}** | |

- 模块名称从 `assessment_details_json.role_costs` 中提取（按模块分组）
- 每个模块的工作量 = 该模块下所有角色工作量之和
- 每个模块的成本 = 总成本 × (该模块角色成本 / 总角色成本)

**数据来源映射**：

```javascript
// 伪代码示例
const modules = groupBy(role_costs, 'module'); // 按模块分组角色
const totalRoleCost = sum(role_costs.map(r => r.subtotal));
const riskCost = totalRoleCost * (rating_factor - 1);
const totalCost = final_total_cost; // 来自系统计算

modules.forEach(module => {
  const moduleRoleCost = sum(module.roles.map(r => r.subtotal));
  const moduleCostRatio = moduleRoleCost / totalRoleCost;
  module.finalCost = totalCost * moduleCostRatio;
  module.workloadDays = sum(module.roles.map(r => r.workload_days));
});
```

**样式要求**：

- 与内部版本保持一致
- 模块总计行加粗、背景高亮

---

### FR-6.3 导出元数据与追溯 (P0)

**元数据字段**（嵌入到 Excel 文件属性与 Summary Sheet）：

```json
{
  "snapshot_id": "项目 ID",
  "export_version": "internal | external",
  "exported_at": "2025-11-17T10:30:00Z",
  "rating_factor": 1.25,
  "calculation_timestamp": "最后一次计算时间（从 assessment_details_json 提取）"
}
```

**追溯要求**：

- Excel 文件属性中写入 `creator`、`created`、`modified`
- 文件名格式：`{项目名称}_{internal|external}_{YYYYMMDD_HHmmss}.xlsx`（时间戳为导出时间）

---

### FR-6.4 异常捕获与日志 (P0)

导出过程中必须捕获所有可能的异常，确保服务不会因为导出失败而崩溃。所有导出日志（成功和失败）均保存到 `logs/export/` 目录下，采用分层文件结构便于追溯和调试。

**异常类型与处理**：

1. **项目不存在**：
   - 捕获位置：`projectService.getProjectById`
   - 返回：`404 + { "error": "Project not found", "project_id": ":id" }`
   - 日志级别：`WARN`

2. **数据解析失败**：
   - 捕获位置：`JSON.parse(assessment_details_json)`
   - 返回：`500 + { "error": "Failed to parse assessment data", "details": error.message }`
   - 日志级别：`ERROR`，记录完整堆栈

3. **数据结构不完整**：
   - 捕获位置：数据格式化阶段（`dataFormatter.js`）
   - 返回：`500 + { "error": "Invalid assessment data structure", "missing_fields": [...] }`
   - 日志级别：`ERROR`

4. **Excel 渲染失败**：
   - 捕获位置：`exceljs` 操作过程
   - 返回：`500 + { "error": "Failed to generate export file", "details": error.message }`
   - 日志级别：`ERROR`，记录完整堆栈

5. **文件流写入失败**：
   - 捕获位置：`workbook.xlsx.write(res)`
   - 返回：如果响应头已发送，则中断流并记录日志；否则返回 `500` 错误
   - 日志级别：`ERROR`

**日志保存机制**：

参考 AI 接口的日志实现（`aiFileLogger.js`），导出功能的日志采用文件分层存储：

1. **日志目录结构**：

   ```text
   logs/
   └── export/
       ├── {YYYY-MM-DD}/          # 按日期分组
       │   ├── {HHmmss}_{shortHash}/  # 每次导出一个目录
       │   │   ├── index.json     # 导出元数据（必选）
       │   │   ├── request.json   # 请求参数（必选）
       │   │   ├── project.json   # 项目快照（成功时保存）
       │   │   ├── formatted.json # 格式化后的数据（成功时保存）
       │   │   ├── error.log      # 错误详情（失败时保存）
       │   │   └── notes.log      # 额外备注（可选）
   ```

2. **日志文件内容规范**：

   **index.json**（元数据）：

   ```json
   {
     "project_id": 123,
     "project_name": "Demo项目",
     "export_version": "internal",
     "status": "success",
     "duration_ms": 1234,
     "file_size_kb": 56,
     "timestamp": "2025-11-17T10:30:00.000Z",
     "user_id": "user_123"
   }
   ```

   **request.json**（请求参数）：

   ```json
   {
     "route": "/api/projects/:id/export/excel",
     "method": "GET",
     "params": {
       "id": 123,
       "version": "internal"
     },
     "query": {
       "version": "internal"
     },
     "timestamp": "2025-11-17T10:30:00.000Z"
   }
   ```

   **project.json**（项目快照，成功时）：

   ```json
   {
     "id": 123,
     "name": "Demo项目",
     "description": "项目描述",
     "assessment_details_json": "{ ... }",
     "created_at": "2025-11-15T08:00:00.000Z",
     "updated_at": "2025-11-17T09:30:00.000Z"
   }
   ```

   **formatted.json**（格式化后的数据，成功时）：

   ```json
   {
     "summary": { ... },
     "roleCosts": [ ... ],
     "travelCosts": [ ... ],
     "modules": [ ... ]
   }
   ```

   **error.log**（错误详情，失败时）：

   ```text
   Error Type: DATA_PARSE_ERROR
   Error Message: Unexpected token in JSON at position 123
   Timestamp: 2025-11-17T10:30:00.000Z

   Stack Trace:
   SyntaxError: Unexpected token in JSON at position 123
       at JSON.parse (<anonymous>)
       at formatForExport (/path/to/formatter.js:45:20)
       ...
   ```

3. **日志保存实现**（`exportFileLogger.js`）：

   ```javascript
   const fs = require('fs/promises');
   const path = require('path');

   function pad2(n) {
     return String(n).padStart(2, '0');
   }

   function getBaseDir() {
     return process.env.EXPORT_LOG_DIR || path.resolve(__dirname, '..', 'logs', 'export');
   }

   async function ensureDir(dir) {
     await fs.mkdir(dir, { recursive: true }).catch(() => {});
   }

  async function save({
    projectId,
    projectName,
    exportVersion,
    status,
    durationMs,
    fileSizeKb,
    userId,
    request,
    projectSnapshot,
    formattedData,
    errorDetails,
    notes = [],
  }) {
     try {
       const enabled = process.env.EXPORT_LOG_ENABLED;
       if (enabled !== undefined && !/^true$/i.test(String(enabled))) {
         return;
       }

       const base = getBaseDir();
       const now = new Date();
       const dateDir = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
       const timePart = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
       const shortHash = String(projectId).padStart(6, '0');
       const dir = path.join(base, dateDir, `${timePart}_${shortHash}`);
       await ensureDir(dir);

       // 1. 保存元数据（必选）
      const index = {
        project_id: projectId,
        project_name: projectName,
        export_version: exportVersion,
        status,
        duration_ms: durationMs,
        file_size_kb: fileSizeKb,
        timestamp: now.toISOString(),
        user_id: userId,
      };
       await fs.writeFile(
         path.join(dir, 'index.json'),
         JSON.stringify(index, null, 2),
         'utf8'
       );

       // 2. 保存请求参数（必选）
       if (request) {
         await fs.writeFile(
           path.join(dir, 'request.json'),
           JSON.stringify(request, null, 2),
           'utf8'
         );
       }

       // 3. 保存项目快照（成功时）
       if (status === 'success' && projectSnapshot) {
         await fs.writeFile(
           path.join(dir, 'project.json'),
           JSON.stringify(projectSnapshot, null, 2),
           'utf8'
         );
       }

       // 4. 保存格式化数据（成功时）
       if (status === 'success' && formattedData) {
         await fs.writeFile(
           path.join(dir, 'formatted.json'),
           JSON.stringify(formattedData, null, 2),
           'utf8'
         );
       }

       // 5. 保存错误详情（失败时）
       if (status !== 'success' && errorDetails) {
         const errorLog = [
           `Error Type: ${errorDetails.type || 'UNKNOWN'}`,
           `Error Message: ${errorDetails.message}`,
           `Timestamp: ${now.toISOString()}`,
           '',
           'Stack Trace:',
           errorDetails.stack || 'No stack trace available',
         ].join('\n');
         await fs.writeFile(path.join(dir, 'error.log'), errorLog, 'utf8');
       }

       // 6. 保存额外备注（可选）
       if (notes.length > 0) {
         await fs.writeFile(path.join(dir, 'notes.log'), notes.join('\n'), 'utf8');
       }

       console.info(`[Export File Logger] saved to: ${dir}`);
     } catch (e) {
       console.warn('[Export File Logger] write failed:', e.message);
     }
   }

   module.exports = { save };
   ```

4. **控制器中的调用示例**：

   ```javascript
   // controllers/exportController.js
   const exportFileLogger = require('../services/exportFileLogger');

   exports.exportExcel = async (req, res) => {
     const startTime = Date.now();
     const { id } = req.params;
     const { version = 'internal' } = req.query;
     let status = 'success';
     let errorDetails = null;
     let formattedData = null;
     let projectSnapshot = null;
     let fileSizeKb = 0;

     try {
       // 1. 加载项目
       const project = await projectService.getProjectById(id);
       projectSnapshot = project;

       // 2. 格式化数据
       const formatter = version === 'external' ? externalFormatter : internalFormatter;
       formattedData = formatter.formatForExport(project);

       // 3. 渲染 Excel
       const workbook = await excelRenderer.render(formattedData, version);
       const buffer = await workbook.xlsx.writeBuffer();
       fileSizeKb = Math.round(buffer.length / 1024);

       // 4. 返回文件流
       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
       res.setHeader('Content-Disposition', `attachment; filename="${project.name}_${version}_${Date.now()}.xlsx"`);
       res.send(buffer);

     } catch (error) {
       status = 'fail';
       errorDetails = {
         type: error.name || 'UNKNOWN_ERROR',
         message: error.message,
         stack: error.stack,
       };

       // 返回错误响应
       if (!res.headersSent) {
         const statusCode = error.statusCode || 500;
         res.status(statusCode).json({
           error: error.message,
           project_id: id,
         });
       }
     } finally {
       // 5. 记录日志（成功和失败都记录）
       const durationMs = Date.now() - startTime;
       try {
        await exportFileLogger.save({
          projectId: id,
          projectName: projectSnapshot?.name || 'unknown',
          exportVersion: version,
          status,
          durationMs,
          fileSizeKb,
          userId: req.user?.id || 'anonymous',
          request: {
            route: req.route.path,
            method: req.method,
            params: req.params,
            query: req.query,
             timestamp: new Date().toISOString(),
           },
           projectSnapshot: status === 'success' ? projectSnapshot : null,
           formattedData: status === 'success' ? formattedData : null,
           errorDetails: status === 'fail' ? errorDetails : null,
         });
       } catch (logError) {
         console.warn('Export file logger failed:', logError.message);
       }
     }
   };
   ```

5. **环境变量配置**：

   在 `.env` 文件中添加：

   ```bash
   # 导出日志开关（默认开启）
   EXPORT_LOG_ENABLED=true

   # 导出日志目录（可选，默认为 logs/export）
   EXPORT_LOG_DIR=/path/to/custom/export/logs
   ```

---

## 3. 数据结构约定

### 3.1 assessment_details_json 字段规范

导出逻辑依赖此字段的标准化结构，必须包含以下顶层字段：

```json
{
  "completed_at": "2025-11-17T10:30:00Z",
  "calculation_snapshot": {
    "final_total_cost": 120.5,
    "final_risk_score": 85,
    "final_workload_days": 150.5,
    "rating_factor": 1.25
  },
  "role_costs": [
    {
      "module": "新功能开发模块1",
      "role": "高级开发",
      "unit_price": 800,
      "workload_days": 50,
      "subtotal": 40000
    }
  ],
  "travel_costs": [
    { "item": "交通费", "monthly_cost": 5000, "months": 3, "subtotal": 15000 }
  ],
  "maintenance": {
    "months": 12,
    "monthly_cost": 5000,
    "total": 60000
  },
  "risk_items": [
    { "category": "技术风险", "item": "新技术引入", "choice": "高", "score": 10 }
  ],
  "risk_calculation": {
    "max_risk_score": 100,
    "amplification_factor": 0.5
  }
}
```

**字段说明**：

- `completed_at`：评估完成时间（ISO 8601）
- `calculation_snapshot`：最后一次计算的顶层结果
- `role_costs`：必须包含 `module` 字段，用于对外版本的模块分组
- `travel_costs`/`maintenance`/`risk_items`：详细拆解数据
- `risk_calculation`：Rating Factor 计算依据

---

## 4. 实现层次与职责划分

### 4.1 分层架构

```text
Controller (exportController.js)
  ↓ 校验参数、记录日志、异常捕获、流式响应
Service (exportService.js)
  ↓ 数据准备、版本选择、调用 Formatter 与 Renderer、错误处理
Formatter (export/formatters/*.js)
  ↓ 解析 assessment_details_json、格式化数字、成本分摊计算
Renderer (export/renderers/excelRenderer.js)
  ↓ 使用 exceljs 生成 Excel 工作簿
```

### 4.2 模块职责

| 模块 | 文件 | 职责 |
| --- | --- | --- |
| **Controller** | `controllers/exportController.js` | 接收请求、校验项目存在性与导出版本、调用 Service、返回文件流、捕获所有异常 |
| **Service** | `services/exportService.js` | 加载项目数据、解析 JSON、根据版本调用对应的 Formatter、调用 Renderer、记录日志 |
| **Model** | `models/projectModel.js` | 数据库访问层，提供 `getProjectById(id)` 方法查询项目及 `assessment_details_json` 字段 |
| **Internal Formatter** | `services/export/formatters/internalFormatter.js` | 解析 `assessment_details_json`，转换为内部版本导出所需的标准化对象 |
| **External Formatter** | `services/export/formatters/externalFormatter.js` | 计算成本分摊、按模块分组、转换为对外版本导出所需的标准化对象 |
| **Excel Renderer** | `services/export/renderers/excelRenderer.js` | 使用 exceljs 生成 Excel 工作簿，支持内部版与对外版两种模板 |
| **File Logger** | `services/exportFileLogger.js` | 导出日志文件写入，保存到 `logs/export/` 目录 |

**数据流向**：

```text
Controller → Service → Model (数据库查询)
                    ↓
          Formatter (数据转换)
                    ↓
          Renderer (Excel 生成)
                    ↓
          File Logger (日志记录)
```

### 4.3 代码示例

#### 4.3.1 内部版本数据格式化

```javascript
// services/export/formatters/internalFormatter.js
exports.formatForExport = (project) => {
  const details = JSON.parse(project.assessment_details_json);
  
  return {
    summary: {
      projectName: project.name,
      description: project.description,
      totalCost: details.calculation_snapshot.final_total_cost,
      riskScore: details.calculation_snapshot.final_risk_score,
      workloadDays: details.calculation_snapshot.final_workload_days,
      ratingFactor: details.calculation_snapshot.rating_factor,
      completedAt: details.completed_at,
      exportedAt: new Date().toISOString()
    },
    roleCosts: details.role_costs.map(rc => ({
      module: rc.module,
      role: rc.role,
      unitPrice: rc.unit_price,
      workloadDays: rc.workload_days,
      subtotal: rc.subtotal,
      subtotalWan: (rc.subtotal / 10000).toFixed(2)
    })),
    travelCosts: details.travel_costs.map(tc => ({
      item: tc.item,
      monthlyCost: tc.monthly_cost,
      months: tc.months,
      subtotal: tc.subtotal,
      subtotalWan: (tc.subtotal / 10000).toFixed(2)
    })),
    maintenance: {
      months: details.maintenance.months,
      monthlyCost: (details.maintenance.monthly_cost / 10000).toFixed(2),
      total: (details.maintenance.total / 10000).toFixed(2)
    },
    riskItems: details.risk_items.map(ri => ({
      category: ri.category,
      item: ri.item,
      choice: ri.choice,
      score: ri.score
    })),
    riskCalculation: details.risk_calculation
  };
};
```

#### 4.3.2 对外版本数据格式化

```javascript
// services/export/formatters/externalFormatter.js
exports.formatForExport = (project) => {
  const details = JSON.parse(project.assessment_details_json);
  const { role_costs, calculation_snapshot } = details;
  
  // 1. 按模块分组角色成本
  const modules = {};
  role_costs.forEach(rc => {
    if (!modules[rc.module]) {
      modules[rc.module] = {
        moduleName: rc.module,
        workloadDays: 0,
        roleCost: 0
      };
    }
    modules[rc.module].workloadDays += rc.workload_days;
    modules[rc.module].roleCost += rc.subtotal;
  });
  
  // 2. 计算总角色成本
  const totalRoleCost = Object.values(modules).reduce((sum, m) => sum + m.roleCost, 0);
  
  // 3. 计算风险成本
  const ratingFactor = calculation_snapshot.rating_factor;
  const riskCost = totalRoleCost * (ratingFactor - 1);
  
  // 4. 总成本（来自系统计算）
  const totalCost = calculation_snapshot.final_total_cost * 10000; // 转换为元
  
  // 5. 按比例分摊成本到各模块
  const moduleList = Object.values(modules).map(m => {
    const moduleCostRatio = m.roleCost / totalRoleCost;
    const finalCost = totalCost * moduleCostRatio;
    return {
      moduleName: m.moduleName,
      workloadDays: m.workloadDays.toFixed(1),
      cost: (finalCost / 10000).toFixed(2), // 转换为万元
      costRatio: (moduleCostRatio * 100).toFixed(1) + '%'
    };
  });
  
  // 6. 验证总成本
  const sumCost = moduleList.reduce((sum, m) => sum + parseFloat(m.cost), 0);
  const diff = Math.abs(sumCost - calculation_snapshot.final_total_cost);
  if (diff > 0.01) {
    throw new Error(`Cost allocation mismatch: expected ${calculation_snapshot.final_total_cost}, got ${sumCost}`);
  }
  
  return {
    summary: {
      projectName: project.name,
      description: project.description,
      totalCost: calculation_snapshot.final_total_cost,
      totalWorkloadDays: calculation_snapshot.final_workload_days,
      exportedAt: new Date().toISOString()
    },
    modules: moduleList
  };
};
```

---

## 5. 测试策略

### 5.1 单元测试

**测试文件**：`tests/unit/export.test.js`

**测试用例**：

1. **内部版本数据格式化**：
   - 验证 `internalFormatter.formatForExport` 输出结构完整性
   - 验证数字格式化（万元转换、小数位数）

2. **对外版本数据格式化**：
   - 验证模块分组逻辑
   - 验证成本分摊计算准确性
   - 验证总成本一致性（误差 ≤ 0.01 万元）

3. **Excel 渲染**：
   - 验证生成的 Excel 文件可被 exceljs 读取
   - 验证工作表数量与命名

4. **异常处理**：
   - 验证项目不存在时返回 404
   - 验证数据解析失败时返回 500 并记录日志
   - 验证成本分摊不一致时抛出异常

### 5.2 集成测试

**测试文件**：`tests/integration/export.integration.test.js`

**测试流程**：

```javascript
describe('Export API Integration', () => {
  let projectId;

  beforeAll(async () => {
    // 创建测试项目并完成评估
    projectId = await createTestProjectWithAssessment();
  });

  it('should export internal version Excel', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/export/excel?version=internal`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('internal');

    // 解析 Excel 验证结构
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);
    
    expect(workbook.getWorksheet('Summary')).toBeDefined();
    expect(workbook.getWorksheet('角色成本明细')).toBeDefined();
    expect(workbook.getWorksheet('风险评估明细')).toBeDefined();
  });

  it('should export external version Excel with cost allocation', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/export/excel?version=external`);

    expect(res.status).toBe(200);
    
    // 解析 Excel 验证成本一致性
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);
    
    const moduleSheet = workbook.getWorksheet('模块报价明细');
    expect(moduleSheet).toBeDefined();
    
    // 验证模块总成本 = 系统总成本
    const totalRow = moduleSheet.getRow(moduleSheet.rowCount);
    const totalCost = parseFloat(totalRow.getCell(3).value);
    
    const project = await getProjectById(projectId);
    const details = JSON.parse(project.assessment_details_json);
    expect(Math.abs(totalCost - details.calculation_snapshot.final_total_cost)).toBeLessThan(0.01);
  });

  it('should handle export errors gracefully', async () => {
    const res = await request(app)
      .get(`/api/projects/99999/export/excel`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Project not found');
  });
});
```

---

## 6. 部署与运维

### 6.1 依赖库版本

```json
{
  "exceljs": "^4.4.0"
}
```

---

## 7. 迁移计划

### 7.1 现有导出功能现状

当前系统已实现的基础导出功能（位于 `server/controllers/projectController.js` 的 `exportExcel` 方法）：

**已实现**：

- ✅ 基础 Excel 导出接口 `GET /api/projects/:id/export/excel`
- ✅ 使用 ExcelJS 库生成 Excel 文件
- ✅ 数据来源于 `assessment_details_json` 字段

**功能缺失**：

- ❌ **内容简化**：仅导出顶层汇总数据（总成本、总工作量、风险总分），缺少详细拆解表格
- ❌ **无双版本支持**：只有一种导出格式，无内部版/对外版区分
- ❌ **异常处理不完整**：缺少完整的异常捕获和结构化日志记录
- ❌ **无元数据追溯**：Excel 文件未嵌入配置版本、导出时间等元数据
- ❌ **样式简陋**：无标题行高亮、汇总行样式等

**需要改进的原因**：

1. 当前导出内容过于简单，无法满足内部评审和对外报价的不同需求
2. 缺少完整的成本拆解表格（角色成本、差旅、维护、风险明细）
3. 对外报价需要隐藏内部成本细节，仅展示模块级汇总
4. 缺少日志追溯能力，导出失败时难以排查问题

### 7.2 实施步骤

#### Phase 1: 内部版本完善（3 天）

- [ ] 实现完整的成本拆解表格（角色/差旅/维护/风险）
- [ ] 优化 Excel 样式（标题行、汇总行、数字格式）
- [ ] 添加元数据嵌入（文件属性 + Summary Sheet）
- [ ] 文件命名包含时间戳与版本

#### Phase 2: 对外版本实现（3 天）

- [ ] 实现成本分摊计算逻辑（`externalFormatter.js`）
- [ ] 实现对外版本 Excel 模板（模块报价明细）
- [ ] 验证总成本一致性（单元测试 + 集成测试）
- [ ] API 支持 `version` 参数切换

#### Phase 3: 异常处理与日志（2 天）

- [ ] 完善所有异常捕获点（5 大类异常）
- [ ] 实现结构化日志记录
- [ ] 添加日志轮转与归档策略
- [ ] 集成测试覆盖异常场景

#### Phase 4: 测试与验收（2 天）

- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 集成测试覆盖核心场景
- [ ] 真实项目数据验证（至少 3 个项目）
- [ ] 文档更新与交付

---

## 8. 总结

FR-6 导出能力的详细设计围绕**数据一致性**、**可追溯性**、**双版本支持**三大核心原则展开，通过标准化的 `assessment_details_json` 字段、模块化的渲染架构与完善的异常捕获机制，确保导出结果与实时计算严格对齐，同时支持内部审查与对外报价两种场景。

**关键交付物**：

1. 内部版本 Excel 导出（完整成本拆解 + 风险评估明细）
2. 对外版本 Excel 导出（成本分摊到模块 + 总成本一致性验证）
3. 完善的异常捕获与日志记录机制
4. 元数据追溯支持（文件属性 + 时间戳命名）

**下一步行动**：

1. 完成 Phase 1 内部版本完善（优先级 P0）
2. 完成 Phase 2 对外版本实现（优先级 P0）
3. 完成 Phase 3 异常处理（优先级 P0）
4. 编写集成测试覆盖所有导出场景

_Created by bruce on 2025-11-17_
_Updated to v2.0 on 2025-11-17_
