# Story 1.3: 提示词模板基础管理

Status: Done

## Story

作为系统管理员（System Administrator）或项目经理（Project Manager），
我想要管理 AI 提示词模板（创建、查看、编辑、删除），
以便为不同的 AI 应用场景配置和复用提示词。

## Acceptance Criteria

1. **数据库表创建** (数据层)
   - 创建 `prompt_templates` 表，包含字段：
     * id (主键，自增)
     * template_name (模板名称，必填)
     * category (分类：risk_analysis/cost_estimation/report_generation/custom)
     * description (模板描述，可选)
     * system_prompt (系统提示词，必填，TEXT)
     * user_prompt_template (用户提示词模板，必填，TEXT)
     * variables_json (变量定义，JSON 格式，存储数组)
     * is_system (是否系统预置，布尔值，默认 false)
     * is_active (是否启用，布尔值，默认 true)
     * created_at (创建时间，默认当前时间)
     * updated_at (更新时间，默认当前时间)
   - 创建索引：
     * idx_prompt_category (category)
     * idx_prompt_active (is_active)
     * idx_prompt_system (is_system)

2. **创建提示词模板 API** (后端接口层)
   - 实现 `POST /api/config/prompts` API 接口
   - 请求体验证：
     * template_name: 必填，最多 100 字符
     * category: 必填，枚举值验证
     * system_prompt: 必填
     * user_prompt_template: 必填
     * variables_json: 可选，验证 JSON 格式
   - 自动设置 is_system=false（用户创建的模板）
   - 返回创建的模板完整信息（包含生成的 ID）

3. **查询提示词模板列表 API** (后端接口层)
   - 实现 `GET /api/config/prompts` API 接口
   - 支持查询参数：
     * category: 按分类筛选
     * is_system: 筛选系统/用户模板
     * is_active: 筛选启用/禁用模板
     * search: 按模板名称模糊搜索
   - 返回模板列表，包含：
     * 基础信息（id, template_name, category, description）
     * 状态（is_system, is_active）
     * 变量数量（从 variables_json 解析）
     * 时间戳（created_at, updated_at）
   - 按创建时间倒序排序

4. **查询单个模板详情 API** (后端接口层)
   - 实现 `GET /api/config/prompts/:id` API 接口
   - 返回指定模板的完整信息，包括：
     * 所有基础字段
     * 完整的 system_prompt 和 user_prompt_template
     * 解析后的 variables_json（数组格式）
   - 模板不存在时返回 404 错误

5. **更新提示词模板 API** (后端接口层)
   - 实现 `PUT /api/config/prompts/:id` API 接口
   - 系统预置模板（is_system=true）不允许修改，返回 403 错误
   - 可更新字段：
     * template_name
     * category
     * description
     * system_prompt
     * user_prompt_template
     * variables_json
     * is_active（启用/禁用）
   - 自动更新 updated_at 时间戳
   - 返回更新后的完整模板信息

6. **删除提示词模板 API** (后端接口层)
   - 实现 `DELETE /api/config/prompts/:id` API 接口
   - 系统预置模板（is_system=true）不允许删除，返回 403 错误
   - 用户创建的模板可以删除
   - 删除成功返回 200 状态码
   - 模板不存在返回 404 错误

7. **前端列表页面** (UI 层)
   - 创建路由：`/model-config/prompts`
   - 使用 ProTable 组件展示模板列表
   - 表格列定义：
     * 模板名称（25%，可排序，点击跳转详情）
     * 分类（15%，可筛选：风险分析/成本估算/报告生成/自定义）
     * 类型（10%，显示：系统/用户，带标签样式）
     * 变量数（8%，显示变量数量）
     * 状态（10%，显示：启用/禁用，带颜色标签）
     * 创建时间（17%，可排序）
     * 操作（15%，包含：查看、编辑、复制、删除按钮）
   - 顶部工具栏：
     * "新建模板"按钮（主按钮）
     * 标签筛选：[📚 系统预置] [👤 我的模板]
     * 搜索框（按名称搜索）
   - 分页：每页 10 条记录

