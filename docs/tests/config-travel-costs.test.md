# 测试脚本：差旅成本配置模块

## 测试信息

- **测试日期**: 2025-10-20
- **测试环境**: 开发环境
- **应用版本**: v1.0
- **测试范围**: 参数配置 - 差旅成本配置 (`/config` Tab 3)
- **测试工具**: chrome-dev-tool MCP

## 测试目标

验证差旅成本配置模块的完整功能，包括：
- 差旅成本列表展示
- 可编辑 ProTable 的新建功能
- 可编辑 ProTable 的编辑功能
- 删除差旅成本项
- 表单验证（必填项、数值格式）
- 数据持久化
- 成本项被使用时的删除处理

## 前置条件

- ✅ 前端服务运行在 `http://localhost:8000`
- ✅ 后端服务运行在 `http://localhost:3001`
- ✅ 数据库已初始化
- ✅ 可以访问参数配置页面
- ✅ 后端实现了差旅成本的完整 CRUD API

## 测试数据准备

### 初始差旅成本数据

准备一些基础差旅成本项用于测试：

**差旅成本项 1**:
```json
{
  "item_name": "市内交通",
  "cost_per_month": 500
}
```

**差旅成本项 2**:
```json
{
  "item_name": "跨城差旅",
  "cost_per_month": 2000
}
```

**差旅成本项 3**:
```json
{
  "item_name": "国际出差",
  "cost_per_month": 5000
}
```

---

## 测试用例

### 用例 1：页面加载与列表展示

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问 `/config` 页面 → 页面成功加载
2. 点击"差旅成本配置"Tab → 切换到 Tab 3
3. 验证 Tab 切换成功 → Tab 高亮
4. 检查可编辑 ProTable 组件 → 表格正确渲染
5. 验证表格列 → 包含成本项、单月成本(元)、操作
6. 验证差旅成本数据 → 显示所有已配置成本项
7. 验证"新建"按钮 → 按钮可见可用

**测试数据**:

- 使用前置条件中的初始差旅成本数据

**验证点**:

- [ ] Tab 切换功能正常
- [ ] "差旅成本配置" Tab 处于激活状态
- [ ] 可编辑 ProTable 正确渲染
- [ ] 表格列完整（成本项、单月成本、操作）
- [ ] 显示所有差旅成本数据
- [ ] 数值格式正确显示（元）
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

// 4. 点击"差旅成本配置"Tab
mcp_chrome-devtoo_click({
  uid: "差旅成本配置Tab的uid"
})

// 5. 等待 Tab 切换
mcp_chrome-devtoo_wait_for({
  text: "成本项",
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
// 预期: { activeTab: "差旅成本配置" }

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
// 预期: { hasTable: true, headers: ["成本项", "单月成本(元)", "操作"], rowCount: 3 }

// 9. 验证数据显示
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const costs = Array.from(rows).map(row => ({
      itemName: row.querySelector('td:nth-child(1)')?.innerText,
      costPerMonth: row.querySelector('td:nth-child(2)')?.innerText
    }));
    
    return { costs: costs };
  }`
})
// 预期: { costs: [{itemName: "市内交通", costPerMonth: "500"}, ...] }

// 10. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-initial.png"
})

// 11. 检查控制台无错误
mcp_chrome-devtoo_list_console_messages({})
```

---

### 用例 2：新建差旅成本项 - 正常流程

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 在差旅成本配置页面点击"新建"按钮 → 表格底部出现新行
2. 验证新行状态 → 处于可编辑状态
3. 填写成本项名称 → "住宿费用"
4. 填写单月成本 → 3000
5. 点击"保存"按钮（或确认图标）→ 调用 POST /api/config/travel-costs
6. 验证保存成功 → 显示成功提示
7. 验证新行变为只读状态 → 数据正确显示
8. 验证数据出现在列表中 → 新成本项在列表中

**测试数据**:

```json
{
  "item_name": "住宿费用",
  "cost_per_month": 3000
}
```

**验证点**:

- [ ] 点击"新建"出现可编辑新行
- [ ] 新行包含输入框
- [ ] 可以填写成本项和成本
- [ ] 保存调用 POST API
- [ ] 显示成功提示
- [ ] 新行变为只读状态
- [ ] 新成本项出现在列表
- [ ] 数据持久化成功

**执行命令**:

```javascript
// 1. 确保在差旅成本配置 Tab
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "参数配置"
})

mcp_chrome-devtoo_click({
  uid: "差旅成本配置Tab的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "成本项"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 记录初始行数
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    return { initialCount: rows.length };
  }`
})

