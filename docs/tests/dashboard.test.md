# 测试脚本：数据看板模块

## 测试信息
- **测试日期**: 2025-10-20
- **测试环境**: 开发环境
- **应用版本**: v1.0
- **测试范围**: 数据看板页面 (`/dashboard`)
- **测试工具**: chrome-dev-tool MCP

## 测试目标
验证数据看板模块能够正确展示项目统计数据，包括：
- 评估项目总数统计
- 项目平均成本计算
- 风险等级分布图展示
- 空数据场景处理
- 数据刷新功能
- 响应式布局适配

## 前置条件
- ✅ 前端服务运行在 `http://localhost:8000`
- ✅ 后端服务运行在 `http://localhost:3001`
- ✅ 数据库已初始化（`server/ppa.db` 存在）
- ✅ 至少存在 3 个测试项目数据（包含不同风险等级）

## 测试数据准备

### 准备测试项目数据
需要在数据库中准备以下测试项目：

| 项目名称 | final_total_cost | final_risk_score | 风险等级 |
|---------|-----------------|-----------------|---------|
| 测试项目A-低风险 | 50 | 30 | 低风险 |
| 测试项目B-中风险 | 120 | 75 | 中风险 |
| 测试项目C-高风险 | 250 | 150 | 高风险 |

**预期统计结果**:
- 项目总数: 3
- 平均成本: (50 + 120 + 250) / 3 = 140 万元
- 风险分布: 低风险 1 个, 中风险 1 个, 高风险 1 个

---

## 测试用例

### 用例 1：空数据场景测试
**优先级**: 高  
**类型**: UI测试 / 边界测试

**测试步骤**:
1. 清空所有项目数据 → 数据库 projects 表为空
2. 访问 `/dashboard` 页面 → 页面成功加载
3. 检查统计卡片显示 → 所有统计值显示为 0 或默认状态
4. 检查图表显示 → 显示"暂无数据"或空状态提示

**测试数据**:
- 无项目数据

**验证点**:
- [ ] 评估项目总数显示 "0"
- [ ] 项目平均成本显示 "0" 或 "-"
- [ ] 风险分布图显示空状态提示
- [ ] 页面无报错，无异常

**执行命令**:
```javascript
// 1. 启动浏览器并创建新页面
mcp_chrome-devtoo_new_page({
  url: "http://localhost:8000/dashboard"
})

// 2. 等待页面加载完成
mcp_chrome-devtoo_wait_for({
  text: "数据看板"
})

// 3. 截图记录初始状态
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/dashboard-empty-state.png"
})

// 4. 验证统计卡片
mcp_chrome-devtoo_take_snapshot({})
// 查找包含 "评估项目总数" 的文本，验证数值为 0

// 5. 验证无控制台错误
mcp_chrome-devtoo_list_console_messages({})
```

---

### 用例 2：正常数据场景 - 统计卡片验证
**优先级**: 高  
**类型**: 功能测试

**测试步骤**:
1. 确保数据库有 3 个测试项目 → 数据已准备
2. 访问 `/dashboard` 页面 → 页面加载成功
3. 检查"评估项目总数"卡片 → 显示 "3"
4. 检查"项目平均成本"卡片 → 显示 "140" (万元)
5. 验证数值格式 → 金额保留2位小数

**测试数据**:
- 使用前置条件中的 3 个测试项目

**验证点**:
- [ ] 评估项目总数 = 3
- [ ] 项目平均成本 = 140.00 万元
- [ ] 统计卡片样式正常（Ant Design Statistic 组件）
- [ ] 数值格式化正确（千分位分隔符）

**执行命令**:
```javascript
// 1. 访问数据看板
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/dashboard"
})

// 2. 等待数据加载
mcp_chrome-devtoo_wait_for({
  text: "评估项目总数"
})

// 3. 拍摄页面快照
mcp_chrome-devtoo_take_snapshot({})

// 4. 使用脚本验证统计数据
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const statistics = document.querySelectorAll('.ant-statistic');
    const result = {};
    
    statistics.forEach(stat => {
      const title = stat.querySelector('.ant-statistic-title')?.innerText;
      const value = stat.querySelector('.ant-statistic-content-value')?.innerText;
      result[title] = value;
    });
    
    return result;
  }`
})
// 预期返回: { "评估项目总数": "3", "项目平均成本": "140.00" }

