# 测试脚本：历史项目模块

## 测试信息

- **测试日期**: 2025-10-20
- **测试环境**: 开发环境
- **应用版本**: v1.0
- **测试范围**: 历史项目页面 (`/assessment/history`)
- **测试工具**: chrome-dev-tool MCP

## 测试目标

验证历史项目模块的完整功能，包括：
- 项目列表展示（ProTable）
- 搜索功能（按项目名称）
- 排序功能（按各列排序）
- 分页功能
- 操作功能（查看、编辑、删除）
- 空数据场景处理
- 数据刷新
- 权限控制（如适用）

## 前置条件

- ✅ 前端服务运行在 `http://localhost:8000`
- ✅ 后端服务运行在 `http://localhost:3001`
- ✅ 数据库已初始化
- ✅ 至少存在 5 个测试项目数据（包含不同成本和风险分）
- ✅ 确保没有模板数据干扰（is_template=0）

## 测试数据准备

### 准备测试项目数据

需要在数据库中准备以下测试项目：

| 项目名称 | final_total_cost | final_risk_score | created_at | is_template |
|---------|-----------------|-----------------|------------|-------------|
| 测试项目A-历史1 | 50.00 | 30 | 2025-10-15 | 0 |
| 测试项目B-历史2 | 120.50 | 75 | 2025-10-16 | 0 |
| 测试项目C-历史3 | 250.80 | 150 | 2025-10-17 | 0 |
| 测试项目D-历史4 | 80.20 | 45 | 2025-10-18 | 0 |
| 测试项目E-历史5 | 180.00 | 90 | 2025-10-19 | 0 |

**注意**: 不包含模板项目（is_template=1）

---

## 测试用例

### 用例 1：页面加载与列表展示

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问 `/assessment/history` 页面 → 页面成功加载
2. 检查 ProTable 组件 → 表格正确渲染
3. 验证表格列 → 包含项目名称、总成本、风险总分、创建时间、操作
4. 验证数据展示 → 显示所有 is_template=0 的项目
5. 验证数据格式 → 金额、日期格式正确

**测试数据**:

- 使用前置条件中的 5 个测试项目

**验证点**:

- [ ] 页面标题包含 "历史项目" 或 "项目列表"
- [ ] ProTable 正确渲染
- [ ] 表格列完整显示
- [ ] 显示所有非模板项目
- [ ] 金额显示格式: XX.XX 万元
- [ ] 日期显示格式: YYYY-MM-DD HH:mm:ss
- [ ] 无 JavaScript 错误

**执行命令**:

```javascript
// 1. 创建新页面并访问
mcp_chrome-devtoo_new_page({
  url: "http://localhost:8000/assessment/history"
})

// 2. 等待页面加载
mcp_chrome-devtoo_wait_for({
  text: "项目名称",
  timeout: 5000
})

// 3. 拍摄页面快照
mcp_chrome-devtoo_take_snapshot({})

// 4. 验证表格渲染
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const table = document.querySelector('.ant-table');
    const headers = Array.from(document.querySelectorAll('.ant-table-thead th')).map(th => th.innerText);
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    
    return {
      hasTable: !!table,
      headers: headers,
      rowCount: rows.length
    };
  }`
})
// 预期: { hasTable: true, headers: ["项目名称", "总成本(万元)", "风险总分", "创建时间", "操作"], rowCount: 5 }

// 5. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-list-initial.png"
})

// 6. 检查控制台无错误
mcp_chrome-devtoo_list_console_messages({})

// 7. 检查网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})
```

---

### 用例 2：空数据场景测试

**优先级**: 高  
**类型**: 边界测试

**测试步骤**:

1. 清空所有项目数据 → 数据库 projects 表中 is_template=0 的记录为空
2. 访问 `/assessment/history` 页面 → 页面加载
3. 检查空状态提示 → 显示 "暂无数据" 或空状态插图
4. 验证表格状态 → 表格显示但无数据行
5. 检查操作按钮 → 无操作按钮显示

**测试数据**:

- 无项目数据

**验证点**:

- [ ] 页面不崩溃
- [ ] 显示友好的空状态提示
- [ ] 表格表头正常显示
- [ ] 无数据行
- [ ] 空状态图标或文字清晰

**执行命令**:

```javascript
// 1. 访问页面（假设已清空数据）
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

