# 测试脚本：项目详情模块

## 测试信息

- **测试日期**: 2025-10-20
- **测试环境**: 开发环境
- **应用版本**: v1.0
- **测试范围**: 项目详情页面 (`/assessment/detail/:id`)
- **测试工具**: chrome-dev-tool MCP

## 测试目标

验证项目详情模块的完整功能，包括：
- 页面加载与数据展示
- 统计卡片（总成本、风险总分、总工作量）
- 成本明细展示（Descriptions）
- 折叠面板（风险评分详情、工作量详情）
- 导出功能（PDF、Excel）
- 页面头部操作（返回、编辑）
- 404 错误处理
- 数据完整性验证

## 前置条件

- ✅ 前端服务运行在 `http://localhost:8000`
- ✅ 后端服务运行在 `http://localhost:3001`
- ✅ 数据库已初始化
- ✅ 至少存在 1 个完整的测试项目（包含所有评估数据）
- ✅ 后端实现了导出 API (`/api/projects/:id/export/pdf` 和 `/api/projects/:id/export/excel`)

## 测试数据准备

### 准备完整的测试项目

需要在数据库中准备一个包含完整评估数据的项目：

**项目名称**: "测试项目-详情页-完整数据"

**评估数据**:
```json
{
  "risk_scores": {
    "技术复杂度": 20,
    "需求变更风险": 15
  },
  "development_workload": [
    {
      "module1": "用户管理",
      "module2": "用户列表",
      "module3": "列表查询",
      "description": "支持分页、搜索、排序",
      "产品经理": 2,
      "开发工程师": 5,
      "测试工程师": 3,
      "delivery_factor": 1.2,
      "workload": 12
    }
  ],
  "integration_workload": [
    {
      "module1": "第三方支付",
      "module2": "支付宝",
      "module3": "支付接口",
      "description": "对接支付宝支付",
      "开发工程师": 3,
      "测试工程师": 2,
      "delivery_factor": 1.0,
      "workload": 5
    }
  ],
  "travel_months": 3,
  "maintenance_months": 12,
  "maintenance_headcount": 2,
  "risk_items": [
    { "content": "第三方API不稳定", "cost": 5 },
    { "content": "需求变更风险", "cost": 10 }
  ]
}
```

**预期结果**:
- final_total_cost: ~100 万元
- final_risk_score: 35
- final_workload_days: ~520 人天

---

## 测试用例

### 用例 1：正常加载项目详情

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 获取测试项目 ID → 例如 ID = 123
2. 访问 `/assessment/detail/123` → 页面成功加载
3. 验证页面头部 → 显示项目名称
4. 验证统计卡片 → 显示总成本、风险总分、总工作量
5. 验证成本明细 → 显示所有成本项和金额
6. 验证返回按钮 → 按钮可见

**测试数据**:

- 使用前置条件中的完整测试项目

**验证点**:

- [ ] 页面成功加载，无错误
- [ ] PageHeader 显示项目名称
- [ ] 显示 3 个统计卡片
- [ ] 成本明细完整显示
- [ ] 数值格式正确（保留 2 位小数）
- [ ] 无 JavaScript 错误

**执行命令**:

```javascript
// 1. 获取测试项目 ID
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const response = await fetch('http://localhost:3001/api/projects');
    const { data } = await response.json();
    const testProject = data.find(p => p.name.includes('测试项目-详情页'));
    return { projectId: testProject?.id };
  }`
})
// 假设返回: { projectId: 123 }

// 2. 访问项目详情页
mcp_chrome-devtoo_new_page({
  url: "http://localhost:8000/assessment/detail/123"
})

// 3. 等待页面加载
mcp_chrome-devtoo_wait_for({
  text: "项目详情",
  timeout: 5000
})

// 4. 拍摄页面快照
mcp_chrome-devtoo_take_snapshot({})

