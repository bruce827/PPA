# 测试脚本：风险评估项配置模块

## 测试信息

- **测试日期**: 2025-10-20
- **测试环境**: 开发环境
- **应用版本**: v1.0
- **测试范围**: 参数配置 - 风险评估项管理 (`/config` Tab 2)
- **测试工具**: chrome-dev-tool MCP

## 测试目标

验证风险评估项配置模块的完整功能，包括：
- 风险评估项列表展示
- 新建风险评估项（弹窗表单）
- 编辑风险评估项
- 删除风险评估项
- 选项管理（添加、删除、编辑选项）
- 表单验证（必填项、选项数量）
- JSON 数据格式处理
- 数据持久化
- 风险项被使用时的删除处理

## 前置条件

- ✅ 前端服务运行在 `http://localhost:8000`
- ✅ 后端服务运行在 `http://localhost:3001`
- ✅ 数据库已初始化
- ✅ 可以访问参数配置页面
- ✅ 后端实现了风险评估项的完整 CRUD API

## 测试数据准备

### 初始风险评估项数据

准备一些基础风险评估项用于测试：

**风险评估项 1**:
```json
{
  "category": "技术风险",
  "item_name": "技术复杂度",
  "options_json": [
    { "label": "低 - 成熟技术栈", "score": 0 },
    { "label": "中 - 部分新技术", "score": 10 },
    { "label": "高 - 大量新技术", "score": 20 }
  ]
}
```

**风险评估项 2**:
```json
{
  "category": "项目风险",
  "item_name": "需求变更风险",
  "options_json": [
    { "label": "低 - 需求明确", "score": 0 },
    { "label": "高 - 需求不明确", "score": 15 }
  ]
}
```

---

## 测试用例

### 用例 1：页面加载与列表展示

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问 `/config` 页面 → 页面成功加载
2. 点击"风险评估项管理"Tab → 切换到 Tab 2
3. 验证 Tab 切换成功 → Tab 高亮
4. 检查 ProTable 组件 → 表格正确渲染
5. 验证表格列 → 包含评估类别、评估项、选项(JSON)、操作
6. 验证风险项数据 → 显示所有已配置风险项
7. 验证"新建"按钮 → 按钮可见

**测试数据**:

- 使用前置条件中的初始风险评估项数据

**验证点**:

- [ ] Tab 切换功能正常
- [ ] "风险评估项管理" Tab 处于激活状态
- [ ] ProTable 正确渲染
- [ ] 表格列完整（评估类别、评估项、选项、操作）
- [ ] 显示所有风险评估项数据
- [ ] 选项列显示 JSON 格式（可能是省略号）
- [ ] "新建"按钮可见可点击
- [ ] 无 JavaScript 错误

**执行命令**:

```javascript
// 1. 访问配置页面
mcp_chrome-devtoo_new_page({
  url: "http://localhost:8000/config"
})

// 2. 等待页面加载
mcp_chrome-devtoo_wait_for({
  text: "参数配置",
  timeout: 5000
})

// 3. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 4. 点击"风险评估项管理"Tab
mcp_chrome-devtoo_click({
  uid: "风险评估项管理Tab的uid"
})

// 5. 等待 Tab 切换
mcp_chrome-devtoo_wait_for({
  text: "评估类别",
  timeout: 3000
})

// 6. 拍摄切换后状态
mcp_chrome-devtoo_take_snapshot({})

// 7. 验证 Tab 状态
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const activeTab = document.querySelector('.ant-tabs-tab-active')?.innerText;
    return { activeTab: activeTab };
  }`
})
// 预期: { activeTab: "风险评估项管理" }

// 8. 验证表格渲染
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const table = document.querySelector('.ant-table');
    const headers = Array.from(document.querySelectorAll('.ant-table-thead th'))
      .map(th => th.innerText);
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    
    return {
      hasTable: !!table,
      headers: headers,
      rowCount: rows.length
    };
  }`
})
// 预期: { hasTable: true, headers: ["评估类别", "评估项", "选项(JSON)", "操作"], rowCount: 2 }

// 9. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-initial.png"
})

// 10. 检查控制台无错误
mcp_chrome-devtoo_list_console_messages({})
```

---