// 2. 等待页面加载
mcp_chrome-devtoo_wait_for({
  text: "项目名称",
  timeout: 5000
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
// 预期: { emptyText: "暂无数据", rowCount: 0 或 1（空提示行）}

// 5. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-empty-state.png"
})
```

---

### 用例 3：搜索功能测试

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问历史项目页面 → 页面加载，显示所有项目
2. 在搜索框输入 "测试项目A" → 输入成功
3. 点击搜索或按 Enter → 触发搜索
4. 验证搜索结果 → 只显示包含 "测试项目A" 的项目
5. 清空搜索框 → 恢复显示所有项目
6. 输入不存在的项目名 → 显示空状态

**测试数据**:

```javascript
搜索关键词1: "测试项目A"  // 应匹配 1 个项目
搜索关键词2: "历史"      // 应匹配 5 个项目
搜索关键词3: "不存在的项目" // 应匹配 0 个项目
```

**验证点**:

- [ ] 搜索框可输入
- [ ] 搜索触发正常（按钮或 Enter）
- [ ] 搜索结果准确（模糊匹配）
- [ ] 清空搜索恢复所有数据
- [ ] 无匹配时显示空状态
- [ ] 搜索调用 GET /api/projects?name=xxx

**执行命令**:

```javascript
// 1. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 定位搜索框
// 查找输入框的 uid

// 4. 输入搜索关键词
mcp_chrome-devtoo_fill({
  uid: "搜索框的uid",
  value: "测试项目A"
})

// 5. 点击搜索按钮或按 Enter
// 方式1: 点击搜索按钮
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "搜索按钮的uid"
})

// 方式2: 模拟按 Enter 键
mcp_chrome-devtoo_evaluate_script({
  function: `(el) => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13 });
    el.dispatchEvent(event);
  }`,
  args: [{ uid: "搜索框的uid" }]
})

// 6. 等待搜索结果
mcp_chrome-devtoo_wait_for({
  text: "测试项目A",
  timeout: 3000
})

// 7. 验证搜索结果
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const projectNames = Array.from(rows).map(row => 
      row.querySelector('td:first-child')?.innerText
    ).filter(Boolean);
    
    return {
      resultCount: rows.length,
      projectNames: projectNames
    };
  }`
})
// 预期: { resultCount: 1, projectNames: ["测试项目A-历史1"] }

// 8. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-search-result.png"
})

// 9. 清空搜索
mcp_chrome-devtoo_fill({
  uid: "搜索框的uid",
  value: ""
})

mcp_chrome-devtoo_click({
  uid: "搜索按钮的uid"
})

// 10. 验证恢复所有数据
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    return {
      resultCount: document.querySelectorAll('.ant-table-tbody tr').length
    };
  }`
})
// 预期: { resultCount: 5 }

// 11. 测试无匹配搜索
mcp_chrome-devtoo_fill({
  uid: "搜索框的uid",
  value: "不存在的项目XYZ999"
})

mcp_chrome-devtoo_click({
  uid: "搜索按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "暂无数据",
  timeout: 3000
})

mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-search-no-result.png"
})
```

---

### 用例 4：列排序功能测试

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问历史项目页面 → 显示所有项目
2. 点击"项目名称"列标题 → 按名称升序排列
3. 再次点击"项目名称"列标题 → 按名称降序排列
4. 点击"总成本"列标题 → 按成本升序排列
5. 点击"风险总分"列标题 → 按风险分升序排列
6. 点击"创建时间"列标题 → 按时间升序排列
7. 验证排序正确性 → 数据顺序符合预期

**测试数据**:

- 使用前置条件中的 5 个测试项目

**验证点**:

- [ ] 所有可排序列可点击
- [ ] 点击后显示排序图标（升序/降序）
- [ ] 数据按照正确顺序排列
- [ ] 升序和降序切换正常
- [ ] 排序不影响其他功能

**执行命令**:

```javascript
// 1. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"项目名称"列进行排序
mcp_chrome-devtoo_click({
  uid: "项目名称列标题的uid"
})