// 5. 验证页面头部
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const pageHeader = document.querySelector('.ant-page-header');
    const title = pageHeader?.querySelector('.ant-page-header-heading-title')?.innerText;
    const hasBackButton = !!pageHeader?.querySelector('.ant-page-header-back');
    
    return {
      hasPageHeader: !!pageHeader,
      title: title,
      hasBackButton: hasBackButton
    };
  }`
})
// 预期: { hasPageHeader: true, title: "测试项目-详情页-完整数据", hasBackButton: true }

// 6. 验证统计卡片
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const statistics = document.querySelectorAll('.ant-statistic');
    const stats = {};
    
    statistics.forEach(stat => {
      const title = stat.querySelector('.ant-statistic-title')?.innerText;
      const value = stat.querySelector('.ant-statistic-content-value')?.innerText;
      if (title && value) {
        stats[title] = value;
      }
    });
    
    return {
      statisticCount: statistics.length,
      stats: stats
    };
  }`
})
// 预期: { statisticCount: 3, stats: { "总成本": "100.00", "风险总分": "35", "总工作量": "520" } }

// 7. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-page-loaded.png"
})

// 8. 检查控制台无错误
mcp_chrome-devtoo_list_console_messages({})

// 9. 检查网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})
```

---

### 用例 2：成本明细展示验证

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问项目详情页 → 页面加载成功
2. 定位成本明细 Descriptions 组件 → 组件可见
3. 验证软件研发成本 → 显示金额
4. 验证系统对接成本 → 显示金额
5. 验证差旅成本 → 显示金额
6. 验证运维成本 → 显示金额
7. 验证风险成本 → 显示金额
8. 验证报价总计 → 等于所有成本之和

**测试数据**:

- 使用完整测试项目

**验证点**:

- [ ] Descriptions 组件正确渲染
- [ ] 所有成本项都有标签和内容
- [ ] 金额格式统一（XX.XX 万元）
- [ ] 报价总计计算正确
- [ ] 成本项排列整齐

**执行命令**:

```javascript
// 1. 访问详情页（假设已加载）
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/detail/123"
})

mcp_chrome-devtoo_wait_for({
  text: "成本明细"
})

// 2. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 3. 获取成本明细数据
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const descriptions = document.querySelectorAll('.ant-descriptions-item');
    const costs = {};
    let totalCost = 0;
    
    descriptions.forEach(item => {
      const label = item.querySelector('.ant-descriptions-item-label')?.innerText;
      const content = item.querySelector('.ant-descriptions-item-content')?.innerText;
      
      if (label && content) {
        costs[label] = content;
        
        // 提取数值
        const numMatch = content.match(/([0-9.]+)/);
        if (numMatch && label !== '报价总计') {
          totalCost += parseFloat(numMatch[1]);
        }
      }
    });
    
    return {
      costs: costs,
      calculatedTotal: totalCost.toFixed(2)
    };
  }`
})
// 预期返回包含所有成本项的对象

// 4. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-cost-breakdown.png"
})

// 5. 验证金额格式
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const descriptions = document.querySelectorAll('.ant-descriptions-item-content');
    const formats = [];
    
    descriptions.forEach(desc => {
      const text = desc.innerText;
      if (text.includes('万元')) {
        formats.push({
          text: text,
          hasDecimal: /\d+\.\d{2}/.test(text)
        });
      }
    });
    
    return { formats: formats };
  }`
})
```

---

### 用例 3：折叠面板 - 风险评分详情

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 访问项目详情页 → 页面加载
2. 定位"风险评分详情"折叠面板 → 面板可见
3. 验证面板初始状态 → 折叠或展开
4. 点击面板标题展开 → 面板展开，显示内容
5. 验证风险评分数据 → 显示所有风险项和得分
6. 再次点击面板标题 → 面板收起
7. 验证折叠动画 → 动画流畅

**测试数据**:

- 使用完整测试项目

**验证点**:

- [ ] Collapse 组件正确渲染
- [ ] 面板标题清晰
- [ ] 展开/收起功能正常
- [ ] 风险评分数据完整显示
- [ ] 动画流畅

**执行命令**:

```javascript
// 1. 访问详情页
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/detail/123"
})