### 用例 2：新建风险评估项 - 正常流程

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 在风险评估项管理页面点击"新建"按钮 → 打开弹窗表单
2. 验证弹窗显示 → Modal 正确渲染
3. 填写评估类别 → "业务风险"
4. 填写评估项名称 → "业务流程复杂度"
5. 点击"新增选项"按钮 → 添加第一个选项
6. 填写选项 1 → label: "简单", score: 0
7. 点击"新增选项"按钮 → 添加第二个选项
8. 填写选项 2 → label: "复杂", score: 10
9. 点击"确定"按钮 → 调用 POST /api/config/risk-items
10. 验证保存成功 → 显示成功提示，弹窗关闭
11. 验证列表刷新 → 新风险项出现在列表中

**测试数据**:

```json
{
  "category": "业务风险",
  "item_name": "业务流程复杂度",
  "options_json": [
    { "label": "简单", "score": 0 },
    { "label": "复杂", "score": 10 }
  ]
}
```

**验证点**:

- [ ] 点击"新建"打开 Modal 弹窗
- [ ] 弹窗标题为 "新建风险评估项" 或类似
- [ ] 表单字段完整显示
- [ ] "新增选项"功能正常
- [ ] 可以添加多个选项
- [ ] 保存调用 POST API
- [ ] options_json 格式正确（JSON 字符串）
- [ ] 显示成功提示
- [ ] 新风险项出现在列表
- [ ] 数据持久化成功

**执行命令**:

```javascript
// 1. 确保在风险评估项管理 Tab
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "参数配置"
})

mcp_chrome-devtoo_click({
  uid: "风险评估项管理Tab的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "评估类别"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"新建"按钮
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

// 4. 等待弹窗出现
mcp_chrome-devtoo_wait_for({
  text: "新建风险评估项",
  timeout: 2000
})

// 5. 拍摄弹窗状态
mcp_chrome-devtoo_take_snapshot({})

// 6. 填写评估类别
mcp_chrome-devtoo_fill({
  uid: "评估类别输入框的uid",
  value: "业务风险"
})

// 7. 填写评估项名称
mcp_chrome-devtoo_fill({
  uid: "评估项名称输入框的uid",
  value: "业务流程复杂度"
})

// 8. 点击"新增选项"
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "新增选项按钮的uid"
})

// 9. 填写第一个选项
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "选项1标签输入框的uid",
  value: "简单"
})

mcp_chrome-devtoo_fill({
  uid: "选项1分值输入框的uid",
  value: "0"
})

// 10. 点击"新增选项"添加第二个选项
mcp_chrome-devtoo_click({
  uid: "新增选项按钮的uid"
})

// 11. 填写第二个选项
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "选项2标签输入框的uid",
  value: "复杂"
})

mcp_chrome-devtoo_fill({
  uid: "选项2分值输入框的uid",
  value: "10"
})

// 12. 截图保存（填写完成状态）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-create-form-filled.png"
})

// 13. 点击"确定"按钮
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "确定按钮的uid"
})

// 14. 等待保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})

// 15. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 16. 验证新风险项在列表中
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => ({
      category: row.querySelector('td:nth-child(1)')?.innerText,
      itemName: row.querySelector('td:nth-child(2)')?.innerText
    }));
    
    const hasNewItem = items.some(item => 
      item.itemName === '业务流程复杂度'
    );
    
    return {
      totalItems: items.length,
      hasNewItem: hasNewItem
    };
  }`
})
// 预期: { totalItems: 3, hasNewItem: true }

// 17. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-create-success.png"
})
```

---

### 用例 3：新建风险评估项 - 必填项验证

**优先级**: 高  
**类型**: 验证测试

**测试步骤**:

1. 点击"新建"按钮 → 打开弹窗
2. 不填写评估类别和评估项 → 保持空白
3. 点击"确定" → 触发验证
4. 验证错误提示 → 显示必填项错误
5. 填写评估类别和评估项 → 填写完整
6. 不添加任何选项 → 选项列表为空
7. 点击"确定" → 触发验证
8. 验证错误提示 → 显示"至少需要 1 个选项"

**测试数据**:

- 缺失评估类别
- 缺失评估项名称
- 缺失选项

**验证点**:

- [ ] 评估类别必填验证生效
- [ ] 评估项名称必填验证生效
- [ ] 至少 1 个选项验证生效
- [ ] 错误提示清晰明确
- [ ] 字段标红显示

**执行命令**:

```javascript
// 1. 点击新建
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

