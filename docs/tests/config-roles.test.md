# 测试脚本：角色配置模块

## 测试信息

- **测试日期**: 2025-10-20
- **测试环境**: 开发环境
- **应用版本**: v1.0
- **测试范围**: 参数配置 - 角色与单价管理 (`/config` Tab 1)
- **测试工具**: chrome-dev-tool MCP

## 测试目标

验证角色配置模块的完整功能，包括：
- 角色列表展示（ProTable）
- 新建角色功能
- 编辑角色功能
- 删除角色功能
- 表单验证（必填项、数据格式）
- 数据持久化
- 角色被项目使用时的删除处理
- 异常场景处理

## 前置条件

- ✅ 前端服务运行在 `http://localhost:8000`
- ✅ 后端服务运行在 `http://localhost:3001`
- ✅ 数据库已初始化
- ✅ 可以访问参数配置页面
- ✅ 后端实现了角色配置的完整 CRUD API

## 测试数据准备

### 初始角色数据

准备一些基础角色用于测试：

| 角色名称 | 人力单价(元/人天) |
|---------|-----------------|
| 产品经理 | 1500 |
| 开发工程师 | 1600 |
| 测试工程师 | 1400 |

---

## 测试用例

### 用例 1：页面加载与列表展示

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问 `/config` 页面 → 页面成功加载
2. 验证 Tabs 组件 → 显示多个配置 Tab
3. 确认当前在"角色与单价管理"Tab → Tab 高亮
4. 检查 ProTable 组件 → 表格正确渲染
5. 验证表格列 → 包含角色名称、人力单价、操作
6. 验证角色数据 → 显示所有已配置角色
7. 验证"新建"按钮 → 按钮可见

**测试数据**:

- 使用前置条件中的初始角色数据

**验证点**:

- [ ] 页面标题包含 "参数配置"
- [ ] Tabs 组件正确显示
- [ ] "角色与单价管理" Tab 处于激活状态
- [ ] ProTable 正确渲染
- [ ] 表格列完整（角色名称、人力单价、操作）
- [ ] 显示所有角色数据
- [ ] "新建"按钮可见可点击
- [ ] 无 JavaScript 错误

**执行命令**:

```javascript
// 1. 创建新页面并访问
mcp_chrome-devtoo_new_page({
  url: "http://localhost:8000/config"
})

// 2. 等待页面加载
mcp_chrome-devtoo_wait_for({
  text: "参数配置",
  timeout: 5000
})

// 3. 拍摄页面快照
mcp_chrome-devtoo_take_snapshot({})

// 4. 验证 Tabs 组件
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const tabs = document.querySelectorAll('.ant-tabs-tab');
    const activeTab = document.querySelector('.ant-tabs-tab-active')?.innerText;
    
    return {
      tabCount: tabs.length,
      activeTab: activeTab
    };
  }`
})
// 预期: { tabCount: 3, activeTab: "角色与单价管理" }

// 5. 验证表格渲染
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
// 预期: { hasTable: true, headers: ["角色名称", "人力单价(元/人天)", "操作"], rowCount: 3 }

// 6. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-initial.png"
})

// 7. 检查控制台无错误
mcp_chrome-devtoo_list_console_messages({})
```

---

### 用例 2：新建角色 - 正常流程

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 在角色管理页面点击"新建"按钮 → 表格新增可编辑行
2. 填写角色名称 → "UI设计师"
3. 填写人力单价 → 1550
4. 点击"保存"按钮 → 调用 POST /api/config/roles
5. 验证保存成功 → 显示成功提示
6. 验证列表刷新 → 新角色出现在列表中
7. 验证数据持久化 → 刷新页面后数据仍存在

**测试数据**:

```json
{
  "role_name": "UI设计师",
  "unit_price": 1550
}
```

**验证点**:

- [ ] 点击"新建"后表格新增空白行
- [ ] 可编辑行状态正常
- [ ] 所有字段可输入
- [ ] 保存调用 POST API
- [ ] 显示成功提示消息
- [ ] 新角色出现在列表
- [ ] 数据持久化成功

**执行命令**:

```javascript
// 1. 访问角色管理页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "角色与单价管理"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"新建"按钮
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