mcp_chrome-devtoo_wait_for({
  text: "风险评分详情"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 验证折叠面板存在
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const collapse = document.querySelector('.ant-collapse');
    const panels = document.querySelectorAll('.ant-collapse-item');
    
    return {
      hasCollapse: !!collapse,
      panelCount: panels.length
    };
  }`
})

// 4. 点击"风险评分详情"面板
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "风险评分详情面板标题的uid"
})

// 5. 等待面板展开
mcp_chrome-devtoo_wait_for({
  text: "技术复杂度",
  timeout: 2000
})

// 6. 截图保存（展开状态）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-risk-panel-expanded.png"
})

// 7. 验证风险评分数据
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const panel = Array.from(document.querySelectorAll('.ant-collapse-item'))
      .find(p => p.querySelector('.ant-collapse-header')?.innerText.includes('风险评分'));
    
    const content = panel?.querySelector('.ant-collapse-content-box');
    const isExpanded = panel?.classList.contains('ant-collapse-item-active');
    
    return {
      isExpanded: isExpanded,
      hasContent: !!content
    };
  }`
})

// 8. 再次点击面板标题收起
mcp_chrome-devtoo_click({
  uid: "风险评分详情面板标题的uid"
})

// 9. 截图保存（收起状态）
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-risk-panel-collapsed.png"
})
```

---

### 用例 4：折叠面板 - 工作量详情

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 访问项目详情页 → 页面加载
2. 定位"工作量详情"折叠面板 → 面板可见
3. 展开面板 → 显示工作量表格
4. 验证新功能开发表格 → 显示所有功能项
5. 验证系统对接表格 → 显示所有对接项
6. 验证表格列 → 包含模块、角色、工时等
7. 验证数据完整性 → 所有数据正确显示

**测试数据**:

- 使用完整测试项目

**验证点**:

- [ ] 工作量面板可展开
- [ ] 显示两个表格（新功能开发、系统对接）
- [ ] 表格数据完整
- [ ] 表格列正确
- [ ] 工时计算准确

**执行命令**:

```javascript
// 1. 访问详情页
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/detail/123"
})

mcp_chrome-devtoo_wait_for({
  text: "工作量详情"
})

// 2. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击展开工作量面板
mcp_chrome-devtoo_click({
  uid: "工作量详情面板标题的uid"
})

// 4. 等待面板展开
mcp_chrome-devtoo_wait_for({
  text: "新功能开发",
  timeout: 2000
})

// 5. 验证表格存在
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const tables = document.querySelectorAll('.ant-table');
    const tableCount = tables.length;
    
    return {
      tableCount: tableCount,
      hasTables: tableCount >= 2
    };
  }`
})

// 6. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-workload-panel-expanded.png"
})

// 7. 验证表格数据
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const tables = document.querySelectorAll('.ant-table');
    const firstTable = tables[0];
    const rows = firstTable?.querySelectorAll('.ant-table-tbody tr');
    
    return {
      firstTableRowCount: rows?.length || 0
    };
  }`
})
```

---

### 用例 5：导出 PDF 功能测试

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问项目详情页 → 页面加载
2. 定位"导出 PDF"按钮 → 按钮可见
3. 点击"导出 PDF"按钮 → 触发下载
4. 验证网络请求 → 调用 GET /api/projects/:id/export/pdf
5. 验证响应类型 → application/pdf
6. 验证文件下载 → 浏览器开始下载
7. 验证文件名 → 包含项目名称

**测试数据**:

- 使用完整测试项目

**验证点**:

- [ ] "导出 PDF"按钮可见可点击
- [ ] 点击后调用正确的 API
- [ ] 响应类型为 application/pdf
- [ ] 浏览器开始下载文件
- [ ] 文件名格式正确

**执行命令**:

```javascript
// 1. 访问详情页
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/detail/123"
})

