# Story 1.4: 提示词模板变量管理与预览

Status: Draft

## Story

作为系统管理员（System Administrator）或项目经理（Project Manager），
我想要管理提示词模板中的变量定义，并能预览填充后的完整提示词，
以便确保模板正确并在使用前验证效果。

## Acceptance Criteria

1. **变量编辑对话框** (前端交互层)
   - 实现变量编辑对话框组件（Modal/Drawer）
   - 表单字段：
     * 变量名（name）：必填，只能包含字母、数字、下划线，自动验证格式
     * 显示名称（description）：必填，最多50字符
     * 描述（help text）：可选，说明变量用途
     * 示例值（example）：必填，帮助用户理解变量含义
     * 必填标记（required）：复选框
   - 保存后更新模板的 variables_json 字段
   - 取消时不保存修改

2. **变量列表管理** (前端组件层)
   - 在提示词模板编辑页面显示变量列表（Table 组件）
   - 列定义：
     * 变量名（固定宽度 200px）
     * 说明（自适应宽度，省略超长文本）
     * 必填标记（固定宽度 80px，显示 ✓ 或空）
     * 操作按钮（固定宽度 120px）：编辑、删除
   - 点击"+ 添加变量"按钮打开变量编辑对话框
   - 点击"编辑"按钮打开对话框并预填现有数据
   - 点击"删除"按钮弹出二次确认对话框

3. **变量智能检测** (前端编辑器逻辑)
   - 在用户提示词模板（user_prompt_template）编辑器中检测变量占位符 `{variable_name}`
   - 实时提取所有 `{...}` 格式的变量名
   - 对比已定义的变量列表，标记未定义的变量
   - 显示提示信息："检测到 N 个未定义变量，点击快速添加"
   - 点击后批量打开添加对话框，自动填充变量名

4. **变量快速插入** (前端编辑器增强)
   - 在用户提示词模板编辑区域添加"插入变量"下拉按钮
   - 下拉列表显示所有已定义变量：`{variable_name} - 说明`
   - 点击某个变量后，在光标位置插入 `{variable_name}`
   - 支持搜索过滤变量列表

5. **模板预览功能 API** (后端接口层)
   - 实现 `POST /api/config/prompts/:id/preview` API 接口
   - 请求体：
     ```json
     {
       "variable_values": {
         "project_name": "电商平台升级",
         "risk_score": "85"
       }
     }
     ```
   - 处理逻辑：
     * 加载模板的 system_prompt 和 user_prompt_template
     * 遍历 variable_values，替换模板中的 `{variable_name}` 为实际值
     * 未提供值的必填变量保留原占位符或返回警告
   - 返回数据：
     ```json
     {
       "system_prompt": "你是一个专业的...",
       "user_prompt": "项目名称: 电商平台升级\n风险总分: 85\n...",
       "missing_required": ["risk_details"],
       "unused_variables": ["project_description"]
     }
     ```

6. **前端预览对话框** (前端交互层)
   - 点击"预览"按钮打开预览对话框（大型 Modal，宽度 800px）
   - 上半部分：测试数据填写区域
     * 为每个变量显示输入框：标签为"显示名称"，占位符为"示例值"
     * 必填变量标红星 (*)
     * 支持多行文本输入（TextArea）用于长文本变量
   - 点击"生成预览"按钮：
     * 验证所有必填变量已填写
     * 调用 `POST /api/config/prompts/:id/preview` API
     * 显示加载状态
   - 下半部分：预览结果显示区域
     * 分两个区域显示：
       - **System Prompt**（只读，灰色背景）
       - **User Prompt**（只读，白色背景）
     * 支持复制按钮（点击复制完整提示词）
     * 显示警告信息（missing_required、unused_variables）
   - 关闭按钮

7. **模板复制功能 API** (后端接口层)
   - 实现 `POST /api/config/prompts/:id/copy` API 接口
   - 逻辑：
     * 读取源模板的所有字段
     * 复制所有内容（除 id、created_at、updated_at）
     * 自动修改 template_name：添加"(副本)" 后缀
     * 自动设置 is_system=false（用户创建）
     * 生成新 ID 并保存
   - 返回新模板的完整信息

8. **前端复制功能** (前端列表操作)
   - 在模板列表的操作栏添加"复制"按钮
   - 点击后：
     * 调用 `POST /api/config/prompts/:id/copy` API
     * 显示成功提示："已复制模板，正在跳转到编辑页面"
     * 自动跳转到新模板的编辑页面

## Tasks / Subtasks

