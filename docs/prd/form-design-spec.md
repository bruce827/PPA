# 表单设计模块规格文档

**模块名称**：表单设计（Form Design）
**版本**：1.0.0
**日期**：2026-06-04
**作者**：PPA Team

---

## 1. 概述

### 1.1 背景

在项目需求调研阶段，团队需要为每个项目设计数据库表单结构。传统方式是使用 Excel 模板手工填写，存在以下问题：

- **效率低**：手工填写 545 个字段、33 列属性，耗时长且易出错
- **无实时预览**：填写 Excel 后需要手动查看效果，无法实时可视化
- **无数据校验**：容易产生不符合规范的数据
- **协作困难**：多人协作时容易产生冲突

### 1.2 目标

提供一个 Web 化的表单设计工具，支持：

1. **可视化编辑**：实时预览表单效果
2. **数据校验**：自动校验字段规范
3. **Agent 辅助**：AI 自动生成字段定义
4. **Excel 导出**：生成符合模板格式的 Excel 文件

### 1.3 核心价值

| 价值 | 说明 |
|---|---|
| 提升效率 | 从手工填写 Excel 转为可视化编辑 |
| 降低错误 | 自动校验 9 条硬规则 + 7 条软规则 |
| AI 增强 | Agent 辅助生成字段定义 |
| 格式一致 | 导出的 Excel 与模板格式完全一致 |

---

## 2. 功能规格

### 2.1 功能列表

| 功能 | 优先级 | 状态 | 说明 |
|---|---|---|---|
| 项目管理 | P0 | ✅ 已实现 | 创建、编辑、删除设计项目 |
| 应用管理 | P0 | ✅ 已实现 | 项目下的应用管理 |
| 表单管理 | P0 | ✅ 已实现 | 应用下的表单管理 |
| 字段编辑 | P0 | ✅ 已实现 | 行内编辑字段属性 |
| 表单预览 | P0 | ✅ 已实现 | 抽屉式表单预览 |
| 数据校验 | P0 | ✅ 已实现 | 9 条硬规则 + 7 条软规则 |
| Excel 导入 | P0 | ✅ 已实现 | 从 Excel 模板导入数据 |
| Excel 导出 | P0 | ✅ 已实现 | 导出符合模板的 Excel |
| Agent 辅助 | P1 | ✅ 已实现 | AI 生成字段定义 |
| 关联历史项目 | P2 | ✅ 已实现 | 关联 PPA 评估项目 |

### 2.2 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  左侧菜单                │  主区域                            │
│  ┌─────────────────────┐ │  ┌─────────────────────────────┐ │
│  │ 项目详细设计         │ │  │ [表单1] [表单2] [+新建表单]  │ │
│  │  └ 表单设计          │ │  ├─────────────────────────────┤ │
│  │                     │ │  │ 可编辑 ProTable              │ │
│  │                     │ │  │ ┌──────┬──────┬──────┐      │ │
│  │                     │ │  │ │字段名│编码  │类型  │      │ │
│  │                     │ │  │ └──────┴──────┴──────┘      │ │
│  └─────────────────────┘ │  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 可编辑字段

| 字段 | 编辑方式 | 数据来源 |
|---|---|---|
| 字段名称 | Input | 用户输入 |
| 字段编码 | Input | 用户输入 |
| 字段类型 | Select | constants.ts |
| 输入类型 | Select | constants.ts（23 种） |
| 控件 | 自动更新 | 根据输入类型联动 |
| 卡片分组 | Input | 用户输入 |
| 卡片宽度 | Select | constants.ts（4 种） |
| 必填 | Select | 是/否 |
| 主键 | Select | 是/否 |
| 新增控制 | Select | constants.ts（4 种） |
| 更新控制 | Select | constants.ts（4 种） |

### 2.4 数据校验规则

#### 硬规则（必须通过）

| 规则 | 说明 |
|---|---|
| R1 | 数字类字段 → 必须用数字框 |
| R2 | 日期/时间类字段 → 控件匹配 |
| R3 | 有输入参数 → 必须是选择类控件 |
| R4 | 上传类控件 → 字段类型约束 |
| R5 | 主键字段 → 四场景全隐藏 |
| R6 | 系统字段 → 全隐藏 |
| R7 | 过滤器字段完整性 |
| R8 | 小数类型必须填精度 |
| R9 | 读写字段必须有提示信息 |

#### 软规则（建议项）

| 规则 | 说明 |
|---|---|
| W1 | 字符 500+ 用文本框 |
| W4 | 列表控制含 Excel 公式 |
| W5 | 只读字段补充列表排序 |
| W6 | 精度值范围检查 |
| W7 | 提示信息长度检查 |

---

## 3. 技术架构