// 2. 等待弹窗
mcp_chrome-devtoo_wait_for({
  text: "新建风险评估项",
  timeout: 2000
})

// 3. 拍摄空白表单
mcp_chrome-devtoo_take_snapshot({})

// 4. 直接点击确定（不填写任何内容）
mcp_chrome-devtoo_click({
  uid: "确定按钮的uid"
})

// 5. 等待验证错误
mcp_chrome-devtoo_wait_for({
  text: "必填",
  timeout: 2000
})

// 6. 截图记录验证错误
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-validation-required.png"
})

// 7. 填写评估类别和评估项
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "评估类别输入框的uid",
  value: "测试类别"
})

mcp_chrome-devtoo_fill({
  uid: "评估项名称输入框的uid",
  value: "测试评估项"
})

// 8. 不添加选项，直接点击确定
mcp_chrome-devtoo_click({
  uid: "确定按钮的uid"
})

// 9. 等待选项验证错误
mcp_chrome-devtoo_wait_for({
  text: "至少",
  timeout: 2000
})

// 10. 截图记录选项验证错误
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-validation-no-options.png"
})

// 11. 点击取消关闭弹窗
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "取消按钮的uid"
})
```

---

### 用例 4：选项管理 - 添加/删除选项

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 点击"新建"按钮 → 打开弹窗
2. 填写基本信息 → 评估类别和评估项
3. 点击"新增选项"3 次 → 添加 3 个选项
4. 验证选项数量 → 显示 3 个选项输入框
5. 填写 3 个选项的内容 → 完整填写
6. 点击第 2 个选项的"删除"按钮 → 删除选项
7. 验证选项数量 → 剩余 2 个选项
8. 保存风险项 → 验证保存成功

**测试数据**:

```json
{
  "category": "测试风险",
  "item_name": "多选项测试",
  "options_json": [
    { "label": "选项1", "score": 5 },
    { "label": "选项3", "score": 15 }
  ]
}
```

**验证点**:

- [ ] "新增选项"功能正常
- [ ] 可以添加多个选项（至少 3 个）
- [ ] 每个选项有"删除"按钮
- [ ] 删除选项功能正常
- [ ] 删除后索引自动调整
- [ ] 保存时只包含未删除的选项

**执行命令**:

```javascript
// 1. 点击新建
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "新建风险评估项"
})

// 2. 填写基本信息
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "评估类别输入框的uid",
  value: "测试风险"
})

mcp_chrome-devtoo_fill({
  uid: "评估项名称输入框的uid",
  value: "多选项测试"
})

// 3. 添加 3 个选项
for (let i = 0; i < 3; i++) {
  mcp_chrome-devtoo_click({
    uid: "新增选项按钮的uid"
  })
  
  mcp_chrome-devtoo_wait_for({
    text: "label",
    timeout: 1000
  })
}

// 4. 验证选项数量
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const optionItems = document.querySelectorAll('.ant-form-item[data-field*="options"]');
    return { optionCount: optionItems.length };
  }`
})
// 预期: { optionCount: 3 }

// 5. 填写 3 个选项
mcp_chrome-devtoo_take_snapshot({})

// 填写选项1
mcp_chrome-devtoo_fill({
  uid: "选项1标签输入框的uid",
  value: "选项1"
})
mcp_chrome-devtoo_fill({
  uid: "选项1分值输入框的uid",
  value: "5"
})

// 填写选项2
mcp_chrome-devtoo_fill({
  uid: "选项2标签输入框的uid",
  value: "选项2"
})
mcp_chrome-devtoo_fill({
  uid: "选项2分值输入框的uid",
  value: "10"
})

// 填写选项3
mcp_chrome-devtoo_fill({
  uid: "选项3标签输入框的uid",
  value: "选项3"
})
mcp_chrome-devtoo_fill({
  uid: "选项3分值输入框的uid",
  value: "15"
})

// 6. 截图保存（3个选项）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-three-options.png"
})

// 7. 点击删除第2个选项
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "选项2删除按钮的uid"
})

// 8. 验证剩余2个选项
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const optionItems = document.querySelectorAll('.ant-form-item[data-field*="options"]');
    return { optionCount: optionItems.length };
  }`
})
// 预期: { optionCount: 2 }