- [ ] **Task 1: 实现变量管理前端组件** (AC: #1, #2, #3, #4)
  - [ ] 创建 `VariableEditor.tsx` 组件（变量编辑对话框）
  - [ ] 创建 `VariableList.tsx` 组件（变量列表表格）
  - [ ] 在 `PromptEditor.tsx` 中集成变量列表组件
  - [ ] 实现变量智能检测逻辑（正则提取 `{...}`）
  - [ ] 实现"插入变量"下拉按钮组件
  - [ ] 添加单元测试：变量格式验证、智能检测逻辑

- [ ] **Task 2: 实现模板预览后端 API** (AC: #5)
  - [ ] 创建 `POST /api/config/prompts/:id/preview` 路由
  - [ ] 在 `promptTemplateController.js` 中实现 `previewTemplate` 方法
  - [ ] 实现变量替换逻辑：
    * 使用正则表达式 `/\{(\w+)\}/g` 匹配变量
    * 替换为 `variable_values` 中的对应值
    * 检测缺失的必填变量和未使用的变量
  - [ ] 添加错误处理：模板不存在、变量值类型错误
  - [ ] 编写单元测试：正常预览、缺失必填变量、未使用变量

- [ ] **Task 3: 实现前端预览对话框** (AC: #6)
  - [ ] 创建 `PreviewModal.tsx` 组件
  - [ ] 实现测试数据填写表单（动态生成输入框）
  - [ ] 调用预览 API 并处理响应
  - [ ] 实现预览结果显示（System/User Prompt 分区）
  - [ ] 添加复制按钮功能（使用 Clipboard API）
  - [ ] 显示警告信息（Tag 组件）
  - [ ] 添加交互测试：填写数据、生成预览、复制内容

- [ ] **Task 4: 实现模板复制功能** (AC: #7, #8)
  - [ ] 创建 `POST /api/config/prompts/:id/copy` 路由
  - [ ] 在 `promptTemplateController.js` 中实现 `copyTemplate` 方法
  - [ ] 实现复制逻辑（深拷贝所有字段，重置 ID 和时间）
  - [ ] 在前端列表添加"复制"按钮
  - [ ] 调用复制 API 并跳转到编辑页面
  - [ ] 添加成功提示和错误处理
  - [ ] 编写集成测试：复制模板、验证新模板数据

- [ ] **Task 5: 集成测试与验证** (所有 AC)
  - [ ] 端到端测试：创建模板 → 添加变量 → 预览 → 复制
  - [ ] 测试边界情况：
    * 未定义变量的检测
    * 缺失必填变量的预览
    * 复制系统预置模板
  - [ ] 验证数据完整性：variables_json 正确保存和加载
  - [ ] 性能测试：大型模板（100+ 变量）的预览响应时间
  - [ ] 更新用户文档：变量管理和预览功能说明

## Dev Notes

### Architecture Patterns

基于 PRD 第 4.5 节和第 4.7 节，本故事实现：

1. **前端组件层**:
   - 遵循 Ant Design 设计规范
   - 使用 Modal 组件实现变量编辑和预览对话框
   - 使用 Table 组件显示变量列表
   - 使用 Form 组件处理变量编辑和预览数据填写

2. **后端接口层**:
   - RESTful API 设计原则
   - 预览 API：POST（因为需要传递变量值）
   - 复制 API：POST（创建新资源）
   - 变量替换逻辑：纯函数实现，便于测试

3. **数据结构**:
   - variables_json 存储为 JSON 字符串（SQLite TEXT 类型）
   - 前端解析为数组进行编辑
   - 保存前序列化回 JSON 字符串

### Project Structure Notes

**前端文件路径**:
```
frontend/ppa_frontend/src/pages/ModelConfig/Prompts/components/
  ├── VariableEditor.tsx          # 变量编辑对话框
  ├── VariableList.tsx            # 变量列表组件
  ├── PreviewModal.tsx            # 预览对话框
  └── VariableInsertButton.tsx    # 插入变量按钮
```

**后端文件路径**:
```
server/
  ├── controllers/promptTemplateController.js
  │   └── previewTemplate()       # 新增方法
  │   └── copyTemplate()          # 新增方法
  ├── routes/promptTemplates.js
  │   └── POST /api/config/prompts/:id/preview
  │   └── POST /api/config/prompts/:id/copy
  └── utils/templateVariableParser.js  # 新增工具：变量解析和替换
```

**测试文件路径**:
```
frontend/ppa_frontend/src/pages/ModelConfig/Prompts/components/__tests__/
  ├── VariableEditor.test.tsx
  └── PreviewModal.test.tsx

server/tests/
  ├── promptTemplateController.preview.test.js
  └── promptTemplateController.copy.test.js
```

### References

- [PRD: 模型配置功能详细规格](docs/prd/model-config-spec.md#4-子模块2-提示词模板管理)
  - 第 4.5 节：交互逻辑 - 变量管理、预览功能、复制模板
  - 第 4.6 节：系统预置模板 - 变量定义示例
  - 第 4.7 节：API 接口 - 预览和复制接口定义
- [PRD: 数据结构](docs/prd/model-config-spec.md#43-数据结构)
  - variables_json 字段结构定义
- [PRD: 页面设计](docs/prd/model-config-spec.md#44-页面设计)
  - 变量编辑对话框 UI
  - 预览对话框 UI

### Testing Standards

1. **单元测试**:
   - 变量格式验证函数：测试有效/无效的变量名
   - 变量检测逻辑：测试正则匹配各种模式
   - 变量替换函数：测试完整替换、部分替换、缺失变量

2. **组件测试**:
   - VariableEditor：测试表单验证、保存、取消
   - PreviewModal：测试数据填写、API 调用、结果显示

3. **集成测试**:
   - 创建模板 → 添加变量 → 预览 → 验证结果
   - 复制模板 → 验证新模板数据独立性

4. **API 测试**:
   - 预览 API：正常流程、缺失必填变量、模板不存在
   - 复制 API：正常复制、复制系统模板、模板不存在

## Dev Agent Record

### Context Reference

- Path: docs/stories/story-context-1.4.xml

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled during implementation_

### Completion Notes List

_To be filled upon story completion_

### File List

```
<!-- Files created/modified will be listed here -->
```

---

**Change Log**:
- 2025-10-23: Story created based on PRD Section 4.5 (Variable Management and Preview)