// 4. 等待排序完成
mcp_chrome-devtoo_wait_for({
  text: "测试项目",
  timeout: 2000
})

// 5. 验证升序排序
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const projectNames = Array.from(rows).map(row => 
      row.querySelector('td:first-child')?.innerText
    ).filter(Boolean);
    
    return {
      projectNames: projectNames,
      isSorted: projectNames[0] < projectNames[projectNames.length - 1]
    };
  }`
})

// 6. 截图保存（升序）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-sort-name-asc.png"
})

// 7. 再次点击切换到降序
mcp_chrome-devtoo_click({
  uid: "项目名称列标题的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "测试项目",
  timeout: 2000
})

// 8. 截图保存（降序）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-sort-name-desc.png"
})

// 9. 点击"总成本"列排序
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "总成本列标题的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "万元",
  timeout: 2000
})

// 10. 验证成本排序
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    const costs = Array.from(rows).map(row => {
      const costText = row.querySelector('td:nth-child(2)')?.innerText;
      return parseFloat(costText?.replace(/[^0-9.]/g, '')) || 0;
    });
    
    return {
      costs: costs,
      isSortedAsc: costs[0] <= costs[costs.length - 1]
    };
  }`
})

// 11. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-sort-cost.png"
})

// 12. 点击"创建时间"列排序
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "创建时间列标题的uid"
})

// 13. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-sort-time.png"
})
```

---

### 用例 5：分页功能测试

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 准备 25 个测试项目 → 超过默认分页大小（通常 10 或 20）
2. 访问历史项目页面 → 显示第一页数据
3. 验证分页器显示 → 显示页码和总数
4. 点击"下一页" → 跳转到第二页
5. 验证第二页数据 → 显示不同的项目
6. 点击页码直接跳转 → 跳转成功
7. 修改每页显示条数 → 数据重新加载
8. 验证 URL 参数 → 包含 current 和 pageSize

**测试数据**:

- 准备 25 个测试项目（可通过脚本批量创建）

**验证点**:

- [ ] 分页器正确显示
- [ ] 显示总条数
- [ ] "上一页"/"下一页"按钮功能正常
- [ ] 页码点击跳转正常
- [ ] 每页显示条数可修改
- [ ] 分页调用 API 带正确参数

**执行命令**:

```javascript
// 1. 批量创建测试项目（如果需要）
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const createdIds = [];
    for (let i = 1; i <= 25; i++) {
      const response = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: \`测试项目-分页测试-\${i}\`,
          is_template: 0,
          assessmentData: {
            risk_scores: { '测试风险': 10 * i },
            development_workload: [],
            integration_workload: [],
            travel_months: 0,
            maintenance_months: 0,
            maintenance_headcount: 0,
            risk_items: []
          }
        })
      });
      const data = await response.json();
      createdIds.push(data.id);
    }
    return { created: createdIds.length };
  }`
})

// 2. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

// 3. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 4. 验证分页器
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const pagination = document.querySelector('.ant-pagination');
    const total = document.querySelector('.ant-pagination-total-text')?.innerText;
    const currentPage = document.querySelector('.ant-pagination-item-active')?.innerText;
    
    return {
      hasPagination: !!pagination,
      total: total,
      currentPage: currentPage
    };
  }`
})
// 预期: { hasPagination: true, total: "共 25 条", currentPage: "1" }

// 5. 点击"下一页"
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "下一页按钮的uid"
})

// 6. 等待页面加载
mcp_chrome-devtoo_wait_for({
  text: "项目名称",
  timeout: 3000
})

// 7. 验证页码变化
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const currentPage = document.querySelector('.ant-pagination-item-active')?.innerText;
    return { currentPage: currentPage };
  }`
})
// 预期: { currentPage: "2" }

// 8. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-pagination-page2.png"
})

// 9. 点击页码 3
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "页码3的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称",
  timeout: 3000
})

// 10. 修改每页显示条数
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "每页条数下拉框的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "20 条/页",
  timeout: 2000
})

mcp_chrome-devtoo_click({
  uid: "20条/页选项的uid"
})