// 4. 等待新行出现
mcp_chrome-devtoo_wait_for({
  text: "角色名称",
  timeout: 2000
})

// 5. 拍摄快照查看可编辑行
mcp_chrome-devtoo_take_snapshot({})

// 6. 填写角色名称
mcp_chrome-devtoo_fill({
  uid: "角色名称输入框的uid",
  value: "UI设计师"
})

// 7. 填写人力单价
mcp_chrome-devtoo_fill({
  uid: "人力单价输入框的uid",
  value: "1550"
})

// 8. 点击"保存"按钮
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 9. 等待保存成功提示
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})

// 10. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 11. 验证新角色在列表中
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const roleNames = Array.from(rows).map(row => 
      row.querySelector('td:first-child')?.innerText
    ).filter(Boolean);
    
    return {
      totalRoles: roleNames.length,
      hasNewRole: roleNames.includes('UI设计师')
    };
  }`
})
// 预期: { totalRoles: 4, hasNewRole: true }

// 12. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-create-success.png"
})

// 13. 刷新页面验证持久化
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "UI设计师",
  timeout: 3000
})

// 14. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-persisted.png"
})
```

---

### 用例 3：新建角色 - 必填项验证

**优先级**: 高  
**类型**: 验证测试

**测试步骤**:

1. 点击"新建"按钮 → 表格新增可编辑行
2. 不填写角色名称 → 保持空白
3. 填写人力单价 → 1600
4. 点击"保存" → 触发验证
5. 验证错误提示 → 显示"角色名称为必填项"
6. 填写角色名称 → "前端工程师"
7. 清空人力单价 → 保持空白
8. 点击"保存" → 触发验证
9. 验证错误提示 → 显示"人力单价为必填项"

**测试数据**:

- 缺失角色名称
- 缺失人力单价

**验证点**:

- [ ] 角色名称必填验证生效
- [ ] 人力单价必填验证生效
- [ ] 错误提示清晰明确
- [ ] 字段标红显示
- [ ] 填写后错误消失

**执行命令**:

```javascript
// 1. 访问页面并点击新建
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "角色与单价管理"
})

mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

// 2. 只填写人力单价，不填角色名称
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "人力单价输入框的uid",
  value: "1600"
})

// 3. 点击保存
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 4. 等待验证错误
mcp_chrome-devtoo_wait_for({
  text: "必填",
  timeout: 2000
})

// 5. 截图记录验证错误
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-validation-name-required.png"
})

// 6. 拍摄快照查看错误详情
mcp_chrome-devtoo_take_snapshot({})

// 7. 填写角色名称
mcp_chrome-devtoo_fill({
  uid: "角色名称输入框的uid",
  value: "前端工程师"
})

// 8. 清空人力单价
mcp_chrome-devtoo_fill({
  uid: "人力单价输入框的uid",
  value: ""
})

// 9. 点击保存
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 10. 等待验证错误
mcp_chrome-devtoo_wait_for({
  text: "必填",
  timeout: 2000
})

// 11. 截图记录验证错误
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-validation-price-required.png"
})
```

---

### 用例 4：新建角色 - 数据格式验证

**优先级**: 高  
**类型**: 验证测试

**测试步骤**:

1. 点击"新建"按钮 → 表格新增可编辑行
2. 填写角色名称 → "测试角色"
3. 填写负数单价 → -100
4. 点击"保存" → 触发验证
5. 验证错误提示 → 显示"单价必须大于或等于0"
6. 填写非数字单价 → "abc"
7. 点击"保存" → 触发验证
8. 验证错误提示 → 显示"请输入有效的数字"
9. 填写正确单价 → 1500
10. 保存成功

**测试数据**:

```javascript
负数测试: -100
非数字测试: "abc"
正确数据: 1500
```

**验证点**:

- [ ] 负数验证生效
- [ ] 非数字验证生效
- [ ] 错误提示清晰
- [ ] 正确数据可保存

**执行命令**:

```javascript
// 1. 点击新建
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "角色与单价管理"
})

mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

// 2. 填写角色名称
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "角色名称输入框的uid",
  value: "测试角色-格式验证"
})

// 3. 填写负数单价
mcp_chrome-devtoo_fill({
  uid: "人力单价输入框的uid",
  value: "-100"
})

// 4. 点击保存
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
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-validation-negative.png"
})

// 7. 修改为非数字
mcp_chrome-devtoo_fill({
  uid: "人力单价输入框的uid",
  value: "abc"
})

mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 8. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-validation-non-numeric.png"
})

// 9. 修改为正确数据
mcp_chrome-devtoo_fill({
  uid: "人力单价输入框的uid",
  value: "1500"
})

mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 10. 验证保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})
```

---

### 用例 5：编辑角色功能

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 定位"产品经理"角色的"编辑"按钮 → 按钮可见
2. 点击"编辑"按钮 → 该行进入编辑状态
3. 修改人力单价 → 从 1500 改为 1600
4. 点击"保存"按钮 → 调用 PUT /api/config/roles/:id
5. 验证保存成功 → 显示成功提示
6. 验证数据更新 → 单价显示为 1600
7. 刷新页面验证持久化 → 数据保持更新

**测试数据**:

```json
{
  "role_name": "产品经理",
  "unit_price": 1600  // 原为 1500
}
```

**验证点**:

- [ ] "编辑"按钮可见可点击
- [ ] 点击后该行进入编辑状态
- [ ] 可以修改数据
- [ ] 保存调用 PUT API
- [ ] 显示成功提示
- [ ] 数据更新成功
- [ ] 数据持久化

**执行命令**:

```javascript
// 1. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "产品经理"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"产品经理"的编辑按钮
mcp_chrome-devtoo_click({
  uid: "产品经理编辑按钮的uid"
})

// 4. 等待进入编辑状态
mcp_chrome-devtoo_wait_for({
  text: "保存",
  timeout: 2000
})

// 5. 拍摄快照查看编辑状态
mcp_chrome-devtoo_take_snapshot({})

// 6. 修改人力单价
mcp_chrome-devtoo_fill({
  uid: "产品经理单价输入框的uid",
  value: "1600"
})

// 7. 点击保存
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 8. 等待保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 3000
})

// 9. 监控网络请求（验证是 PUT 请求）
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 10. 验证数据更新
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    let pmPrice = null;
    
    rows.forEach(row => {
      const roleName = row.querySelector('td:nth-child(1)')?.innerText;
      if (roleName === '产品经理') {
        const priceText = row.querySelector('td:nth-child(2)')?.innerText;
        pmPrice = priceText;
      }
    });
    
    return { pmPrice: pmPrice };
  }`
})
// 预期: { pmPrice: "1600" 或 "1600.00" }

// 11. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-edit-success.png"
})

// 12. 刷新验证持久化
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "产品经理"
})

mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    let pmPrice = null;
    
    rows.forEach(row => {
      const roleName = row.querySelector('td:nth-child(1)')?.innerText;
      if (roleName === '产品经理') {
        const priceText = row.querySelector('td:nth-child(2)')?.innerText;
        pmPrice = priceText;
      }
    });
    
    return { pmPrice: pmPrice };
  }`
})
```

---

### 用例 6：删除角色 - 正常流程

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 记录当前角色总数 → 例如 4 个
2. 定位"UI设计师"的"删除"按钮 → 按钮可见
3. 点击"删除"按钮 → 弹出确认对话框
4. 验证确认对话框 → 显示警告信息
5. 点击"取消" → 对话框关闭，角色保留
6. 再次点击"删除" → 弹出确认对话框
7. 点击"确认" → 调用 DELETE /api/config/roles/:id
8. 验证删除成功 → 显示成功提示
9. 验证角色从列表移除 → 角色总数减少 1
10. 刷新页面验证持久化 → 角色不再存在

**测试数据**:

- 删除 "UI设计师" 角色

**验证点**:

- [ ] "删除"按钮可见可点击
- [ ] 点击后弹出确认对话框
- [ ] 对话框包含警告信息
- [ ] "取消"按钮取消删除
- [ ] "确认"按钮执行删除
- [ ] 调用 DELETE API
- [ ] 显示成功提示
- [ ] 角色从列表移除
- [ ] 数据持久化

**执行命令**:

```javascript
// 1. 访问页面并记录初始角色数
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "UI设计师"
})

mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    return { initialCount: rows.length };
  }`
})
// 假设返回: { initialCount: 4 }

// 2. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"UI设计师"的删除按钮
mcp_chrome-devtoo_click({
  uid: "UI设计师删除按钮的uid"
})

// 4. 等待确认对话框
mcp_chrome-devtoo_wait_for({
  text: "确认删除",
  timeout: 2000
})

// 5. 截图保存（对话框）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-delete-confirm.png"
})

// 6. 拍摄快照查看对话框按钮
mcp_chrome-devtoo_take_snapshot({})

// 7. 点击"取消"
mcp_chrome-devtoo_click({
  uid: "取消按钮的uid"
})

// 8. 验证角色仍存在
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const roleNames = Array.from(rows).map(row => 
      row.querySelector('td:first-child')?.innerText
    ).filter(Boolean);
    
    return { 
      countAfterCancel: rows.length,
      hasRole: roleNames.includes('UI设计师')
    };
  }`
})
// 预期: { countAfterCancel: 4, hasRole: true }

// 9. 再次点击删除
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "UI设计师删除按钮的uid"
})

// 10. 等待确认对话框
mcp_chrome-devtoo_wait_for({
  text: "确认删除",
  timeout: 2000
})

// 11. 点击"确认"
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "确认按钮的uid"
})

// 12. 等待删除成功
mcp_chrome-devtoo_wait_for({
  text: "删除成功",
  timeout: 3000
})

// 13. 验证角色数减少
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const roleNames = Array.from(rows).map(row => 
      row.querySelector('td:first-child')?.innerText
    ).filter(Boolean);
    
    return { 
      countAfterDelete: rows.length,
      hasRole: roleNames.includes('UI设计师')
    };
  }`
})
// 预期: { countAfterDelete: 3, hasRole: false }

// 14. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 15. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-delete-success.png"
})

// 16. 刷新验证持久化
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "角色与单价管理"
})

mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const roleNames = Array.from(rows).map(row => 
      row.querySelector('td:first-child')?.innerText
    ).filter(Boolean);
    
    return { 
      countAfterRefresh: rows.length,
      hasRole: roleNames.includes('UI设计师')
    };
  }`
})
// 预期: { countAfterRefresh: 3, hasRole: false }
```

---

### 用例 7：删除正在使用的角色（如果实现了约束）

**优先级**: 中  
**类型**: 异常测试

**测试步骤**:

1. 创建一个使用"开发工程师"的测试项目 → 项目包含该角色的工作量
2. 尝试删除"开发工程师"角色 → 点击删除按钮
3. 确认删除操作 → 点击确认
4. 验证删除失败 → 显示错误提示
5. 验证错误信息 → "该角色正在被项目使用，无法删除"
6. 验证角色仍在列表中 → 角色未被删除

**测试数据**:

- 角色: "开发工程师"
- 测试项目: 包含该角色的工作量估算

**验证点**:

- [ ] 删除操作被阻止
- [ ] 显示友好的错误提示
- [ ] 角色保留在列表中
- [ ] 后端返回适当的错误码

**执行命令**:

```javascript
// 1. 先创建一个使用"开发工程师"的项目
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const response = await fetch('http://localhost:3001/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '测试项目-角色依赖测试',
        is_template: 0,
        assessmentData: {
          risk_scores: { '测试风险': 10 },
          development_workload: [{
            module1: '测试模块',
            module2: '子模块',
            module3: '功能',
            description: '测试',
            '开发工程师': 5,
            delivery_factor: 1.0,
            workload: 5
          }],
          integration_workload: [],
          travel_months: 0,
          maintenance_months: 0,
          maintenance_headcount: 0,
          risk_items: []
        }
      })
    });
    return await response.json();
  }`
})