// 9. 截图保存（删除后）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-option-deleted.png"
})

// 10. 点击确定保存
mcp_chrome-devtoo_click({
  uid: "确定按钮的uid"
})

// 11. 等待保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})
```

---

### 用例 5：编辑风险评估项

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 定位"技术复杂度"的"编辑"按钮 → 按钮可见
2. 点击"编辑"按钮 → 打开弹窗，数据已填充
3. 验证弹窗标题 → "编辑风险评估项"
4. 验证数据填充 → 评估类别、评估项、选项都已填充
5. 修改评估类别 → 从"技术风险"改为"技术风险(已修改)"
6. 修改第一个选项的分值 → 从 0 改为 5
7. 添加一个新选项 → "超高 - 前沿技术", score: 30
8. 点击"确定"保存 → 调用 PUT /api/config/risk-items/:id
9. 验证保存成功 → 显示成功提示
10. 验证数据更新 → 列表显示更新后的数据

**测试数据**:

```json
{
  "category": "技术风险(已修改)",
  "item_name": "技术复杂度",
  "options_json": [
    { "label": "低 - 成熟技术栈", "score": 5 },
    { "label": "中 - 部分新技术", "score": 10 },
    { "label": "高 - 大量新技术", "score": 20 },
    { "label": "超高 - 前沿技术", "score": 30 }
  ]
}
```

**验证点**:

- [ ] "编辑"按钮可见可点击
- [ ] 点击后打开弹窗
- [ ] 弹窗标题为"编辑风险评估项"
- [ ] 数据正确填充到表单
- [ ] 可以修改所有字段
- [ ] 可以修改选项
- [ ] 可以添加新选项
- [ ] 保存调用 PUT API
- [ ] 数据更新成功

**执行命令**:

```javascript
// 1. 确保在风险评估项管理页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "参数配置"
})

mcp_chrome-devtoo_click({
  uid: "风险评估项管理Tab的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "技术复杂度"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"技术复杂度"的编辑按钮
mcp_chrome-devtoo_click({
  uid: "技术复杂度编辑按钮的uid"
})

// 4. 等待弹窗出现
mcp_chrome-devtoo_wait_for({
  text: "编辑风险评估项",
  timeout: 2000
})

// 5. 拍摄弹窗状态（数据已填充）
mcp_chrome-devtoo_take_snapshot({})

// 6. 验证数据已填充
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const categoryInput = document.querySelector('input[id*="category"]');
    const itemNameInput = document.querySelector('input[id*="item_name"]');
    
    return {
      categoryValue: categoryInput?.value,
      itemNameValue: itemNameInput?.value
    };
  }`
})
// 预期: { categoryValue: "技术风险", itemNameValue: "技术复杂度" }

// 7. 截图保存（编辑弹窗）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-edit-modal.png"
})

// 8. 修改评估类别
mcp_chrome-devtoo_fill({
  uid: "评估类别输入框的uid",
  value: "技术风险(已修改)"
})

// 9. 修改第一个选项的分值
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "选项1分值输入框的uid",
  value: "5"
})

// 10. 添加新选项
mcp_chrome-devtoo_click({
  uid: "新增选项按钮的uid"
})

mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "新选项标签输入框的uid",
  value: "超高 - 前沿技术"
})

mcp_chrome-devtoo_fill({
  uid: "新选项分值输入框的uid",
  value: "30"
})

// 11. 点击确定保存
mcp_chrome-devtoo_click({
  uid: "确定按钮的uid"
})

// 12. 等待保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})

// 13. 监控网络请求（验证是 PUT）
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 14. 验证数据更新
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    let techCategory = null;
    
    rows.forEach(row => {
      const itemName = row.querySelector('td:nth-child(2)')?.innerText;
      if (itemName === '技术复杂度') {
        techCategory = row.querySelector('td:nth-child(1)')?.innerText;
      }
    });
    
    return { techCategory: techCategory };
  }`
})
// 预期: { techCategory: "技术风险(已修改)" }