### 3.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│  前端（React + Ant Design）                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ FormDesign   │  │ formDesign   │  │ constants.ts │      │
│  │ index.tsx    │  │ .ts (API)    │  │ (枚举配置)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  后端（Node.js + Express）                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Controller   │  │ Service      │  │ Model        │      │
│  │ (参数提取)   │  │ (业务逻辑)   │  │ (数据访问)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  数据库（SQLite）                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ form_project │  │ form_app     │  │ form_field   │      │
│  │ (设计项目)   │  │ (应用)       │  │ (字段定义)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 数据库表结构

#### form_project（设计项目表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 主键 |
| project_name | TEXT | 项目名称 |
| project_desc | TEXT | 项目描述 |
| linked_project_id | INTEGER | 关联的历史项目ID |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

#### form_app（应用表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 主键 |
| app_name | TEXT | 应用名称 |
| app_code | TEXT | 应用编码 |
| project_id | INTEGER | 关联的项目ID |
| description | TEXT | 描述 |
| sort_order | INTEGER | 排序 |

#### form_definition（表单定义表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 主键 |
| app_id | INTEGER | 关联的应用ID |
| form_name | TEXT | 表单名称 |
| form_code | TEXT | 表单编码 |
| filter_condition | TEXT | 过滤条件 |
| description | TEXT | 描述 |

#### form_field（字段定义表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 主键 |
| form_id | INTEGER | 关联的表单ID |
| field_name | TEXT | 字段名称 |
| field_code | TEXT | 字段编码 |
| is_primary_key | INTEGER | 是否主键 |
| is_virtual | INTEGER | 是否虚拟字段 |
| field_type | TEXT | 字段类型 |
| field_length | INTEGER | 字段长度 |
| field_precision | INTEGER | 字段精度 |
| input_type | TEXT | 输入类型（中文） |
| input_type_code | TEXT | 输入类型（编码） |
| input_component | TEXT | 前端组件 |
| input_params | TEXT | 输入参数（JSON） |
| is_required | INTEGER | 是否必填 |
| placeholder | TEXT | 提示信息 |
| card_group | TEXT | 卡片分组 |
| card_width | TEXT | 卡片宽度 |
| add_control | TEXT | 新增控制 |
| update_control | TEXT | 更新控制 |
| detail_control | TEXT | 详情控制 |
| list_control | TEXT | 列表控制 |

### 3.3 API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/form-design/stats | 统计信息 |
| GET | /api/form-design/projects | 设计项目列表 |
| POST | /api/form-design/projects | 创建设计项目 |
| PUT | /api/form-design/projects/:id | 更新设计项目 |
| DELETE | /api/form-design/projects/:id | 删除设计项目 |
| GET | /api/form-design/projects/:projectId/apps | 项目下的应用列表 |
| POST | /api/form-design/apps | 创建应用 |
| PUT | /api/form-design/apps/:id | 更新应用 |
| DELETE | /api/form-design/apps/:id | 删除应用 |
| GET | /api/form-design/apps/:appId/forms | 应用下的表单列表 |
| POST | /api/form-design/forms | 创建表单 |
| PUT | /api/form-design/forms/:id | 更新表单 |
| DELETE | /api/form-design/forms/:id | 删除表单 |
| GET | /api/form-design/forms/:formId/fields | 表单下的字段列表 |
| POST | /api/form-design/fields | 创建字段 |
| PUT | /api/form-design/fields/:id | 更新字段 |
| DELETE | /api/form-design/fields/:id | 删除字段 |
| POST | /api/form-design/fields/batch | 批量更新字段 |
| POST | /api/form-design/validate/field | 校验单个字段 |
| GET | /api/form-design/validate/form/:formId | 校验整个表单 |

---

## 4. 文件清单

### 4.1 后端文件

| 文件 | 说明 |
|---|---|
| server/controllers/formDesignController.js | 控制器 |
| server/services/formDesignService.js | 服务层（含校验逻辑） |
| server/models/formDesignModel.js | 数据访问层 |
| server/routes/formDesign.js | 路由定义 |
| server/migrations/015_create_form_design_tables.js | 数据库迁移 |

### 4.2 前端文件

| 文件 | 说明 |
|---|---|
| frontend/ppa_frontend/src/pages/FormDesign/index.tsx | 页面组件 |
| frontend/ppa_frontend/src/pages/FormDesign/constants.ts | 枚举配置 |
| frontend/ppa_frontend/src/services/formDesign.ts | API 服务 |
| frontend/ppa_frontend/.umirc.ts | 路由配置（已追加） |

### 4.3 脚本文件

| 文件 | 说明 |
|---|---|
| scripts/form-design/parse_excel.py | Excel 解析脚本 |
| scripts/form-design/import_to_db.py | 数据导入脚本 |
| scripts/form-design/explore_excel.py | Excel 结构探索工具 |

### 4.4 Skill 文件