// 2. 访问角色配置页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "开发工程师"
})

// 3. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 4. 点击"开发工程师"的删除按钮
mcp_chrome-devtoo_click({
  uid: "开发工程师删除按钮的uid"
})

// 5. 等待确认对话框
mcp_chrome-devtoo_wait_for({
  text: "确认删除",
  timeout: 2000
})

// 6. 点击确认
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "确认按钮的uid"
})

// 7. 等待错误提示
mcp_chrome-devtoo_wait_for({
  text: "正在被使用",
  timeout: 3000
})

// 8. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-delete-in-use-error.png"
})

// 9. 验证角色仍在列表
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const roleNames = Array.from(rows).map(row => 
      row.querySelector('td:first-child')?.innerText
    ).filter(Boolean);
    
    return { 
      hasRole: roleNames.includes('开发工程师')
    };
  }`
})
// 预期: { hasRole: true }

// 10. 清理测试项目
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const response = await fetch('http://localhost:3001/api/projects');
    const { data } = await response.json();
    const testProject = data.find(p => p.name.includes('角色依赖测试'));
    
    if (testProject) {
      await fetch(\`http://localhost:3001/api/projects/\${testProject.id}\`, {
        method: 'DELETE'
      });
    }
    
    return { cleaned: !!testProject };
  }`
})
```

---

### 用例 8：重复角色名称验证

**优先级**: 中  
**类型**: 验证测试

**测试步骤**:

1. 点击"新建"按钮 → 表格新增可编辑行
2. 填写已存在的角色名称 → "产品经理"
3. 填写人力单价 → 1500
4. 点击"保存" → 触发保存
5. 验证保存失败 → 显示错误提示
6. 验证错误信息 → "角色名称已存在" 或类似提示

**测试数据**:

```json
{
  "role_name": "产品经理",  // 已存在
  "unit_price": 1500
}
```

**验证点**:

- [ ] 保存操作被阻止
- [ ] 显示重复错误提示
- [ ] 角色未被创建
- [ ] 后端返回适当的错误码

**执行命令**:

```javascript
// 1. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "角色与单价管理"
})

// 2. 点击新建
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "新建按钮的uid"
})

// 3. 填写已存在的角色名称
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "角色名称输入框的uid",
  value: "产品经理"
})

mcp_chrome-devtoo_fill({
  uid: "人力单价输入框的uid",
  value: "1500"
})

// 4. 点击保存
mcp_chrome-devtoo_click({
  uid: "保存按钮的uid"
})

// 5. 等待错误提示
mcp_chrome-devtoo_wait_for({
  text: "已存在",
  timeout: 3000
})

// 6. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-duplicate-name-error.png"
})

// 7. 检查网络请求错误
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})
```

---

### 用例 9：取消编辑操作

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 点击某个角色的"编辑"按钮 → 进入编辑状态
2. 修改人力单价 → 从 1600 改为 1800
3. 不点击保存，点击"取消"按钮 → 退出编辑状态
4. 验证数据未变化 → 单价仍为 1600
5. 验证行状态恢复 → 返回只读状态

**测试数据**:

- 编辑"开发工程师"角色

**验证点**:

- [ ] "取消"按钮功能正常
- [ ] 取消后数据不变
- [ ] 行状态恢复正常
- [ ] 未调用保存 API

**执行命令**:

```javascript
// 1. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "开发工程师"
})

// 2. 记录初始单价
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    let devPrice = null;
    
    rows.forEach(row => {
      const roleName = row.querySelector('td:nth-child(1)')?.innerText;
      if (roleName === '开发工程师') {
        const priceText = row.querySelector('td:nth-child(2)')?.innerText;
        devPrice = priceText;
      }
    });
    
    return { initialPrice: devPrice };
  }`
})
// 假设返回: { initialPrice: "1600" }

// 3. 点击编辑
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "开发工程师编辑按钮的uid"
})

// 4. 修改单价
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "开发工程师单价输入框的uid",
  value: "1800"
})

// 5. 点击取消
mcp_chrome-devtoo_click({
  uid: "取消按钮的uid"
})

// 6. 验证数据未变化
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    let devPrice = null;
    
    rows.forEach(row => {
      const roleName = row.querySelector('td:nth-child(1)')?.innerText;
      if (roleName === '开发工程师') {
        const priceText = row.querySelector('td:nth-child(2)')?.innerText;
        devPrice = priceText;
      }
    });
    
    return { priceAfterCancel: devPrice };
  }`
})
// 预期: { priceAfterCancel: "1600" }