8. **前端新建/编辑表单** (UI 层)
   - 创建路由：`/model-config/prompts/create` 和 `/model-config/prompts/:id/edit`
   - 使用 ProForm 组件构建表单
   - 表单字段：
     * 模板名称（必填，文本输入框，最多 100 字符）
     * 分类（必填，下拉选择：风险分析/成本估算/报告生成/自定义）
     * 描述（可选，文本域，最多 500 字符）
     * 系统提示词（必填，文本域，支持多行，显示字符计数）
     * 用户提示词模板（必填，文本域，支持多行，显示字符计数）
   - 表单布局：分段式，每段包含标题和说明
   - 系统提示词说明："定义 AI 的角色、专业领域和任务目标"
   - 用户提示词说明："使用 {变量名} 格式插入变量"
   - 底部操作按钮：[取消] [保存]
   - 保存成功后返回列表页并显示成功提示

9. **操作权限和提示** (交互层)
   - 系统预置模板：
     * 编辑按钮显示为"查看"（只读模式）
     * 删除按钮禁用，hover 时显示提示："系统预置模板不可删除"
     * 进入编辑页面时，所有表单字段设为只读
   - 用户创建模板：
     * 编辑按钮正常可用
     * 删除时显示二次确认："确定删除 [模板名称]？删除后无法恢复。"
   - 空状态提示：
     * 无模板时显示："暂无提示词模板，点击上方按钮创建"

## Tasks / Subtasks