// 4. 点击"新建"按钮
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

// 5. 等待新行出现
mcp_chrome-devtoo_wait_for({
  text: "保存",
  timeout: 2000
})

// 6. 拍摄新行状态
mcp_chrome-devtoo_take_snapshot({})

// 7. 验证新行为可编辑状态
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const editingRow = document.querySelector('.ant-table-tbody tr.ant-table-row-selected');
    const inputs = editingRow?.querySelectorAll('input');
    
    return {
      hasEditingRow: !!editingRow,
      inputCount: inputs?.length || 0
    };
  }`
})
// 预期: { hasEditingRow: true, inputCount: 2 }

// 8. 填写成本项名称
mcp_chrome-devtoo_fill({
  uid: "成本项名称输入框的uid",
  value: "住宿费用"
})

// 9. 填写单月成本
mcp_chrome-devtoo_fill({
  uid: "单月成本输入框的uid",
  value: "3000"
})

// 10. 截图保存（填写完成状态）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-create-filled.png"
})

// 11. 点击"保存"按钮
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 12. 等待保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})

// 13. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 14. 验证新成本项在列表中
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => ({
      itemName: row.querySelector('td:nth-child(1)')?.innerText,
      cost: row.querySelector('td:nth-child(2)')?.innerText
    }));
    
    const hasNewItem = items.some(item => 
      item.itemName === '住宿费用'
    );
    
    return {
      totalItems: items.length,
      hasNewItem: hasNewItem
    };
  }`
})
// 预期: { totalItems: 4, hasNewItem: true }

// 15. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-create-success.png"
})
```

---

### 用例 3：新建差旅成本项 - 必填项验证

**优先级**: 高  
**类型**: 验证测试

**测试步骤**:

1. 点击"新建"按钮 → 出现可编辑新行
2. 不填写成本项名称 → 保持空白
3. 填写单月成本 → 1000
4. 点击"保存" → 触发验证
5. 验证错误提示 → 显示"成本项为必填项"
6. 填写成本项名称 → "测试项"
7. 清空单月成本 → 保持空白
8. 点击"保存" → 触发验证
9. 验证错误提示 → 显示"单月成本为必填项"

**测试数据**:

- 缺失成本项名称
- 缺失单月成本

**验证点**:

- [ ] 成本项名称必填验证生效
- [ ] 单月成本必填验证生效
- [ ] 错误提示清晰明确
- [ ] 字段标红显示
- [ ] 无法保存不完整数据

**执行命令**:

```javascript
// 1. 点击新建
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

// 2. 等待新行
mcp_chrome-devtoo_wait_for({
  text: "保存",
  timeout: 2000
})

// 3. 拍摄空白表单
mcp_chrome-devtoo_take_snapshot({})

// 4. 只填写单月成本
mcp_chrome-devtoo_fill({
  uid: "单月成本输入框的uid",
  value: "1000"
})

// 5. 点击保存（不填写成本项名称）
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 6. 等待验证错误
mcp_chrome-devtoo_wait_for({
  text: "必填",
  timeout: 2000
})

// 7. 截图记录验证错误
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-validation-no-name.png"
})

// 8. 填写成本项名称
mcp_chrome-devtoo_fill({
  uid: "成本项名称输入框的uid",
  value: "测试项"
})

// 9. 清空单月成本
mcp_chrome-devtoo_fill({
  uid: "单月成本输入框的uid",
  value: ""
})

// 10. 点击保存
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 11. 等待验证错误
mcp_chrome-devtoo_wait_for({
  text: "必填",
  timeout: 2000
})