| 文件 | 说明 |
|---|---|
| .claude/skills/form-design-assistant/SKILL.md | 表单设计助手 |
| .claude/skills/form-design-assistant/rules.md | 映射规则 + 校验规则 |
| .claude/skills/form-design-assistant/output-schema.md | JSON 输出格式 |
| .claude/skills/form-design-export/SKILL.md | 导出工具 |
| .claude/skills/form-design-export/scripts/export_to_excel.py | 导出脚本 |

### 4.5 文档文件

| 文件 | 说明 |
|---|---|
| docs/prd/form-design-spec.md | 本文档 |
| docs/form-design-init-guide.md | 数据初始化指南 |
| docs/excel填写规范.md | Excel 填写规范 |

---

## 5. 数据流

### 5.1 初始化流程

```
Excel 模板 ──→ parse_excel.py ──→ forms.json ──→ import_to_db.py ──→ SQLite
```

### 5.2 运行时流程

```
页面 ◄────► API ◄────► SQLite
```

### 5.3 导出流程

```
SQLite ──→ export_to_excel.py ──→ Excel 文件
```

### 5.4 Agent 辅助流程

```
用户描述 ──→ form-design-assistant Skill ──→ JSON ──→ API ──→ SQLite
```

---

## 6. 枚举配置

### 6.1 字段类型（10 种）

字符、固定字符、整型、长整型、单精度数字、双精度数字、文本、短文本、日期、日期时间

### 6.2 输入控件类型（23 种）

文本框、文本域、数字框、下拉选择器、下拉树形选择器、弹出选择器、弹出选择器(可输入)、日期选择器、时间选择器、日期区间、时间区间、年份选择器、年月选择器、单选框、复选框、图片上传、文件上传、附件上传（Word）、表格、Json编辑器、图标选择器、富文本（本地图片）、富文本（网络图片）

### 6.3 卡片宽度（4 种）

四分之一行（span=6）、三分之一行（span=8）、半行（span=12）、整行（span=24）

### 6.4 控制状态（4 种）

读写、只读、隐藏、禁用

### 6.5 过滤方式（12 种）

等于、不等于、小于、小于等于、大于、大于等于、包含、不包含、开始以、结束以、在列表、精确包含

---

## 7. 副作用防范

### 7.1 模块边界

- 不修改其他模块的代码
- 使用独立路由前缀 `/api/form-design/*`
- 使用独立页面路由 `/form-design`

### 7.2 数据库安全

- 迁移脚本使用 `CREATE TABLE IF NOT EXISTS`
- `project_id` 字段设置 `DEFAULT NULL`
- 删除操作使用 `ON DELETE CASCADE`

### 7.3 代码规范

- 遵循三层架构（Controller → Service → Model）
- 下拉选项集中在 constants.ts 管理
- 数据校验规则在 Service 层实现

---

## 8. 已知限制

| 限制 | 说明 | 后续计划 |
|---|---|---|
| 无分页 | 字段列表无分页，大数据量可能影响性能 | 后续优化 |
| 无批量导入 | 不支持从 Excel 批量导入字段 | 后续实现 |
| 无版本管理 | 不支持字段定义的版本管理 | 后续实现 |
| 无协作编辑 | 不支持多人同时编辑 | 后续实现 |

---

## 9. 后续规划

### 9.1 短期（1-2 周）

- [ ] 修复现有数据 placeholder 缺失问题
- [ ] 添加字段列表分页
- [ ] 优化 input_params 双重转义问题

### 9.2 中期（1-2 月）

- [ ] 支持从 Excel 批量导入字段
- [ ] 支持字段定义的版本管理
- [ ] 支持表单模板的导入/导出

### 9.3 长期（3-6 月）

- [ ] 支持多人协作编辑
- [ ] 支持字段定义的 API 文档生成
- [ ] 支持表单预览的完整渲染

---

## 附录 A：Excel 模板列结构

| 列序号 | 列名 | 数据库字段 |
|---|---|---|
| A | 应用名称 | form_app.app_name |
| B | 表单名称 | form_definition.form_name |
| C | 表单编码 | form_definition.form_code |
| D | 过滤条件 | form_definition.filter_condition |
| E | 字段名称 | form_field.field_name |
| F | 字段编码 | form_field.field_code |
| G | 是否主键 | form_field.is_primary_key |
| H | 是否虚拟字段 | form_field.is_virtual |
| I | 字段类型 | form_field.field_type |
| J | 字段长度 | form_field.field_length |
| K | 字段精度 | form_field.field_precision |
| L | 默认值 | form_field.default_value |
| M | 输入类型 | form_field.input_type |
| N | 输入参数 | form_field.input_params |
| O | 是否必填 | form_field.is_required |
| P | 是否唯一 | form_field.is_unique |
| Q | 提示信息 | form_field.placeholder |
| R | 备注 | form_field.remark |
| S | 卡片分组 | form_field.card_group |
| T | 卡片排序 | form_field.card_sort |
| U | 卡片宽度 | form_field.card_width |
| V | 新增控制 | form_field.add_control |
| W | 更新控制 | form_field.update_control |
| X | 详情控制 | form_field.detail_control |
| Y | 列表宽度 | form_field.list_width |
| Z | 列表控制 | form_field.list_control |
| AA | 列表排序 | form_field.list_sort |
| AB | 列表格式化 | form_field.list_formatter |
| AC | 是否过滤器 | form_field.is_filter |
| AD | 过滤方式 | form_field.filter_mode |
| AE | 过滤器默认值 | form_field.filter_default |
| AF | 过滤器提示信息 | form_field.filter_placeholder |
| AG | 来源系统 | form_field.source_system |