- [x] 后端数据层实现 (AC: #1)
  - [x] 创建数据库迁移脚本 `server/migrations/002_create_prompt_templates.js`
  - [x] 定义表结构和索引
  - [x] 编写迁移脚本的 up/down 方法
  - [x] 执行迁移并验证表创建成功

- [x] 后端 API 实现 (AC: #2, #3, #4, #5, #6)
  - [x] 创建控制器 `server/controllers/promptTemplateController.js`
  - [x] 实现 createPromptTemplate 方法（POST）
  - [x] 实现 getPromptTemplates 方法（GET，支持筛选和搜索）
  - [x] 实现 getPromptTemplateById 方法（GET /:id）
  - [x] 实现 updatePromptTemplate 方法（PUT /:id，含权限检查）
  - [x] 实现 deletePromptTemplate 方法（DELETE /:id，含权限检查）
  - [x] 在 `server/routes/index.js` 中注册路由
  - [x] 添加请求参数验证中间件
  - [x] 编写 API 测试用例（Postman 或 Jest）

- [x] 前端服务层实现 (AC: #7, #8)
  - [x] 创建 API 服务文件 `frontend/ppa_frontend/src/services/promptTemplate.ts`
  - [x] 定义 TypeScript 接口：
    * PromptVariable 接口（name, description, example, required）
    * PromptTemplate 接口（完整字段定义）
  - [x] 实现 getPromptTemplates 方法（支持查询参数）
  - [x] 实现 getPromptTemplateById 方法
  - [x] 实现 createPromptTemplate 方法
  - [x] 实现 updatePromptTemplate 方法
  - [x] 实现 deletePromptTemplate 方法

- [x] 前端列表页面实现 (AC: #7)
  - [x] 创建页面组件 `frontend/ppa_frontend/src/pages/ModelConfig/Prompts/index.tsx`
- [x] 配置路由（在 `.umirc.ts` 中）
  - [x] 实现 ProTable 表格：
    * 定义列配置（按 AC #7 规格）
    * 实现筛选功能（分类、类型、状态）
    * 实现搜索功能
    * 实现排序功能
  - [x] 实现顶部工具栏：
    * "新建模板"按钮（主按钮）
    * 标签筛选按钮
    * 搜索框
  - [x] 实现操作列按钮：
    * 查看按钮（跳转详情页）
    * 编辑按钮（跳转编辑页，系统模板显示为"查看"）
    * 删除按钮（含二次确认，系统模板禁用）
  - [x] 实现分页功能
  - [x] 添加空状态提示

- [x] 前端新建/编辑表单实现 (AC: #8)
  - [x] 创建表单组件 `frontend/ppa_frontend/src/pages/ModelConfig/Prompts/Form.tsx`
  - [x] 配置路由（创建和编辑共用同一组件）
  - [x] 实现 ProForm 表单：
    * 基础信息段（模板名称、分类、描述）
    * 系统提示词段（文本域，带说明）
    * 用户提示词模板段（文本域，带说明）
  - [x] 实现表单验证规则
  - [x] 实现保存逻辑（区分创建/编辑）
  - [x] 实现取消逻辑（返回列表页）
  - [x] 系统模板只读模式：
    * 检测 is_system 字段
    * 设置所有表单字段为 disabled
    * 保存按钮禁用或隐藏
  - [x] 添加成功/失败提示

- [x] 权限和交互优化 (AC: #9)
  - [x] 实现系统模板的编辑限制逻辑
  - [x] 实现删除确认对话框
  - [x] 添加操作按钮的禁用状态和提示
  - [x] 实现空状态展示

- [x] 测试和文档 (全部 AC)
  - [x] 编写后端 API 单元测试
  - [x] 编写前端组件测试（可选）
  - [x] 手动测试完整流程：
    * 创建用户模板
    * 查看系统模板（只读）
    * 编辑用户模板
    * 删除用户模板
    * 筛选和搜索
  - [x] 更新用户文档（操作手册）

### Review Follow-ups (AI)
- [x] [AI-Review][High] Implement a Jest/Supertest suite for the prompt template API.
- [x] [AI-Review][Low] Implement the frontend and backend logic for the 'Copy' button.
- [x] [AI-Review][Low] Refactor the `create` method in `promptTemplateModel.js` to ensure all potential errors are handled.

## Dev Notes

### 技术要点

1. **数据库设计**
   - 使用 SQLite 的 JSON1 扩展处理 variables_json 字段
   - 索引策略：category 和 is_active 用于快速筛选
   - is_system 标志用于区分系统预置和用户创建

2. **后端架构**
   - 控制器负责业务逻辑和权限检查
   - 使用中间件验证请求参数（express-validator）
   - 统一错误处理（返回标准 JSON 格式）
   - 使用事务确保数据一致性（如更新操作）

3. **前端架构**
   - 使用 ProTable 的内置筛选和搜索功能
   - 使用 ProForm 的表单布局和验证
   - 状态管理：使用 React Hooks（useState, useEffect）
   - 路由管理：UMI 的约定式路由
   - API 调用：UMI 的 request 封装

4. **用户体验**
   - 系统模板只读，防止误修改
   - 删除操作二次确认，防止误删
   - 表单实时验证，即时反馈
   - 操作成功/失败明确提示

### Project Structure Notes

**新增文件**:
```
server/
  migrations/
    002_create_prompt_templates.js     # 数据库迁移脚本
  controllers/
    promptTemplateController.js        # 提示词模板控制器

frontend/ppa_frontend/src/
  pages/
    ModelConfig/
      Prompts/
        index.tsx                       # 列表页面
        Form.tsx                        # 新建/编辑表单
  services/
    promptTemplate.ts                   # API 服务
```

**修改文件**:
```
server/routes/index.js                 # 添加提示词模板路由
frontend/ppa_frontend/.umirc.ts        # 添加前端路由配置
```

### References

- [PRD: 模型配置功能详细规格 - 子模块2: 提示词模板管理](../../prd/model-config-spec.md#4-子模块2-提示词模板管理)
- [PRD: 数据库设计 - 表2: prompt_templates](../../prd/model-config-spec.md#52-表2-prompt_templates)
- [PRD: API接口设计](../../prd/model-config-spec.md#47-api接口)
- [PRD: 页面设计](../../prd/model-config-spec.md#44-页面设计)
- [项目技术栈: UMI Max + Ant Design Pro](../../AGENTS.md)

## Dev Agent Record

### Context Reference

- Path: docs/stories/story-context-1.3.xml

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be added during development_

### Completion Notes List

- **Completed:** 2025-10-24T12:00:00.000Z
- **Definition of Done:** All acceptance criteria met, code reviewed, tests passing.

### File List

- `server/migrations/002_create_prompt_templates.js`
- `server/controllers/promptTemplateController.js`
- `server/models/promptTemplateModel.js`
- `server/config/db.js`
- `server/routes/config.js` (modified)
- `server/middleware/promptTemplateValidation.js`
- `server/index.js` (modified)
- `server/tests/promptTemplate.test.js`

---

## Senior Developer Review (AI)

- **Reviewer:** bruce
- **Date:** 2025-10-24T12:00:00.000Z
- **Outcome:** Approved

### Summary
All action items from the previous review have been successfully addressed. The API now has a comprehensive test suite, the copy functionality is fully implemented, and error handling has been improved. The story now meets all acceptance criteria and quality standards.

### Key Findings
- No new findings.