// 12. 截图记录验证错误
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-validation-no-cost.png"
})

// 13. 点击取消关闭编辑
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "取消按钮的uid"
})
```

---

### 用例 4：新建差旅成本项 - 数据格式验证

**优先级**: 高  
**类型**: 验证测试

**测试步骤**:

1. 点击"新建"按钮 → 出现可编辑新行
2. 填写成本项名称 → "格式测试"
3. 填写负数成本 → -500
4. 点击"保存" → 触发验证
5. 验证错误提示 → "成本必须大于 0"
6. 修改为非数字 → "abc"
7. 点击"保存" → 触发验证
8. 验证错误提示 → "请输入有效的数字"
9. 修改为小数 → 1500.50
10. 点击"保存" → 保存成功（小数应该被支持）

**测试数据**:

- 负数测试: -500
- 非数字测试: "abc"
- 小数测试: 1500.50

**验证点**:

- [ ] 负数验证生效
- [ ] 非数字验证生效
- [ ] 小数可以正确保存
- [ ] 错误提示清晰
- [ ] 正确数据可保存

**执行命令**:

```javascript
// 1. 点击新建
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "保存"
})

// 2. 填写成本项名称
mcp_chrome-devtoo_fill({
  uid: "成本项名称输入框的uid",
  value: "格式测试"
})

// 3. 填写负数成本
mcp_chrome-devtoo_fill({
  uid: "单月成本输入框的uid",
  value: "-500"
})

// 4. 点击保存
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 5. 等待验证错误
mcp_chrome-devtoo_wait_for({
  text: "大于",
  timeout: 2000
})

// 6. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-validation-negative.png"
})

// 7. 修改为非数字
mcp_chrome-devtoo_fill({
  uid: "单月成本输入框的uid",
  value: "abc"
})

// 8. 点击保存
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 9. 等待验证错误
mcp_chrome-devtoo_wait_for({
  text: "数字",
  timeout: 2000
})

// 10. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-validation-non-numeric.png"
})

// 11. 修改为小数
mcp_chrome-devtoo_fill({
  uid: "单月成本输入框的uid",
  value: "1500.50"
})

// 12. 点击保存
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 13. 验证保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})

// 14. 验证小数正确显示
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => ({
      itemName: row.querySelector('td:nth-child(1)')?.innerText,
      cost: row.querySelector('td:nth-child(2)')?.innerText
    }));
    
    const testItem = items.find(item => item.itemName === '格式测试');
    
    return { 
      hasItem: !!testItem,
      cost: testItem?.cost
    };
  }`
})
// 预期: { hasItem: true, cost: "1500.50" 或 "1500.5" }

// 15. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-decimal-success.png"
})
```

---

### 用例 5：编辑差旅成本项

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 定位"市内交通"的"编辑"按钮 → 按钮可见
2. 点击"编辑"按钮 → 该行进入可编辑状态
3. 验证可编辑状态 → 显示输入框，数据已填充
4. 修改成本项名称 → "市内交通(已修改)"
5. 修改单月成本 → 从 500 改为 800
6. 点击"保存"按钮 → 调用 PUT /api/config/travel-costs/:id
7. 验证保存成功 → 显示成功提示
8. 验证数据更新 → 列表显示更新后的数据
9. 刷新页面验证持久化 → 数据保持修改后状态

**测试数据**:

```json
{
  "item_name": "市内交通(已修改)",
  "cost_per_month": 800
}
```

**验证点**:

- [ ] "编辑"按钮可见可点击
- [ ] 点击后行进入可编辑状态
- [ ] 数据正确填充到输入框
- [ ] 可以修改所有字段
- [ ] 保存调用 PUT API
- [ ] 数据更新成功
- [ ] 数据持久化

**执行命令**:

```javascript
// 1. 确保在差旅成本配置页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "参数配置"
})

mcp_chrome-devtoo_click({
  uid: "差旅成本配置Tab的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "市内交通"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"市内交通"的编辑按钮
mcp_chrome-devtoo_click({
  uid: "市内交通编辑按钮的uid"
})

// 4. 等待进入编辑状态
mcp_chrome-devtoo_wait_for({
  text: "保存",
  timeout: 2000
})

// 5. 拍摄编辑状态
mcp_chrome-devtoo_take_snapshot({})

// 6. 验证数据已填充
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const editingRow = document.querySelector('.ant-table-tbody tr.ant-table-row-selected');
    const inputs = editingRow?.querySelectorAll('input');
    
    return {
      itemNameValue: inputs?.[0]?.value,
      costValue: inputs?.[1]?.value
    };
  }`
})
// 预期: { itemNameValue: "市内交通", costValue: "500" }

// 7. 截图保存（编辑状态）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-edit-mode.png"
})

// 8. 修改成本项名称
mcp_chrome-devtoo_fill({
  uid: "成本项名称输入框的uid",
  value: "市内交通(已修改)"
})

// 9. 修改单月成本
mcp_chrome-devtoo_fill({
  uid: "单月成本输入框的uid",
  value: "800"
})

// 10. 点击保存
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 11. 等待保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})

// 12. 监控网络请求（验证是 PUT）
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 13. 验证数据更新
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => ({
      itemName: row.querySelector('td:nth-child(1)')?.innerText,
      cost: row.querySelector('td:nth-child(2)')?.innerText
    }));
    
    const modifiedItem = items.find(item => 
      item.itemName.includes('市内交通')
    );
    
    return { 
      itemName: modifiedItem?.itemName,
      cost: modifiedItem?.cost
    };
  }`
})
// 预期: { itemName: "市内交通(已修改)", cost: "800" }

// 14. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-edit-success.png"
})

// 15. 刷新验证持久化
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_click({
  uid: "差旅成本配置Tab的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "市内交通(已修改)"
})

// 16. 验证数据持久化
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => ({
      itemName: row.querySelector('td:nth-child(1)')?.innerText,
      cost: row.querySelector('td:nth-child(2)')?.innerText
    }));
    
    const modifiedItem = items.find(item => 
      item.itemName.includes('市内交通')
    );
    
    return { 
      isPersisted: modifiedItem?.itemName === '市内交通(已修改)',
      cost: modifiedItem?.cost
    };
  }`
})
// 预期: { isPersisted: true, cost: "800" }
```

---

### 用例 6：取消编辑操作

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 点击"跨城差旅"的"编辑"按钮 → 进入编辑状态
2. 修改成本项名称 → "跨城差旅(临时修改)"
3. 修改单月成本 → 3500
4. 点击"取消"按钮 → 退出编辑状态
5. 验证数据未修改 → 仍显示原始数据
6. 验证未调用保存 API → 无 PUT 请求

**测试数据**:

- 临时修改数据（未保存）

**验证点**:

- [ ] "取消"按钮功能正常
- [ ] 退出编辑状态
- [ ] 数据未修改
- [ ] 未调用保存 API
- [ ] 原始数据保持不变

**执行命令**:

```javascript
// 1. 点击编辑
mcp_chrome-devtoo_click({
  uid: "跨城差旅编辑按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "保存"
})

// 2. 修改数据
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "成本项名称输入框的uid",
  value: "跨城差旅(临时修改)"
})

mcp_chrome-devtoo_fill({
  uid: "单月成本输入框的uid",
  value: "3500"
})

// 3. 截图保存（修改后状态）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-before-cancel.png"
})

// 4. 点击取消
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "取消按钮的uid"
})

// 5. 验证退出编辑状态
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const editingRow = document.querySelector('.ant-table-tbody tr.ant-table-row-selected');
    return { isEditing: !!editingRow };
  }`
})
// 预期: { isEditing: false }

// 6. 验证数据未修改
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => ({
      itemName: row.querySelector('td:nth-child(1)')?.innerText,
      cost: row.querySelector('td:nth-child(2)')?.innerText
    }));
    
    const item = items.find(item => item.itemName.includes('跨城差旅'));
    
    return { 
      itemName: item?.itemName,
      cost: item?.cost
    };
  }`
})
// 预期: { itemName: "跨城差旅", cost: "2000" }