mcp_chrome-devtoo_wait_for({
  text: "导出"
})

// 2. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"导出 PDF"按钮
mcp_chrome-devtoo_click({
  uid: "导出PDF按钮的uid"
})

// 4. 等待网络请求
mcp_chrome-devtoo_wait_for({
  text: "导出",
  timeout: 3000
})

// 5. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 6. 验证 PDF 请求
mcp_chrome-devtoo_get_network_request({
  url: "http://localhost:3001/api/projects/123/export/pdf"
})

// 7. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-export-pdf.png"
})

// 8. 验证下载行为（通过检查浏览器下载）
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    // 检查是否触发了下载
    return {
      timestamp: Date.now()
    };
  }`
})
```

---

### 用例 6：导出 Excel 功能测试

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问项目详情页 → 页面加载
2. 定位"导出 Excel"按钮 → 按钮可见
3. 点击"导出 Excel"按钮 → 触发下载
4. 验证网络请求 → 调用 GET /api/projects/:id/export/excel
5. 验证响应类型 → application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
6. 验证文件下载 → 浏览器开始下载
7. 验证文件名 → 包含项目名称.xlsx

**测试数据**:

- 使用完整测试项目

**验证点**:

- [ ] "导出 Excel"按钮可见可点击
- [ ] 点击后调用正确的 API
- [ ] 响应类型正确
- [ ] 浏览器开始下载文件
- [ ] 文件名格式正确（.xlsx）

**执行命令**:

```javascript
// 1. 访问详情页
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/detail/123"
})

mcp_chrome-devtoo_wait_for({
  text: "导出"
})

// 2. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"导出 Excel"按钮
mcp_chrome-devtoo_click({
  uid: "导出Excel按钮的uid"
})

// 4. 等待网络请求
mcp_chrome-devtoo_wait_for({
  text: "导出",
  timeout: 3000
})

// 5. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 6. 验证 Excel 请求
mcp_chrome-devtoo_get_network_request({
  url: "http://localhost:3001/api/projects/123/export/excel"
})

// 7. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-export-excel.png"
})
```

---

### 用例 7：返回按钮功能测试

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 从历史项目列表进入详情页 → 记录来源
2. 在详情页点击"返回"按钮 → 触发返回
3. 验证页面跳转 → 返回到历史项目列表
4. 验证列表状态 → 保留之前的搜索、排序、分页状态
5. 从数据看板进入详情页 → 测试不同来源
6. 点击"返回" → 验证返回到数据看板

**测试数据**:

- 从不同页面进入详情页

**验证点**:

- [ ] "返回"按钮可见可点击
- [ ] 点击后正确返回上一页
- [ ] 浏览器历史记录正常
- [ ] 返回后页面状态保留

**执行命令**:

```javascript
// 1. 先访问历史项目列表
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/history"
})

mcp_chrome-devtoo_wait_for({
  text: "项目名称"
})

// 2. 点击第一个项目的"查看"进入详情页
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "第一个项目查看按钮的uid"
})

// 3. 等待详情页加载
mcp_chrome-devtoo_wait_for({
  text: "项目详情",
  timeout: 5000
})

// 4. 点击"返回"按钮
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "返回按钮的uid"
})

// 5. 验证返回到历史列表
mcp_chrome-devtoo_wait_for({
  text: "项目名称",
  timeout: 3000
})

// 6. 验证 URL
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    return {
      pathname: window.location.pathname,
      isHistoryPage: window.location.pathname.includes('/assessment/history')
    };
  }`
})
// 预期: { isHistoryPage: true }