// 5. 截图保存证据
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/dashboard-statistics-normal.png"
})
```

---

### 用例 3：风险等级分布图验证
**优先级**: 高  
**类型**: 功能测试 / 数据可视化测试

**测试步骤**:
1. 访问 `/dashboard` 页面 → 页面加载成功
2. 定位风险分布图表 → 找到 Pie Chart 组件
3. 验证图例显示 → 包含 "低风险"、"中风险"、"高风险"
4. 验证数据分布 → 每个等级各 1 个项目
5. 检查图表交互 → 鼠标悬停显示详细信息

**测试数据**:
- 使用前置条件中的 3 个测试项目

**验证点**:
- [ ] 图表正确渲染（使用 G2/G2Plot 或 Ant Design Charts）
- [ ] 低风险项目数 = 1 (风险分 < 50)
- [ ] 中风险项目数 = 1 (50 ≤ 风险分 ≤ 100)
- [ ] 高风险项目数 = 1 (风险分 > 100)
- [ ] 图例颜色区分明显
- [ ] 鼠标悬停显示 Tooltip

**执行命令**:
```javascript
// 1. 定位图表容器
mcp_chrome-devtoo_take_snapshot({})

// 2. 验证图表是否渲染
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const chartContainer = document.querySelector('.ant-card');
    const hasChart = chartContainer && chartContainer.querySelector('canvas, svg');
    return { hasChart: !!hasChart };
  }`
})

// 3. 截图记录图表状态
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/dashboard-risk-chart.png"
})

// 4. 查找图表图例文本
mcp_chrome-devtoo_take_snapshot({})
// 手动验证包含 "低风险"、"中风险"、"高风险" 文本
```

---

### 用例 4：数据刷新功能测试
**优先级**: 中  
**类型**: 集成测试

**测试步骤**:
1. 访问 `/dashboard` 页面 → 记录初始统计数据
2. 新增一个测试项目 → 通过 API 或前端操作
3. 刷新页面或等待自动刷新 → 数据更新
4. 验证统计数据变化 → 项目总数 +1, 平均成本重新计算

**测试数据**:
- 初始: 3 个项目
- 新增: 1 个项目（成本 100 万元，风险分 60）
- 预期: 4 个项目，平均成本 = (50+120+250+100)/4 = 130 万元

**验证点**:
- [ ] 新增项目后，数据看板自动更新（或刷新后更新）
- [ ] 项目总数 = 4
- [ ] 平均成本 = 130.00 万元
- [ ] 风险分布图更新（中风险 +1）

**执行命令**:
```javascript
// 1. 记录初始状态
mcp_chrome-devtoo_take_snapshot({})

// 2. 通过 API 新增项目
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const response = await fetch('http://localhost:3001/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '测试项目D-刷新测试',
        is_template: 0,
        assessmentData: {
          risk_scores: { '技术风险': 60 },
          development_workload: [],
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

// 3. 刷新页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/dashboard"
})

// 4. 等待数据加载
mcp_chrome-devtoo_wait_for({
  text: "评估项目总数"
})

// 5. 验证更新后的统计数据
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const statistics = document.querySelectorAll('.ant-statistic');
    const projectCount = Array.from(statistics)
      .find(s => s.querySelector('.ant-statistic-title')?.innerText === '评估项目总数')
      ?.querySelector('.ant-statistic-content-value')?.innerText;
    return { projectCount };
  }`
})
// 预期: projectCount = "4"

// 6. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/dashboard-after-refresh.png"
})
```

---

### 用例 5：响应式布局测试
**优先级**: 中  
**类型**: UI测试 / 兼容性测试

**测试步骤**:
1. 访问 `/dashboard` 页面 → 页面加载成功
2. 调整浏览器窗口至 1920×1080 → 布局正常（桌面端）
3. 调整浏览器窗口至 1280×720 → 布局正常（小屏幕）
4. 调整浏览器窗口至 768×1024 → 布局正常（平板）
5. 验证统计卡片排列 → 响应式网格布局生效

**测试数据**:
- 使用正常数据场景

**验证点**:
- [ ] 桌面端：统计卡片横向排列
- [ ] 小屏幕：统计卡片可能换行或纵向排列
- [ ] 平板：布局适配，无横向滚动条
- [ ] 图表自适应容器宽度
- [ ] 所有文本可读，无遮挡

**执行命令**:
```javascript
// 1. 设置为桌面分辨率
mcp_chrome-devtoo_resize_page({
  width: 1920,
  height: 1080
})

mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/dashboard"
})

mcp_chrome-devtoo_wait_for({
  text: "数据看板"
})

mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/dashboard-desktop-1920.png"
})

// 2. 调整为小屏幕
mcp_chrome-devtoo_resize_page({
  width: 1280,
  height: 720
})

mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/dashboard-small-1280.png"
})

// 3. 调整为平板
mcp_chrome-devtoo_resize_page({
  width: 768,
  height: 1024
})

mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/dashboard-tablet-768.png"
})

// 4. 恢复默认尺寸
mcp_chrome-devtoo_resize_page({
  width: 1920,
  height: 1080
})
```

---

### 用例 6：API 错误处理测试
**优先级**: 中  
**类型**: 异常测试

**测试步骤**:
1. 停止后端服务 → 模拟 API 不可用
2. 访问 `/dashboard` 页面 → 页面加载
3. 检查错误提示 → 显示网络错误或加载失败提示
4. 检查页面状态 → 显示友好的错误信息，不崩溃
5. 恢复后端服务 → 刷新页面，数据正常显示

**测试数据**:
- 后端服务停止状态

**验证点**:
- [ ] 页面不崩溃，显示错误提示
- [ ] 控制台显示网络请求失败日志
- [ ] 用户看到友好的错误消息（如 "数据加载失败，请稍后重试"）
- [ ] 后端恢复后，刷新可正常显示数据

**执行命令**:
```javascript
// 1. 访问页面（假设后端已停止）
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/dashboard"
})

// 2. 等待页面加载
mcp_chrome-devtoo_wait_for({
  text: "数据看板",
  timeout: 5000
})

// 3. 检查控制台错误
mcp_chrome-devtoo_list_console_messages({})

// 4. 检查网络请求失败
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 5. 截图记录错误状态
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/dashboard-api-error.png"
})

// 6. 拍摄快照查看错误提示
mcp_chrome-devtoo_take_snapshot({})
```

---

### 用例 7：性能测试 - 大数据量场景
**优先级**: 低  
**类型**: 性能测试

**测试步骤**:
1. 准备 100 个测试项目数据 → 批量插入数据库
2. 访问 `/dashboard` 页面 → 记录加载时间
3. 验证页面响应时间 → < 2 秒
4. 验证统计计算正确性 → 100 个项目的平均值计算正确
5. 验证图表渲染性能 → 无卡顿

**测试数据**:
- 100 个项目，成本范围 10-500 万元，风险分 0-200

**验证点**:
- [ ] 页面首次加载时间 < 2 秒
- [ ] API 响应时间 < 500ms
- [ ] 统计计算准确
- [ ] 图表渲染流畅
- [ ] 无内存泄漏

**执行命令**:
```javascript
// 1. 开始性能跟踪
mcp_chrome-devtoo_performance_start_trace({
  reload: true,
  autoStop: false
})

// 2. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/dashboard"
})

// 3. 等待数据加载完成
mcp_chrome-devtoo_wait_for({
  text: "评估项目总数"
})

// 4. 停止性能跟踪
mcp_chrome-devtoo_performance_stop_trace({})

// 5. 分析性能指标
// 查看 LCP (Largest Contentful Paint) 是否 < 2000ms

// 6. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/dashboard-performance-100-projects.png"
})
```

---

## 风险点识别
- ⚠️ **数据计算精度**: 平均成本计算可能存在浮点数精度问题
- ⚠️ **图表库依赖**: 如果使用第三方图表库，需确保版本兼容
- ⚠️ **API 超时**: 大数据量时 API 响应可能超时
- ⚠️ **缓存问题**: 浏览器缓存可能导致数据不刷新

## 测试环境信息
- **浏览器**: Chrome (最新版本)
- **屏幕分辨率**: 1920×1080 (默认)
- **操作系统**: macOS
- **Node.js 版本**: v14+
- **前端端口**: 8000
- **后端端口**: 3001

## 测试数据清理

测试完成后，需要清理测试数据：

```sql
-- 删除测试项目
DELETE FROM projects WHERE name LIKE '测试项目%';
```

或使用脚本：

```javascript
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    // 获取所有测试项目
    const response = await fetch('http://localhost:3001/api/projects');
    const { data } = await response.json();
    
    // 删除名称包含"测试项目"的项目
    const testProjects = data.filter(p => p.name.includes('测试项目'));
    
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
- [ ] 用例 1: 空数据场景测试
- [ ] 用例 2: 正常数据场景 - 统计卡片验证
- [ ] 用例 3: 风险等级分布图验证
- [ ] 用例 4: 数据刷新功能测试
- [ ] 用例 5: 响应式布局测试
- [ ] 用例 6: API 错误处理测试
- [ ] 用例 7: 性能测试 - 大数据量场景

### 预期测试结果
- ✅ 所有用例通过率 > 95%
- ✅ 无阻塞性 Bug
- ✅ 性能指标符合要求

---

**脚本版本**: v1.0  
**创建日期**: 2025-10-20  
**最后更新**: 2025-10-20