// 11. 验证数据重新加载
mcp_chrome-devtoo_wait_for({
  text: "项目名称",
  timeout: 3000
})

// 12. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-pagination-pagesize-changed.png"
})

// 13. 检查网络请求参数
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})
```

---

### 用例 6：查看操作测试

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问历史项目页面 → 显示项目列表
2. 定位第一个项目的"查看"按钮 → 按钮可见
3. 点击"查看"按钮 → 触发跳转
4. 验证页面跳转 → 跳转到 `/assessment/detail/:id`
5. 验证详情页加载 → 显示项目完整信息
6. 返回历史项目页 → 列表状态保留

**测试数据**:

- 使用第一个测试项目

**验证点**:

- [ ] "查看"按钮可见可点击
- [ ] 点击后正确跳转
- [ ] URL 包含项目 ID
- [ ] 详情页正确加载
- [ ] 返回后列表状态保留（搜索、排序、分页）

**执行命令**:

```javascript
// 1. 访问历史项目页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

// 2. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击第一个项目的"查看"按钮
mcp_chrome-devtoo_click({
  uid: "第一个项目查看按钮的uid"
})

// 4. 等待跳转到详情页
mcp_chrome-devtoo_wait_for({
  text: "项目详情",
  timeout: 5000
})

// 5. 验证 URL 变化
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    return {
      currentUrl: window.location.href,
      pathname: window.location.pathname,
      isDetailPage: window.location.pathname.includes('/assessment/detail/')
    };
  }`
})
// 预期: { isDetailPage: true }

// 6. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-view-navigation.png"
})

// 7. 返回历史项目页
mcp_chrome-devtoo_navigate_page_history({
  navigate: "back"
})

// 8. 等待页面加载
mcp_chrome-devtoo_wait_for({
  text: "项目名称",
  timeout: 3000
})

// 9. 验证返回后状态
mcp_chrome-devtoo_take_snapshot({})
```

---

### 用例 7：编辑操作测试

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问历史项目页面 → 显示项目列表
2. 定位第一个项目的"编辑"按钮 → 按钮可见
3. 点击"编辑"按钮 → 触发跳转
4. 验证页面跳转 → 跳转到 `/assessment/new?id=:id&mode=edit`
5. 验证编辑页加载 → 表单数据已填充
6. 修改部分数据并保存 → 数据更新成功
7. 返回历史项目页 → 显示更新后的数据

**测试数据**:

- 使用第一个测试项目
- 修改项目名称为 "测试项目A-历史1 (已编辑)"

**验证点**:

- [ ] "编辑"按钮可见可点击
- [ ] 点击后正确跳转到编辑页
- [ ] URL 包含项目 ID 和 mode=edit
- [ ] 编辑页数据已填充
- [ ] 修改后保存成功
- [ ] 列表显示更新后的数据

**执行命令**:

```javascript
// 1. 访问历史项目页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

// 2. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击第一个项目的"编辑"按钮
mcp_chrome-devtoo_click({
  uid: "第一个项目编辑按钮的uid"
})

// 4. 等待跳转到编辑页
mcp_chrome-devtoo_wait_for({
  text: "风险评分",
  timeout: 5000
})

// 5. 验证 URL 包含 mode=edit
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const url = new URL(window.location.href);
    return {
      pathname: window.location.pathname,
      mode: url.searchParams.get('mode'),
      id: url.searchParams.get('id')
    };
  }`
})
// 预期: { pathname: "/assessment/new", mode: "edit", id: "xxx" }

// 6. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-edit-navigation.png"
})

// 7. 验证数据已填充
mcp_chrome-devtoo_take_snapshot({})
```

---

### 用例 8：删除操作测试

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问历史项目页面 → 显示项目列表
2. 记录当前项目总数 → 例如 5 个
3. 点击最后一个项目的"删除"按钮 → 弹出确认对话框
4. 点击"取消" → 对话框关闭，项目保留
5. 再次点击"删除"按钮 → 弹出确认对话框
6. 点击"确认" → 调用 DELETE /api/projects/:id
7. 验证删除成功 → 项目从列表消失
8. 验证项目总数 → 减少 1 个
9. 刷新页面 → 验证删除持久化

**测试数据**:

- 删除 "测试项目E-历史5"

**验证点**:

- [ ] "删除"按钮可见可点击
- [ ] 点击后弹出确认对话框
- [ ] 对话框包含警告信息
- [ ] "取消"按钮取消删除
- [ ] "确认"按钮执行删除
- [ ] 调用 DELETE API
- [ ] 项目从列表移除
- [ ] 显示成功提示消息

**执行命令**:

```javascript
// 1. 访问历史项目页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