// 7. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-back-button.png"
})
```

---

### 用例 8：404 错误 - 不存在的项目 ID

**优先级**: 高  
**类型**: 异常测试

**测试步骤**:

1. 访问不存在的项目 ID → `/assessment/detail/999999`
2. 等待页面加载 → 显示错误状态
3. 验证错误提示 → 显示"未找到相关数据"或 404 页面
4. 验证用户操作 → 显示返回链接或按钮
5. 检查控制台错误 → 记录 404 错误
6. 验证页面不崩溃 → 页面结构正常

**测试数据**:

- 不存在的项目 ID: 999999

**验证点**:

- [ ] 页面不崩溃
- [ ] 显示友好的错误提示
- [ ] 提供返回或导航选项
- [ ] 控制台记录 404 错误
- [ ] 网络请求返回 404

**执行命令**:

```javascript
// 1. 访问不存在的项目
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/detail/999999"
})

// 2. 等待页面加载
mcp_chrome-devtoo_wait_for({
  text: "未找到",
  timeout: 5000
})

// 3. 拍摄快照
mcp_chrome-devtoo_take_snapshot({})

// 4. 检查错误提示
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const body = document.body.innerText;
    const hasErrorText = body.includes('未找到') || 
                         body.includes('404') || 
                         body.includes('不存在');
    
    return {
      hasErrorText: hasErrorText,
      bodyText: body.substring(0, 200)
    };
  }`
})

// 5. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-404-error.png"
})

// 6. 检查控制台错误
mcp_chrome-devtoo_list_console_messages({})

// 7. 检查网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})
```

---

### 用例 9：数据完整性验证

**优先级**: 高  
**类型**: 数据验证测试

**测试步骤**:

1. 创建一个包含所有字段的测试项目 → 通过 API 创建
2. 访问该项目的详情页 → 页面加载
3. 验证统计卡片数据 → 与数据库一致
4. 验证成本明细数据 → 与计算结果一致
5. 验证风险评分详情 → 所有风险项显示
6. 验证工作量详情 → 所有功能项显示
7. 验证数据格式 → 金额、日期格式正确

**测试数据**:

- 使用完整的测试项目数据

**验证点**:

- [ ] 所有字段都正确显示
- [ ] 数值计算准确
- [ ] 数据与数据库一致
- [ ] 无数据丢失
- [ ] 格式化正确

**执行命令**:

```javascript
// 1. 通过 API 获取项目原始数据
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const response = await fetch('http://localhost:3001/api/projects/123');
    const { data } = await response.json();
    
    return {
      projectData: data
    };
  }`
})
// 保存返回的数据用于后续对比

// 2. 访问详情页
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/detail/123"
})

mcp_chrome-devtoo_wait_for({
  text: "项目详情"
})

// 3. 获取页面显示的数据
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    // 获取统计卡片数据
    const statistics = {};
    document.querySelectorAll('.ant-statistic').forEach(stat => {
      const title = stat.querySelector('.ant-statistic-title')?.innerText;
      const value = stat.querySelector('.ant-statistic-content-value')?.innerText;
      if (title && value) {
        statistics[title] = value;
      }
    });
    
    // 获取成本明细数据
    const costs = {};
    document.querySelectorAll('.ant-descriptions-item').forEach(item => {
      const label = item.querySelector('.ant-descriptions-item-label')?.innerText;
      const content = item.querySelector('.ant-descriptions-item-content')?.innerText;
      if (label && content) {
        costs[label] = content;
      }
    });
    
    return {
      displayData: {
        statistics: statistics,
        costs: costs
      }
    };
  }`
})

// 4. 对比数据一致性（在测试报告中人工验证）

// 5. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-data-integrity.png"
})
```

---

### 用例 10：页面性能测试

**优先级**: 低  
**类型**: 性能测试

**测试步骤**:

1. 开启性能跟踪 → 记录性能指标
2. 访问项目详情页 → 页面加载
3. 等待页面完全加载 → 所有数据显示
4. 停止性能跟踪 → 分析性能指标
5. 验证加载时间 → < 2 秒
6. 验证 LCP → < 2.5 秒
7. 验证 API 响应时间 → < 500ms

**测试数据**:

- 使用完整测试项目

**验证点**:

- [ ] 页面加载时间 < 2 秒
- [ ] LCP (Largest Contentful Paint) < 2.5 秒
- [ ] FCP (First Contentful Paint) < 1.8 秒
- [ ] API 响应时间 < 500ms
- [ ] 无性能警告

**执行命令**:

```javascript
// 1. 开始性能跟踪
mcp_chrome-devtoo_performance_start_trace({
  reload: true,
  autoStop: false
})

// 2. 访问详情页
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/detail/123"
})

// 3. 等待页面完全加载
mcp_chrome-devtoo_wait_for({
  text: "项目详情",
  timeout: 5000
})

// 4. 停止性能跟踪
mcp_chrome-devtoo_performance_stop_trace({})

// 5. 分析性能指标
mcp_chrome-devtoo_performance_analyze_insight({
  insightName: "LCPBreakdown"
})

// 6. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-performance.png"
})
```

---

### 用例 11：响应式布局测试

**优先级**: 中  
**类型**: UI 测试

**测试步骤**:

1. 访问详情页 → 页面加载
2. 调整为桌面分辨率（1920×1080） → 布局正常
3. 调整为笔记本分辨率（1366×768） → 布局适配
4. 调整为平板分辨率（768×1024） → 布局适配
5. 验证统计卡片响应式 → 卡片换行或缩小
6. 验证折叠面板响应式 → 内容自适应
7. 验证按钮可访问性 → 按钮不被遮挡

**测试数据**:

- 使用完整测试项目

**验证点**:

- [ ] 桌面端布局完整
- [ ] 笔记本分辨率下布局正常
- [ ] 平板分辨率下内容可访问
- [ ] 无横向滚动条（或合理滚动）
- [ ] 所有按钮可点击

**执行命令**:

```javascript
// 1. 设置为桌面分辨率
mcp_chrome-devtoo_resize_page({
  width: 1920,
  height: 1080
})

mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/detail/123"
})

mcp_chrome-devtoo_wait_for({
  text: "项目详情"
})

mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-responsive-1920.png"
})

// 2. 调整为笔记本分辨率
mcp_chrome-devtoo_resize_page({
  width: 1366,
  height: 768
})

mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-responsive-1366.png"
})

// 3. 调整为平板分辨率
mcp_chrome-devtoo_resize_page({
  width: 768,
  height: 1024
})

mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/detail-responsive-768.png"
})

// 4. 恢复默认尺寸
mcp_chrome-devtoo_resize_page({
  width: 1920,
  height: 1080
})
```

---

## 风险点识别

- ⚠️ **大数据量渲染**: 如果项目包含大量工作量条目，折叠面板展开可能较慢
- ⚠️ **PDF/Excel 生成失败**: 后端生成文件可能超时或失败
- ⚠️ **浏览器下载限制**: 某些浏览器可能阻止自动下载
- ⚠️ **数据完整性**: JSON 解析失败可能导致部分数据不显示
- ⚠️ **权限控制**: 如果有多用户，需要验证访问权限

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
      p.name.includes('测试项目-详情页')
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

- [ ] 用例 1: 正常加载项目详情
- [ ] 用例 2: 成本明细展示验证
- [ ] 用例 3: 折叠面板 - 风险评分详情
- [ ] 用例 4: 折叠面板 - 工作量详情
- [ ] 用例 5: 导出 PDF 功能测试
- [ ] 用例 6: 导出 Excel 功能测试
- [ ] 用例 7: 返回按钮功能测试
- [ ] 用例 8: 404 错误 - 不存在的项目 ID
- [ ] 用例 9: 数据完整性验证
- [ ] 用例 10: 页面性能测试
- [ ] 用例 11: 响应式布局测试

### 预期测试结果

- ✅ 所有核心功能通过率 100%
- ✅ 导出功能正常
- ✅ 数据完整准确
- ✅ 无阻塞性 Bug

---

**脚本版本**: v1.0  
**创建日期**: 2025-10-20  
**最后更新**: 2025-10-20