// 7. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-cancel-success.png"
})
```

---

### 用例 7：删除差旅成本项 - 正常流程

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 记录当前成本项总数 → 例如 5 个
2. 定位"格式测试"的"删除"按钮 → 按钮可见
3. 点击"删除"按钮 → 弹出确认对话框
4. 验证确认对话框 → 显示警告信息
5. 点击"取消" → 对话框关闭，成本项保留
6. 再次点击"删除" → 弹出确认对话框
7. 点击"确认" → 调用 DELETE /api/config/travel-costs/:id
8. 验证删除成功 → 显示成功提示
9. 验证成本项从列表移除 → 总数减少 1
10. 刷新页面验证持久化 → 成本项不再存在

**测试数据**:

- 删除 "格式测试" 成本项

**验证点**:

- [ ] "删除"按钮可见可点击
- [ ] 点击后弹出确认对话框
- [ ] 对话框包含警告信息
- [ ] "取消"按钮取消删除
- [ ] "确认"按钮执行删除
- [ ] 调用 DELETE API
- [ ] 显示成功提示
- [ ] 成本项从列表移除
- [ ] 数据持久化

**执行命令**:

```javascript
// 1. 记录初始数量
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
  uid: "格式测试删除按钮的uid"
})

// 4. 等待确认对话框
mcp_chrome-devtoo_wait_for({
  text: "确认删除",
  timeout: 2000
})

// 5. 截图保存（对话框）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-delete-confirm.png"
})

// 6. 点击取消
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "取消按钮的uid"
})

// 7. 验证成本项仍存在
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => 
      row.querySelector('td:nth-child(1)')?.innerText
    ).filter(Boolean);
    
    return { 
      hasItem: items.includes('格式测试')
    };
  }`
})

// 8. 再次点击删除
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "格式测试删除按钮的uid"
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

// 12. 验证成本项已删除
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => 
      row.querySelector('td:nth-child(1)')?.innerText
    ).filter(Boolean);
    
    return { 
      countAfterDelete: rows.length,
      hasItem: items.includes('格式测试')
    };
  }`
})

// 13. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 14. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-delete-success.png"
})

// 15. 刷新验证持久化
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_click({
  uid: "差旅成本配置Tab的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "成本项"
})

mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const items = Array.from(rows).map(row => 
      row.querySelector('td:nth-child(1)')?.innerText
    ).filter(Boolean);
    
    return { 
      hasItem: items.includes('格式测试')
    };
  }`
})
// 预期: { hasItem: false }
```

---

### 用例 8：重复成本项名称验证

**优先级**: 中  
**类型**: 验证测试

**测试步骤**:

1. 点击"新建"按钮 → 出现可编辑新行
2. 填写已存在的成本项名称 → "市内交通(已修改)"
3. 填写单月成本 → 1000
4. 点击"保存" → 触发验证
5. 验证错误提示 → "成本项名称已存在"
6. 修改为唯一名称 → "新的成本项"
7. 点击"保存" → 保存成功

**测试数据**:

- 重复名称: "市内交通(已修改)"
- 唯一名称: "新的成本项"

**验证点**:

- [ ] 重复名称验证生效
- [ ] 错误提示清晰
- [ ] 唯一名称可保存
- [ ] 数据完整性保证

**执行命令**:

```javascript
// 1. 点击新建
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "保存"
})

// 2. 填写重复名称
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "成本项名称输入框的uid",
  value: "市内交通(已修改)"
})

mcp_chrome-devtoo_fill({
  uid: "单月成本输入框的uid",
  value: "1000"
})

// 3. 点击保存
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 4. 等待验证错误
mcp_chrome-devtoo_wait_for({
  text: "已存在",
  timeout: 2000
})

// 5. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-duplicate-name.png"
})

// 6. 修改为唯一名称
mcp_chrome-devtoo_fill({
  uid: "成本项名称输入框的uid",
  value: "新的成本项"
})

// 7. 点击保存
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 8. 验证保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})

// 9. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-unique-name-success.png"
})
```

---

### 用例 9：空数据场景