// 15. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-edit-success.png"
})
```

---

### 用例 6：删除风险评估项 - 正常流程

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 记录当前风险项总数 → 例如 3 个
2. 定位"业务流程复杂度"的"删除"按钮 → 按钮可见
3. 点击"删除"按钮 → 弹出确认对话框
4. 验证确认对话框 → 显示警告信息
5. 点击"取消" → 对话框关闭，风险项保留
6. 再次点击"删除" → 弹出确认对话框
7. 点击"确认" → 调用 DELETE /api/config/risk-items/:id
8. 验证删除成功 → 显示成功提示
9. 验证风险项从列表移除 → 总数减少 1
10. 刷新页面验证持久化 → 风险项不再存在

**测试数据**:

- 删除 "业务流程复杂度" 风险项

**验证点**:

- [ ] "删除"按钮可见可点击
- [ ] 点击后弹出确认对话框
- [ ] 对话框包含警告信息
- [ ] "取消"按钮取消删除
- [ ] "确认"按钮执行删除
- [ ] 调用 DELETE API
- [ ] 显示成功提示
- [ ] 风险项从列表移除
- [ ] 数据持久化

**执行命令**:

```javascript
// 1. 访问页面并记录初始数量
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "参数配置"
})

mcp_chrome-devtoo_click({
  uid: "风险评估项管理Tab的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "业务流程复杂度"
})

mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    return { initialCount: rows.length };
  }`
})

// 2. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击删除按钮
mcp_chrome-devtoo_click({
  uid: "业务流程复杂度删除按钮的uid"
})

// 4. 等待确认对话框
mcp_chrome-devtoo_wait_for({
  text: "确认删除",
  timeout: 2000
})

// 5. 截图保存（对话框）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-delete-confirm.png"
})

// 6. 点击取消
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "取消按钮的uid"
})

// 7. 验证风险项仍存在
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => 
      row.querySelector('td:nth-child(2)')?.innerText
    ).filter(Boolean);
    
    return { 
      countAfterCancel: rows.length,
      hasItem: items.includes('业务流程复杂度')
    };
  }`
})

// 8. 再次点击删除
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "业务流程复杂度删除按钮的uid"
})

// 9. 等待确认对话框
mcp_chrome-devtoo_wait_for({
  text: "确认删除",
  timeout: 2000
})

// 10. 点击确认
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "确认按钮的uid"
})

// 11. 等待删除成功
mcp_chrome-devtoo_wait_for({
  text: "删除成功",
  timeout: 3000
})

// 12. 验证风险项已删除
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => 
      row.querySelector('td:nth-child(2)')?.innerText
    ).filter(Boolean);
    
    return { 
      countAfterDelete: rows.length,
      hasItem: items.includes('业务流程复杂度')
    };
  }`
})

// 13. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 14. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-delete-success.png"
})

// 15. 刷新验证持久化
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_click({
  uid: "风险评估项管理Tab的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "评估类别"
})

mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => 
      row.querySelector('td:nth-child(2)')?.innerText
    ).filter(Boolean);
    
    return { 
      countAfterRefresh: rows.length,
      hasItem: items.includes('业务流程复杂度')
    };
  }`
})
```

---

### 用例 7：选项分值验证

**优先级**: 中  
**类型**: 验证测试

**测试步骤**:

1. 点击"新建"按钮 → 打开弹窗
2. 填写基本信息 → 类别和评估项
3. 添加选项，填写标签 → "测试选项"
4. 填写负数分值 → -10
5. 点击"确定" → 触发验证
6. 验证错误提示 → "分值必须大于或等于 0"
7. 修改为非数字 → "abc"
8. 点击"确定" → 触发验证
9. 验证错误提示 → "请输入有效的数字"
10. 修改为正确值 → 10
11. 保存成功

**测试数据**:

- 负数测试: -10
- 非数字测试: "abc"
- 正确数据: 10

**验证点**:

- [ ] 负数验证生效
- [ ] 非数字验证生效
- [ ] 错误提示清晰
- [ ] 正确数据可保存

**执行命令**:

```javascript
// 1. 点击新建
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "新建风险评估项"
})

// 2. 填写基本信息
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "评估类别输入框的uid",
  value: "测试类别"
})