// 7. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-cancel-edit.png"
})
```

---

### 用例 10：空数据场景测试

**优先级**: 低  
**类型**: 边界测试

**测试步骤**:

1. 清空所有角色数据 → 数据库 config_roles 表为空
2. 访问角色配置页面 → 页面加载
3. 验证空状态提示 → 显示"暂无数据"
4. 验证"新建"按钮可用 → 可以创建新角色
5. 创建一个角色 → 验证功能正常

**测试数据**:

- 无角色数据

**验证点**:

- [ ] 页面不崩溃
- [ ] 显示友好的空状态
- [ ] "新建"按钮可用
- [ ] 可以创建第一个角色

**执行命令**:

```javascript
// 1. 清空所有角色（通过API或数据库）
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const response = await fetch('http://localhost:3001/api/config/roles');
    const { data } = await response.json();
    
    for (const role of data) {
      await fetch(\`http://localhost:3001/api/config/roles/\${role.id}\`, {
        method: 'DELETE'
      });
    }
    
    return { deleted: data.length };
  }`
})

// 2. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/config"
})

mcp_chrome-devtoo_wait_for({
  text: "角色与单价管理"
})

// 3. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 4. 验证空状态
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const emptyText = document.querySelector('.ant-empty-description')?.innerText;
    const rowCount = document.querySelectorAll('.ant-table-tbody tr').length;
    
    return {
      emptyText: emptyText,
      rowCount: rowCount
    };
  }`
})

// 5. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/config-roles-empty-state.png"
})

// 6. 验证"新建"按钮可用
mcp_chrome-devtoo_take_snapshot({})
// 尝试创建第一个角色
```

---

## 风险点识别

- ⚠️ **角色依赖关系**: 删除正在被项目使用的角色可能导致数据不一致
- ⚠️ **并发编辑**: 多用户同时编辑同一角色可能导致数据冲突
- ⚠️ **角色名称唯一性**: 需要在后端和前端都进行唯一性验证
- ⚠️ **单价精度**: 浮点数计算可能存在精度问题
- ⚠️ **删除确认**: 误删除角色可能影响历史项目数据

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
    const response = await fetch('http://localhost:3001/api/config/roles');
    const { data } = await response.json();
    
    // 删除测试创建的角色
    const testRoles = data.filter(r => 
      r.role_name.includes('测试') || 
      r.role_name.includes('UI设计师')
    );
    
    for (const role of testRoles) {
      await fetch(\`http://localhost:3001/api/config/roles/\${role.id}\`, {
        method: 'DELETE'
      });
    }
    
    return { deleted: testRoles.length };
  }`
})
```

---

## 测试执行总结

### 测试执行检查清单

- [ ] 用例 1: 页面加载与列表展示
- [ ] 用例 2: 新建角色 - 正常流程
- [ ] 用例 3: 新建角色 - 必填项验证
- [ ] 用例 4: 新建角色 - 数据格式验证
- [ ] 用例 5: 编辑角色功能
- [ ] 用例 6: 删除角色 - 正常流程
- [ ] 用例 7: 删除正在使用的角色
- [ ] 用例 8: 重复角色名称验证
- [ ] 用例 9: 取消编辑操作
- [ ] 用例 10: 空数据场景测试

### 预期测试结果

- ✅ 所有 CRUD 功能正常
- ✅ 表单验证完整有效
- ✅ 数据持久化成功
- ✅ 无阻塞性 Bug

---

**脚本版本**: v1.0  
**创建日期**: 2025-10-20  
**最后更新**: 2025-10-20