// 2. 记录初始项目数
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    return { initialCount: rows.length };
  }`
})
// 假设返回: { initialCount: 5 }

// 3. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 4. 点击最后一个项目的"删除"按钮
mcp_chrome-devtoo_click({
  uid: "最后一个项目删除按钮的uid"
})

// 5. 等待确认对话框出现
mcp_chrome-devtoo_wait_for({
  text: "确认删除",
  timeout: 2000
})

// 6. 截图保存（对话框）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-delete-confirm.png"
})

// 7. 拍摄快照查看对话框按钮
mcp_chrome-devtoo_take_snapshot({})

// 8. 点击"取消"按钮
mcp_chrome-devtoo_click({
  uid: "取消按钮的uid"
})

// 9. 验证项目仍存在
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    return { countAfterCancel: rows.length };
  }`
})
// 预期: { countAfterCancel: 5 }

// 10. 再次点击"删除"按钮
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "最后一个项目删除按钮的uid"
})

// 11. 等待确认对话框
mcp_chrome-devtoo_wait_for({
  text: "确认删除",
  timeout: 2000
})

// 12. 点击"确认"按钮
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "确认按钮的uid"
})

// 13. 等待删除成功提示
mcp_chrome-devtoo_wait_for({
  text: "删除成功",
  timeout: 3000
})

// 14. 验证项目数减少
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    return { countAfterDelete: rows.length };
  }`
})
// 预期: { countAfterDelete: 4 }

// 15. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 16. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-delete-success.png"
})

// 17. 刷新页面验证持久化
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    return { countAfterRefresh: rows.length };
  }`
})
// 预期: { countAfterRefresh: 4 }
```

---

### 用例 9：批量操作测试（如果支持）

**优先级**: 低  
**类型**: 功能测试

**测试步骤**:

1. 访问历史项目页面 → 显示项目列表
2. 勾选表格左侧的复选框 → 选中 2 个项目
3. 点击"批量删除"按钮 → 弹出确认对话框
4. 确认删除 → 调用批量删除 API
5. 验证删除成功 → 2 个项目从列表移除
6. 测试"全选"功能 → 所有项目被选中
7. 测试"取消全选" → 所有选择清除

**测试数据**:

- 选择 2 个测试项目进行批量删除

**验证点**:

- [ ] 复选框功能正常
- [ ] "全选"/"取消全选"功能正常
- [ ] 批量操作按钮可见
- [ ] 批量删除成功
- [ ] 显示删除数量提示

**执行命令**:

```javascript
// 注: 此功能可能不存在，根据实际情况执行

// 1. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

// 2. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 3. 勾选第一个项目
mcp_chrome-devtoo_click({
  uid: "第一个项目复选框的uid"
})

// 4. 勾选第二个项目
mcp_chrome-devtoo_click({
  uid: "第二个项目复选框的uid"
})

// 5. 点击批量删除按钮
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "批量删除按钮的uid"
})

// 6. 确认删除
mcp_chrome-devtoo_wait_for({
  text: "确认删除",
  timeout: 2000
})

mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "确认按钮的uid"
})

// 7. 验证删除成功
mcp_chrome-devtoo_wait_for({
  text: "删除成功",
  timeout: 3000
})