---

## 附录 B：输入参数格式

### 字典引用

```json
{
  "type": "dict",
  "param": {
    "code": "dict_severity"
  }
}
```

### 字面枚举

```json
{
  "type": "enum",
  "options": [
    {"label": "一般", "value": "一般"},
    {"label": "较大", "value": "较大"},
    {"label": "重大", "value": "重大"},
    {"label": "特别重大", "value": "特别重大"}
  ]
}
```

### 文件类型标记

```json
{
  "type": "file",
  "accept": ".doc,.docx"
}
```

---

## Review Findings (2026-06-07)

### Patch

- [x] [Review][Defer] Mass Assignment: createField/updateField 直接透传 req.body，但参数化查询保护了 SQL，单用户场景风险低 [server/controllers/formDesignController.js:246,255] — deferred, 降级为 Low
- [ ] [Review][Patch] batchUpdateFields 无输入验证：不校验是否为数组、无长度限制、无事务包装 [server/controllers/formDesignController.js:274] [server/models/formDesignModel.js:209]
- [x] [Review][Patch] CRUD 不调用校验：createField/updateField/batchUpdateFields 从未调用 validateField()，R1-R9 规则形同虚设 [server/services/formDesignService.js:264,268]
- [x] [Review][Patch] R2 校验双重漏洞：(1) 前端字段类型用中文"日期"但后端匹配英文"date"；(2) null field_length 绕过条件判断 [server/services/formDesignService.js:28-37]
- [x] [Review][Patch] W4 语义错误：注释标为软规则(W)但推入 errors 数组，应为 warnings.push [server/services/formDesignService.js:109-111]
- [x] [Review][Patch] CASCADE 行为不符规格：form_app→form_project 使用 ON DELETE SET NULL，规格要求全部使用 ON DELETE CASCADE [server/migrations/015_create_form_design_tables.js:32]
- [x] [Review][Patch] 迁移 015 未在 index.js 注册：startServer() 中未调用 015 的 up()，新部署时表不存在 [server/index.js]
- [x] [Review][Patch] deleteProject 不检查 changes：DELETE 语句后不验证是否实际删除了记录，TOCTOU 竞态下返回虚假成功 [server/models/formDesignModel.js:41]
- [x] [Review][Patch] createApp/createForm 不检查 FK 存在：project_id/app_id 未验证是否真实存在，FK 失败返回 500 原始 SQLite 错误 [server/services/formDesignService.js:208,236]
- [x] [Review][Patch] R4 上传控件长度检查被 null 绕过：field_length 为 null 时 `field.field_length < 255` 短路为 false [server/services/formDesignService.js:56-58]
- [x] [Review][Patch] input_params "null" 字符串误触发 R3：字符串 "null"/"{}"/"[]" 是 truthy，导致无输入参数的字段被要求使用选择类控件 [server/services/formDesignService.js:40]
- [x] [Review][Patch] req.params.id 未校验为正整数：Express 路由参数是字符串，直接传入 SQL 依赖隐式类型转换 [server/controllers/formDesignController.js]

### Defer

- [x] [Review][Defer] createField 返回值不一致：返回 `{ id, ...原始data }` 而非数据库完整记录（含 created_at 等默认值） [server/models/formDesignModel.js:170] — deferred, pre-existing
- [x] [Review][Defer] getAllProjects 双重 LEFT JOIN 性能：三表 JOIN + COUNT DISTINCT 在数据量增长后性能下降，需改为子查询或加分页 [server/models/formDesignModel.js:9-18] — deferred, pre-existing
- [x] [Review][Defer] db 模块 exports.db undefined：模块加载时 db 未初始化，赋值为值拷贝 [server/utils/db.js:103] — deferred, pre-existing
- [x] [Review][Defer] 后端枚举与 constants.ts 不共享：validateField() 中硬编码字符串数组与前端 constants.ts 手动同步，存在漂移风险 [server/services/formDesignService.js] — deferred, pre-existing