mcp_chrome-devtoo_fill({
  uid: "评估项名称输入框的uid",
  value: "分值验证测试"
})

// 3. 添加选项
mcp_chrome-devtoo_click({
  uid: "新增选项按钮的uid"
})

// 4. 填写选项标签
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "选项标签输入框的uid",
  value: "测试选项"
})

// 5. 填写负数分值
mcp_chrome-devtoo_fill({
  uid: "选项分值输入框的uid",
  value: "-10"
})

// 6. 点击确定
mcp_chrome-devtoo_click({
  uid: "确定按钮的uid"
})

// 7. 等待验证错误
mcp_chrome-devtoo_wait_for({
  text: "大于",
  timeout: 2000
})

// 8. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-score-negative.png"
})

// 9. 修改为非数字
mcp_chrome-devtoo_fill({
  uid: "选项分值输入框的uid",
  value: "abc"
})

mcp_chrome-devtoo_click({
  uid: "确定按钮的uid"
})

// 10. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-score-non-numeric.png"
})

// 11. 修改为正确值
mcp_chrome-devtoo_fill({
  uid: "选项分值输入框的uid",
  value: "10"
})

mcp_chrome-devtoo_click({
  uid: "确定按钮的uid"
})

// 12. 验证保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})
```

---

### 用例 8：取消操作 - 关闭弹窗

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 点击"新建"按钮 → 打开弹窗
2. 填写部分数据 → 类别、评估项、1个选项
3. 点击"取消"按钮 → 关闭弹窗
4. 验证弹窗关闭 → Modal 不可见
5. 验证数据未保存 → 列表无新增项
6. 再次点击"新建" → 打开新的空白弹窗
7. 验证表单为空 → 之前填写的数据不保留

**测试数据**:

- 部分填写的数据（未保存）

**验证点**:

- [ ] "取消"按钮功能正常
- [ ] 弹窗正确关闭
- [ ] 数据未保存
- [ ] 未调用保存 API
- [ ] 再次打开弹窗表单为空

**执行命令**:

```javascript
// 1. 点击新建
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "新建风险评估项"
})

// 2. 填写部分数据
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "评估类别输入框的uid",
  value: "临时数据"
})

mcp_chrome-devtoo_fill({
  uid: "评估项名称输入框的uid",
  value: "临时评估项"
})

mcp_chrome-devtoo_click({
  uid: "新增选项按钮的uid"
})

mcp_chrome-devtoo_fill({
  uid: "选项标签输入框的uid",
  value: "临时选项"
})

// 3. 截图保存（填写状态）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-before-cancel.png"
})

// 4. 点击取消
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "取消按钮的uid"
})

// 5. 验证弹窗关闭
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const modal = document.querySelector('.ant-modal');
    const isVisible = modal && modal.style.display !== 'none';
    
    return { modalVisible: isVisible };
  }`
})
// 预期: { modalVisible: false }

// 6. 验证列表无变化
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => 
      row.querySelector('td:nth-child(2)')?.innerText
    ).filter(Boolean);
    
    return { 
      hasTemporaryItem: items.includes('临时评估项')
    };
  }`
})
// 预期: { hasTemporaryItem: false }

// 7. 再次点击新建
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "新建风险评估项"
})

// 8. 验证表单为空
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const categoryInput = document.querySelector('input[id*="category"]');
    const itemNameInput = document.querySelector('input[id*="item_name"]');
    
    return {
      categoryEmpty: !categoryInput?.value,
      itemNameEmpty: !itemNameInput?.value
    };
  }`
})
// 预期: { categoryEmpty: true, itemNameEmpty: true }

// 9. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-reopened-empty.png"
})

// 10. 关闭弹窗
mcp_chrome-devtoo_click({
  uid: "取消按钮的uid"
})
```

---

### 用例 9：JSON 数据格式验证

**优先级**: 中  
**类型**: 数据验证测试

**测试步骤**:

1. 创建一个新的风险评估项 → 包含特殊字符的选项
2. 选项标签包含特殊字符 → "高风险 - "引号"测试"
3. 保存成功 → 验证保存成功
4. 通过 API 获取该风险项 → 验证 JSON 格式正确
5. 编辑该风险项 → 验证数据正确加载
6. 验证特殊字符正确显示 → 无乱码或转义问题