**优先级**: 低  
**类型**: 边界测试

**测试步骤**:

1. 删除所有差旅成本项 → 列表为空
2. 验证空状态显示 → 显示友好的空状态提示
3. 验证"新建"按钮仍可用 → 按钮可见可点击
4. 创建第一个成本项 → "第一个成本项", 500
5. 验证创建成功 → 空状态消失，显示数据

**测试数据**:

```json
{
  "item_name": "第一个成本项",
  "cost_per_month": 500
}
```

**验证点**:

- [ ] 空状态正确显示
- [ ] 空状态提示友好
- [ ] "新建"按钮仍可用
- [ ] 可以创建第一个成本项
- [ ] 创建后空状态消失

**执行命令**:

```javascript
// 1. 删除所有成本项（通过 API）
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const response = await fetch('http://localhost:3001/api/config/travel-costs');
    const { data } = await response.json();
    
    for (const item of data) {
      await fetch(\`http://localhost:3001/api/config/travel-costs/\${item.id}\`, {
        method: 'DELETE'
      });
    }
    
    return { deleted: data.length };
  }`
})

// 2. 刷新页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_click({
  uid: "差旅成本配置Tab的uid"
})

// 3. 验证空状态
mcp_chrome-devtoo_wait_for({
  text: "暂无数据",
  timeout: 3000
})

// 4. 拍摄空状态
mcp_chrome-devtoo_take_snapshot({})

// 5. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-empty-state.png"
})

// 6. 验证新建按钮可用
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const newButton = document.querySelector('button:has-text("新建")');
    return { hasNewButton: !!newButton };
  }`
})

// 7. 创建第一个成本项
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "保存"
})

mcp_chrome-devtoo_fill({
  uid: "成本项名称输入框的uid",
  value: "第一个成本项"
})

mcp_chrome-devtoo_fill({
  uid: "单月成本输入框的uid",
  value: "500"
})

mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 8. 验证创建成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})

// 9. 验证空状态消失
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const emptyState = document.querySelector('.ant-empty');
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    
    return {
      hasEmptyState: !!emptyState,
      rowCount: rows.length
    };
  }`
})
// 预期: { hasEmptyState: false, rowCount: 1 }

// 10. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-travel-costs-first-item-created.png"
})
```

---

## 风险点识别

- ⚠️ **编辑状态冲突**: 多行同时编辑可能导致状态混乱
- ⚠️ **成本项依赖**: 删除正在被项目使用的成本项可能导致数据不一致
- ⚠️ **小数精度**: 成本金额的小数位数处理需注意
- ⚠️ **输入框焦点**: 可编辑 ProTable 的焦点管理需要注意
- ⚠️ **快速操作**: 快速连续点击"新建"可能产生多行编辑状态

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
    const response = await fetch('http://localhost:3001/api/config/travel-costs');
    const { data } = await response.json();
    
    // 删除测试创建的成本项
    const testItems = data.filter(item => 
      item.item_name.includes('测试') || 
      item.item_name.includes('临时') ||
      item.item_name.includes('新的成本项') ||
      item.item_name.includes('第一个成本项')
    );
    
    for (const item of testItems) {
      await fetch(\`http://localhost:3001/api/config/travel-costs/\${item.id}\`, {
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
- [ ] 用例 2: 新建差旅成本项 - 正常流程
- [ ] 用例 3: 新建差旅成本项 - 必填项验证
- [ ] 用例 4: 新建差旅成本项 - 数据格式验证
- [ ] 用例 5: 编辑差旅成本项
- [ ] 用例 6: 取消编辑操作
- [ ] 用例 7: 删除差旅成本项 - 正常流程
- [ ] 用例 8: 重复成本项名称验证
- [ ] 用例 9: 空数据场景

### 预期测试结果

- ✅ 可编辑 ProTable 功能正常
- ✅ 所有 CRUD 功能完整
- ✅ 表单验证生效
- ✅ 数据格式处理正确
- ✅ 无阻塞性 Bug

---

**脚本版本**: v1.0  
**创建日期**: 2025-10-20  
**最后更新**: 2025-10-20