// 8. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-batch-delete.png"
})
```

---

### 用例 10：响应式布局测试

**优先级**: 中  
**类型**: UI测试

**测试步骤**:

1. 访问历史项目页面 → 页面加载
2. 调整浏览器窗口至 1920×1080 → 表格完整显示
3. 调整浏览器窗口至 1280×720 → 表格自适应
4. 调整浏览器窗口至 768×1024 → 表格可横向滚动
5. 验证在小屏幕下操作按钮可访问

**测试数据**:

- 使用正常数据场景

**验证点**:

- [ ] 桌面端表格完整显示，无滚动条
- [ ] 小屏幕下表格可横向滚动
- [ ] 平板下表格布局合理
- [ ] 操作列固定在右侧（如果实现）
- [ ] 所有按钮可点击

**执行命令**:

```javascript
// 1. 设置为桌面分辨率
mcp_chrome-devtoo_resize_page({
  width: 1920,
  height: 1080
})

mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-responsive-1920.png"
})

// 2. 调整为小屏幕
mcp_chrome-devtoo_resize_page({
  width: 1280,
  height: 720
})

mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-responsive-1280.png"
})

// 3. 调整为平板
mcp_chrome-devtoo_resize_page({
  width: 768,
  height: 1024
})

mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-responsive-768.png"
})

// 4. 验证表格可滚动
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const tableWrapper = document.querySelector('.ant-table-wrapper');
    return {
      hasHorizontalScroll: tableWrapper.scrollWidth > tableWrapper.clientWidth
    };
  }`
})

// 5. 恢复默认尺寸
mcp_chrome-devtoo_resize_page({
  width: 1920,
  height: 1080
})
```

---

### 用例 11：性能测试 - 大数据量

**优先级**: 低  
**类型**: 性能测试

**测试步骤**:

1. 准备 100 个测试项目 → 批量插入数据库
2. 访问历史项目页面 → 记录加载时间
3. 验证页面响应时间 → < 2 秒
4. 测试滚动流畅度 → 无卡顿
5. 测试搜索性能 → 快速响应
6. 测试排序性能 → 快速响应

**测试数据**:

- 100 个测试项目

**验证点**:

- [ ] 页面加载时间 < 2 秒
- [ ] API 响应时间 < 500ms
- [ ] 滚动流畅
- [ ] 搜索响应快速
- [ ] 排序响应快速

**执行命令**:

```javascript
// 1. 开始性能跟踪
mcp_chrome-devtoo_performance_start_trace({
  reload: true,
  autoStop: false
})

// 2. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

// 3. 等待数据加载
mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

// 4. 停止性能跟踪
mcp_chrome-devtoo_performance_stop_trace({})

// 5. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/history-performance-100-projects.png"
})
```

---

## 风险点识别

- ⚠️ **搜索性能**: 大数据量时搜索可能较慢，需要后端索引支持
- ⚠️ **删除确认**: 误删除项目可能导致数据丢失，需要明确的二次确认
- ⚠️ **分页状态**: 删除当前页最后一条记录后，分页状态可能异常
- ⚠️ **排序稳定性**: 相同值的排序结果可能不稳定
- ⚠️ **权限控制**: 如果有多用户，需要验证权限隔离

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
    const response = await fetch('http://localhost:3001/api/projects');
    const { data } = await response.json();
    
    const testProjects = data.filter(p => 
      p.name.includes('测试项目') && 
      p.name.includes('历史')
    );
    
    for (const project of testProjects) {
      await fetch(\`http://localhost:3001/api/projects/\${project.id}\`, {
        method: 'DELETE'
      });
    }
    
    return { deleted: testProjects.length };
  }`
})
```

---

## 测试执行总结

### 测试执行检查清单

- [ ] 用例 1: 页面加载与列表展示
- [ ] 用例 2: 空数据场景测试
- [ ] 用例 3: 搜索功能测试
- [ ] 用例 4: 列排序功能测试
- [ ] 用例 5: 分页功能测试
- [ ] 用例 6: 查看操作测试
- [ ] 用例 7: 编辑操作测试
- [ ] 用例 8: 删除操作测试
- [ ] 用例 9: 批量操作测试（如果支持）
- [ ] 用例 10: 响应式布局测试
- [ ] 用例 11: 性能测试 - 大数据量

### 预期测试结果

- ✅ 所有核心功能通过率 100%
- ✅ 无阻塞性 Bug
- ✅ 性能指标符合要求

---

**脚本版本**: v1.0  
**创建日期**: 2025-10-20  
**最后更新**: 2025-10-20