**测试数据**:

```json
{
  "category": "JSON测试",
  "item_name": "特殊字符测试",
  "options_json": [
    { "label": "选项 - \"引号\"测试", "score": 10 },
    { "label": "选项 - '单引号'测试", "score": 20 }
  ]
}
```

**验证点**:

- [ ] 特殊字符可以正确保存
- [ ] JSON 格式正确
- [ ] 特殊字符正确显示
- [ ] 编辑时数据正确加载
- [ ] 无 JSON 解析错误

**执行命令**:

```javascript
// 1. 创建包含特殊字符的风险项
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "新建风险评估项"
})

mcp_chrome-devtoo_fill({
  uid: "评估类别输入框的uid",
  value: "JSON测试"
})

mcp_chrome-devtoo_fill({
  uid: "评估项名称输入框的uid",
  value: "特殊字符测试"
})

mcp_chrome-devtoo_click({
  uid: "新增选项按钮的uid"
})

mcp_chrome-devtoo_fill({
  uid: "选项标签输入框的uid",
  value: '选项 - "引号"测试'
})

mcp_chrome-devtoo_fill({
  uid: "选项分值输入框的uid",
  value: "10"
})

mcp_chrome-devtoo_click({
  uid: "确定按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})

// 2. 通过 API 获取该风险项验证 JSON 格式
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const response = await fetch('http://localhost:3001/api/config/risk-items');
    const { data } = await response.json();
    
    const testItem = data.find(item => item.item_name === '特殊字符测试');
    
    if (testItem) {
      const options = JSON.parse(testItem.options_json);
      return {
        hasItem: true,
        firstOptionLabel: options[0]?.label
      };
    }
    
    return { hasItem: false };
  }`
})
// 预期: { hasItem: true, firstOptionLabel: '选项 - "引号"测试' }

// 3. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-risk-items-special-chars.png"
})
```

---

## 风险点识别

- ⚠️ **JSON 序列化**: options_json 字段的序列化和反序列化可能出错
- ⚠️ **特殊字符处理**: 选项标签包含特殊字符可能导致 JSON 解析失败
- ⚠️ **选项顺序**: 编辑时选项顺序可能改变
- ⚠️ **风险项依赖**: 删除正在被项目使用的风险项可能导致数据不一致
- ⚠️ **选项数量限制**: 过多选项可能影响性能或 UI 显示

## 测试环境信息

- **浏览器**: Chrome (最新版本)
- **屏幕分辨率**: 1920×1080
- **操作系统**: macOS
- **前端端口**: 8000
- **后端端口**: 3001

## 测试数据清理

测试完成后执行清理：

```javascript
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const response = await fetch('http://localhost:3001/api/config/risk-items');
    const { data } = await response.json();
    
    // 删除测试创建的风险项
    const testItems = data.filter(item => 
      item.category.includes('测试') || 
      item.item_name.includes('测试') ||
      item.category.includes('业务风险')
    );
    
    for (const item of testItems) {
      await fetch(\`http://localhost:3001/api/config/risk-items/\${item.id}\`, {
        method: 'DELETE'
      });
    }
    
    return { deleted: testItems.length };
  }`
})
```

---

## 测试执行总结

### 测试执行检查清单

- [ ] 用例 1: 页面加载与列表展示
- [ ] 用例 2: 新建风险评估项 - 正常流程
- [ ] 用例 3: 新建风险评估项 - 必填项验证
- [ ] 用例 4: 选项管理 - 添加/删除选项
- [ ] 用例 5: 编辑风险评估项
- [ ] 用例 6: 删除风险评估项 - 正常流程
- [ ] 用例 7: 选项分值验证
- [ ] 用例 8: 取消操作 - 关闭弹窗
- [ ] 用例 9: JSON 数据格式验证

### 预期测试结果

- ✅ 所有 CRUD 功能正常
- ✅ 弹窗表单功能完整
- ✅ 选项管理功能正常
- ✅ JSON 数据处理正确
- ✅ 无阻塞性 Bug

---

**脚本版本**: v1.0  
**创建日期**: 2025-10-20  
**最后更新**: 2025-10-20
