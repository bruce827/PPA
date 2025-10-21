# 测试脚本：新建评估模块

## 测试信息

- **测试日期**: 2025-10-20
- **测试环境**: 开发环境
- **应用版本**: v1.0
- **测试范围**: 新建评估页面 (`/assessment/new`)
- **测试工具**: chrome-dev-tool MCP

## 测试目标

验证新建评估模块的完整功能，包括：
- 模板选择功能（可选）
- Step 1: 风险评分（必填项验证、实时计算）
- Step 2: 工作量估算（动态表格、工时计算）
- Step 3: 其他成本（差旅、运维、风险成本）
- Step 4: 生成总览与保存（成本计算、项目保存、模板另存）
- 步骤导航（上一步、下一步、跳转）
- 数据持久化与编辑模式

## 前置条件

- ✅ 前端服务运行在 `http://localhost:8000`
- ✅ 后端服务运行在 `http://localhost:3001`
- ✅ 数据库已初始化
- ✅ 至少配置 1 个角色（如：开发工程师，单价 1600 元/人天）
- ✅ 至少配置 1 个风险评估项（如：技术风险-技术复杂度）
- ✅ 至少配置 1 个差旅成本项（如：标准差旅包，1.08 万元/月）
- ✅ 至少存在 1 个模板项目（is_template=1）

## 测试数据准备

### 配置数据

**角色配置**:
```json
[
  { "role_name": "产品经理", "unit_price": 1500 },
  { "role_name": "开发工程师", "unit_price": 1600 },
  { "role_name": "测试工程师", "unit_price": 1400 }
]
```

**风险评估项**:
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

### 测试项目数据

**项目名称**: "自动化测试-新建评估-2025-10-20"
**预期成本**: 约 50-100 万元
**预期风险分**: 约 30-60

---

## 测试用例

### 用例 1：页面加载与初始状态验证

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问 `/assessment/new` 页面 → 页面成功加载
2. 检查 Steps 导航组件 → 显示 4 个步骤
3. 验证当前步骤 → 默认在 Step 1 (风险评分)
4. 检查模板选择区域 → 显示模板下拉框（可选）
5. 检查表单初始状态 → 所有字段为空

**测试数据**:
- 无

**验证点**:

- [ ] 页面标题包含 "新建评估" 或 "项目评估"
- [ ] Steps 组件显示 4 个步骤
- [ ] 当前步骤高亮显示 "风险评分"
- [ ] 表单字段为空或默认值
- [ ] 无 JavaScript 错误

**执行命令**:

```javascript
// 1. 创建新页面并访问
mcp_chrome-devtoo_new_page({
  url: "http://localhost:8000/assessment/new"
})

// 2. 等待页面加载
mcp_chrome-devtoo_wait_for({
  text: "风险评分",
  timeout: 5000
})

// 3. 拍摄页面快照
mcp_chrome-devtoo_take_snapshot({})

// 4. 验证 Steps 组件
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const steps = document.querySelectorAll('.ant-steps-item');
    return {
      stepCount: steps.length,
      currentStep: document.querySelector('.ant-steps-item-active .ant-steps-item-title')?.innerText
    };
  }`
})
// 预期: { stepCount: 4, currentStep: "风险评分" }

// 5. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-new-initial.png"
})

// 6. 检查控制台无错误
mcp_chrome-devtoo_list_console_messages({})
```

---

### 用例 2：模板选择功能测试

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 在模板选择区点击下拉框 → 显示所有模板列表
2. 选择一个模板 → 模板名称显示在下拉框
3. 点击"应用模板"按钮 → 调用 API 获取模板数据
4. 验证数据填充 → 所有步骤的表单字段填充模板数据
5. 修改填充的数据 → 不影响原模板

**测试数据**:

- 使用前置条件中的测试模板

**验证点**:

- [ ] 下拉框显示所有 is_template=1 的项目
- [ ] 选择模板后，"应用模板"按钮可点击
- [ ] 点击后调用 GET /api/projects/:id
- [ ] Step 1-3 的数据自动填充
- [ ] 修改数据不影响原模板

**执行命令**:

```javascript
// 1. 定位模板选择下拉框
mcp_chrome-devtoo_take_snapshot({})
// 查找包含 "选择模板" 的 Select 组件，记录其 uid

// 2. 点击下拉框展开
mcp_chrome-devtoo_click({
  uid: "选择模板的Select的uid"
})

// 3. 等待下拉选项出现
mcp_chrome-devtoo_wait_for({
  text: "测试模板",
  timeout: 3000
})

// 4. 选择第一个模板
mcp_chrome-devtoo_take_snapshot({})
// 找到第一个模板选项的 uid

mcp_chrome-devtoo_click({
  uid: "第一个模板选项的uid"
})

// 5. 点击"应用模板"按钮
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "应用模板按钮的uid"
})

// 6. 等待数据加载
mcp_chrome-devtoo_wait_for({
  text: "风险评分",
  timeout: 3000
})

// 7. 验证数据已填充
mcp_chrome-devtoo_take_snapshot({})

// 8. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-template-applied.png"
})
```

---

### 用例 3：Step 1 - 风险评分必填项验证

**优先级**: 高  
**类型**: 功能测试 / 验证测试

**测试步骤**:

1. 访问 `/assessment/new` → 停留在 Step 1
2. 不填写任何风险项 → 保持空白
3. 点击"下一步"按钮 → 触发验证
4. 检查验证错误提示 → 显示 "此项为必填项"
5. 填写所有风险项 → 清除错误提示
6. 再次点击"下一步" → 成功进入 Step 2

**测试数据**:

- 风险项保持空白

**验证点**:

- [ ] 未填写时点击"下一步"显示验证错误
- [ ] 错误提示文本为 "此项为必填项" 或类似内容
- [ ] 错误字段标红显示
- [ ] 填写后错误消失
- [ ] 成功进入下一步

**执行命令**:

```javascript
// 1. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/new"
})

mcp_chrome-devtoo_wait_for({
  text: "风险评分"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 直接点击"下一步"（不填写任何内容）
mcp_chrome-devtoo_click({
  uid: "下一步按钮的uid"
})

// 4. 等待验证错误出现
mcp_chrome-devtoo_wait_for({
  text: "此项为必填项",
  timeout: 2000
})

// 5. 截图记录验证错误
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-step1-validation-error.png"
})

// 6. 拍摄快照查看错误详情
mcp_chrome-devtoo_take_snapshot({})
```

---

### 用例 4：Step 1 - 风险评分实时计算

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 访问 Step 1 风险评分 → 页面加载
2. 选择第一个风险项（分值 10） → 风险总分更新为 10
3. 选择第二个风险项（分值 20） → 风险总分更新为 30
4. 验证评分因子计算 → 30 / 100 = 0.3
5. 修改第一个风险项（分值 0） → 风险总分更新为 20
6. 验证右侧统计卡片实时更新

**测试数据**:

```json
{
  "技术复杂度": 10,
  "需求变更风险": 20
}
```

**预期结果**:
- 风险总分 = 30
- 评分因子 = 0.3

**验证点**:

- [ ] 每次选择后风险总分实时更新
- [ ] 评分因子 = 风险总分 / 100
- [ ] 右侧统计卡片显示正确
- [ ] 数值保留适当小数位

**执行命令**:

```javascript
// 1. 访问页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/new"
})

mcp_chrome-devtoo_wait_for({
  text: "风险评分"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 选择第一个风险项
// 定位第一个 Select 组件
mcp_chrome-devtoo_fill({
  uid: "第一个风险项Select的uid",
  value: "中 - 部分新技术"
})

// 4. 验证风险总分更新
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const riskScoreCard = Array.from(document.querySelectorAll('.ant-statistic'))
      .find(s => s.querySelector('.ant-statistic-title')?.innerText.includes('风险总分'));
    return {
      riskScore: riskScoreCard?.querySelector('.ant-statistic-content-value')?.innerText
    };
  }`
})
// 预期: { riskScore: "10" }

// 5. 选择第二个风险项
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "第二个风险项Select的uid",
  value: "高 - 大量新技术"
})

// 6. 再次验证风险总分
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const riskScoreCard = Array.from(document.querySelectorAll('.ant-statistic'))
      .find(s => s.querySelector('.ant-statistic-title')?.innerText.includes('风险总分'));
    const ratingFactorCard = Array.from(document.querySelectorAll('.ant-statistic'))
      .find(s => s.querySelector('.ant-statistic-title')?.innerText.includes('评分因子'));
    return {
      riskScore: riskScoreCard?.querySelector('.ant-statistic-content-value')?.innerText,
      ratingFactor: ratingFactorCard?.querySelector('.ant-statistic-content-value')?.innerText
    };
  }`
})
// 预期: { riskScore: "30", ratingFactor: "0.3" }

// 7. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-step1-calculation.png"
})
```

---

### 用例 5：Step 2 - 新增功能项并计算工时

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 进入 Step 2 工作量估算 → 显示两个 Tab
2. 在"新功能开发"Tab 点击"新增功能项" → 表格新增一行
3. 填写模块信息和角色工时 → 数据输入成功
4. 验证工时自动计算 → 工时 = sum(角色) × 交付系数
5. 修改交付系数 → 工时实时重算
6. 点击"删除" → 该行从表格移除

**测试数据**:

```json
{
  "module1": "用户管理",
  "module2": "用户列表",
  "module3": "列表查询",
  "description": "支持用户列表的分页、搜索、排序功能",
  "产品经理": 2,
  "开发工程师": 5,
  "测试工程师": 3,
  "delivery_factor": 1.2
}
```

**预期工时**: (2 + 5 + 3) × 1.2 = 12 人天

**验证点**:

- [ ] 点击"新增功能项"成功添加空白行
- [ ] 所有字段可编辑
- [ ] 工时列自动计算
- [ ] 修改任意角色或系数，工时实时更新
- [ ] 删除功能正常

**执行命令**:

```javascript
// 1. 从 Step 1 进入 Step 2
// (假设已完成 Step 1 的填写)
mcp_chrome-devtoo_click({
  uid: "下一步按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "工作量估算"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"新增功能项"按钮
mcp_chrome-devtoo_click({
  uid: "新增功能项按钮的uid"
})

// 4. 等待新行出现
mcp_chrome-devtoo_wait_for({
  text: "一级模块",
  timeout: 2000
})

// 5. 填写表单字段
mcp_chrome-devtoo_take_snapshot({})

// 填写一级模块
mcp_chrome-devtoo_fill({
  uid: "一级模块输入框的uid",
  value: "用户管理"
})

// 填写二级模块
mcp_chrome-devtoo_fill({
  uid: "二级模块输入框的uid",
  value: "用户列表"
})

// 填写三级模块
mcp_chrome-devtoo_fill({
  uid: "三级模块输入框的uid",
  value: "列表查询"
})

// 填写功能说明
mcp_chrome-devtoo_fill({
  uid: "功能说明输入框的uid",
  value: "支持用户列表的分页、搜索、排序功能"
})

// 填写产品经理工时
mcp_chrome-devtoo_fill({
  uid: "产品经理输入框的uid",
  value: "2"
})

// 填写开发工程师工时
mcp_chrome-devtoo_fill({
  uid: "开发工程师输入框的uid",
  value: "5"
})

// 填写测试工程师工时
mcp_chrome-devtoo_fill({
  uid: "测试工程师输入框的uid",
  value: "3"
})

// 填写交付系数
mcp_chrome-devtoo_fill({
  uid: "交付系数输入框的uid",
  value: "1.2"
})

// 6. 验证工时自动计算
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    // 查找工时列的值
    const workloadCell = document.querySelector('td[data-index*="workload"]');
    return {
      workload: workloadCell?.innerText
    };
  }`
})
// 预期: { workload: "12" }

// 7. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-step2-workload-calculation.png"
})
```

---

### 用例 6：Step 2 - 切换 Tab 功能

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 在"新功能开发"Tab 添加数据 → 数据保存
2. 切换到"系统对接工作量"Tab → Tab 切换成功
3. 验证显示独立的表格 → 表格为空或独立数据
4. 在"系统对接工作量"Tab 添加数据 → 数据保存
5. 切换回"新功能开发"Tab → 之前数据保留
6. 验证两个 Tab 数据独立

**测试数据**:

- 新功能开发: 1 条记录
- 系统对接: 1 条记录

**验证点**:

- [ ] Tab 切换流畅
- [ ] 两个 Tab 数据独立存储
- [ ] 切换后数据不丢失
- [ ] 表格结构相同

**执行命令**:

```javascript
// 1. 拍摄当前状态（假设已在"新功能开发"Tab）
mcp_chrome-devtoo_take_snapshot({})

// 2. 点击"系统对接工作量"Tab
mcp_chrome-devtoo_click({
  uid: "系统对接工作量Tab的uid"
})

// 3. 等待 Tab 切换
mcp_chrome-devtoo_wait_for({
  text: "系统对接工作量",
  timeout: 2000
})

// 4. 拍摄切换后的状态
mcp_chrome-devtoo_take_snapshot({})

// 5. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-step2-tab-switch.png"
})

// 6. 切换回"新功能开发"Tab
mcp_chrome-devtoo_click({
  uid: "新功能开发Tab的uid"
})

// 7. 验证数据保留
mcp_chrome-devtoo_take_snapshot({})
```

---

### 用例 7：Step 3 - 其他成本输入与验证

**优先级**: 高  
**类型**: 功能测试 / 验证测试

**测试步骤**:

1. 进入 Step 3 其他成本 → 页面加载
2. 输入差旅月数（3个月） → 接受正整数
3. 输入运维月数（12个月）和人数（2人） → 接受正数
4. 点击"新增风险项" → 列表新增风险项表单
5. 填写风险内容和费用 → 数据保存
6. 尝试输入负数 → 显示验证错误
7. 删除风险项 → 从列表移除

**测试数据**:

```json
{
  "travel_months": 3,
  "maintenance_months": 12,
  "maintenance_headcount": 2,
  "risk_items": [
    { "content": "第三方API不稳定", "cost": 5 },
    { "content": "需求变更风险", "cost": 10 }
  ]
}
```

**验证点**:

- [ ] 差旅月数接受正整数
- [ ] 运维月数和人数接受正数
- [ ] 新增风险项功能正常
- [ ] 风险项内容和费用必填
- [ ] 负数输入显示验证错误
- [ ] 删除风险项功能正常

**执行命令**:

```javascript
// 1. 从 Step 2 进入 Step 3
mcp_chrome-devtoo_click({
  uid: "下一步按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "其他成本"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 填写差旅月数
mcp_chrome-devtoo_fill({
  uid: "差旅月数输入框的uid",
  value: "3"
})

// 4. 填写运维月数
mcp_chrome-devtoo_fill({
  uid: "运维月数输入框的uid",
  value: "12"
})

// 5. 填写运维人数
mcp_chrome-devtoo_fill({
  uid: "运维人数输入框的uid",
  value: "2"
})

// 6. 点击"新增风险项"
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "新增风险项按钮的uid"
})

// 7. 填写第一个风险项
mcp_chrome-devtoo_take_snapshot({})

mcp_chrome-devtoo_fill({
  uid: "风险内容输入框的uid",
  value: "第三方API不稳定"
})

mcp_chrome-devtoo_fill({
  uid: "风险费用输入框的uid",
  value: "5"
})

// 8. 新增第二个风险项
mcp_chrome-devtoo_click({
  uid: "新增风险项按钮的uid"
})

mcp_chrome-devtoo_take_snapshot({})

mcp_chrome-devtoo_fill({
  uid: "第二个风险内容输入框的uid",
  value: "需求变更风险"
})

mcp_chrome-devtoo_fill({
  uid: "第二个风险费用输入框的uid",
  value: "10"
})

// 9. 测试负数验证
mcp_chrome-devtoo_fill({
  uid: "差旅月数输入框的uid",
  value: "-1"
})

// 10. 验证错误提示
mcp_chrome-devtoo_take_snapshot({})

// 11. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-step3-other-costs.png"
})

// 12. 修正为正数
mcp_chrome-devtoo_fill({
  uid: "差旅月数输入框的uid",
  value: "3"
})
```

---

### 用例 8：Step 4 - 计算报价并验证准确性

**优先级**: 高  
**类型**: 功能测试 / 计算验证

**测试步骤**:

1. 进入 Step 4 生成总览 → 页面加载
2. 点击"计算最新报价"按钮 → 调用 /api/calculate
3. 验证软件研发成本 → 符合计算公式
4. 验证系统对接成本 → 符合计算公式
5. 验证差旅成本 → travel_months × 1.08
6. 验证运维成本 → 符合计算公式
7. 验证风险成本 → sum(risk_items.cost)
8. 验证报价总计 → 所有成本之和

**测试数据**:

基于前面步骤填写的数据

**预期计算**:

```javascript
// 假设数据：
风险总分 = 30, 评分因子 = 0.3
新功能开发工时 = 12 人天
软件研发成本 = 12 × 0.3 × 0.16 = 0.576 万元

差旅成本 = 3 × 1.08 = 3.24 万元
运维工作量 = 12 × 2 × 21.5 = 516 人天
运维成本 = 516 × 0.16 = 82.56 万元
风险成本 = 5 + 10 = 15 万元

报价总计 = 0.576 + 3.24 + 82.56 + 15 = 101.376 万元
```

**验证点**:

- [ ] 点击"计算最新报价"调用 API
- [ ] 所有成本项显示
- [ ] 计算结果准确
- [ ] 数值格式化（保留2位小数）
- [ ] 成本明细清晰展示

**执行命令**:

```javascript
// 1. 从 Step 3 进入 Step 4
mcp_chrome-devtoo_click({
  uid: "下一步按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "生成总览"
})

// 2. 拍摄初始状态
mcp_chrome-devtoo_take_snapshot({})

// 3. 点击"计算最新报价"
mcp_chrome-devtoo_click({
  uid: "计算最新报价按钮的uid"
})

// 4. 等待计算完成
mcp_chrome-devtoo_wait_for({
  text: "报价总计",
  timeout: 5000
})

// 5. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 6. 获取计算结果
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    const descriptions = document.querySelectorAll('.ant-descriptions-item');
    const result = {};
    
    descriptions.forEach(item => {
      const label = item.querySelector('.ant-descriptions-item-label')?.innerText;
      const content = item.querySelector('.ant-descriptions-item-content')?.innerText;
      if (label && content) {
        result[label] = content;
      }
    });
    
    return result;
  }`
})
// 预期返回包含所有成本项的对象

// 7. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-step4-calculation.png"
})

// 8. 拍摄详细快照
mcp_chrome-devtoo_take_snapshot({})
```

---

### 用例 9：Step 4 - 保存项目

**优先级**: 高  
**类型**: 功能测试

**测试步骤**:

1. 在 Step 4 不输入项目名称 → 保持空白
2. 点击"提交"按钮 → 显示验证错误
3. 输入项目名称 → "自动化测试-新建评估-2025-10-20"
4. 点击"提交"按钮 → 调用 POST /api/projects
5. 等待保存成功 → 显示成功提示
6. 验证页面跳转 → 跳转到 /assessment/detail/:id
7. 验证项目数据 → 详情页显示正确数据

**测试数据**:

```json
{
  "name": "自动化测试-新建评估-2025-10-20",
  "description": "自动化测试生成的项目",
  "is_template": 0
}
```

**验证点**:

- [ ] 项目名称必填验证生效
- [ ] 提交调用 POST /api/projects
- [ ] 返回新项目 ID
- [ ] 显示成功提示消息
- [ ] 跳转到详情页
- [ ] 详情页数据正确

**执行命令**:

```javascript
// 1. 拍摄当前状态
mcp_chrome-devtoo_take_snapshot({})

// 2. 不填写项目名称，直接点击提交
mcp_chrome-devtoo_click({
  uid: "提交按钮的uid"
})

// 3. 等待验证错误
mcp_chrome-devtoo_wait_for({
  text: "必填",
  timeout: 2000
})

// 4. 截图记录验证错误
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-step4-validation-error.png"
})

// 5. 填写项目名称
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_fill({
  uid: "项目名称输入框的uid",
  value: "自动化测试-新建评估-2025-10-20"
})

// 6. 填写项目描述（可选）
mcp_chrome-devtoo_fill({
  uid: "项目描述输入框的uid",
  value: "自动化测试生成的项目"
})

// 7. 点击提交
mcp_chrome-devtoo_click({
  uid: "提交按钮的uid"
})

// 8. 等待提交成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 5000
})

// 9. 监控网络请求
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 10. 等待页面跳转
mcp_chrome-devtoo_wait_for({
  text: "项目详情",
  timeout: 5000
})

// 11. 验证 URL 变化
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    return {
      currentUrl: window.location.href,
      pathname: window.location.pathname
    };
  }`
})
// 预期: pathname 包含 "/assessment/detail/"

// 12. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-project-saved.png"
})
```

---

### 用例 10：另存为模板功能

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 在 Step 4 填写项目名称 → "自动化测试-模板-2025-10-20"
2. 勾选"另存为模板"复选框 → 复选框选中
3. 点击"提交"按钮 → 调用 POST /api/projects with is_template=1
4. 保存成功 → 显示成功提示
5. 访问模板选择列表 → 新模板出现在列表中
6. 验证模板可用于新建评估

**测试数据**:

```json
{
  "name": "自动化测试-模板-2025-10-20",
  "is_template": 1
}
```

**验证点**:

- [ ] 复选框可勾选
- [ ] is_template 参数正确传递
- [ ] 保存成功
- [ ] 模板出现在模板列表
- [ ] 模板可正常使用

**执行命令**:

```javascript
// 1. 在 Step 4 填写项目名称
mcp_chrome-devtoo_fill({
  uid: "项目名称输入框的uid",
  value: "自动化测试-模板-2025-10-20"
})

// 2. 拍摄快照查找复选框
mcp_chrome-devtoo_take_snapshot({})

// 3. 勾选"另存为模板"
mcp_chrome-devtoo_click({
  uid: "另存为模板复选框的uid"
})

// 4. 点击提交
mcp_chrome-devtoo_click({
  uid: "提交按钮的uid"
})

// 5. 等待保存成功
mcp_chrome-devtoo_wait_for({
  text: "成功",
  timeout: 5000
})

// 6. 访问新建评估页面验证模板
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/new"
})

mcp_chrome-devtoo_wait_for({
  text: "选择模板"
})

// 7. 点击模板下拉框
mcp_chrome-devtoo_take_snapshot({})
mcp_chrome-devtoo_click({
  uid: "选择模板Select的uid"
})

// 8. 验证新模板存在
mcp_chrome-devtoo_wait_for({
  text: "自动化测试-模板-2025-10-20",
  timeout: 3000
})

// 9. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-template-created.png"
})
```

---

### 用例 11：步骤导航 - 上一步/下一步

**优先级**: 中  
**类型**: UI 交互测试

**测试步骤**:

1. 在 Step 1 点击"下一步" → 进入 Step 2
2. 在 Step 2 点击"上一步" → 返回 Step 1
3. 验证 Step 1 数据保留 → 之前填写的数据仍存在
4. 再次点击"下一步" → 进入 Step 2
5. 验证 Step 2 数据保留 → 之前填写的数据仍存在
6. 测试 Step 2 → Step 3 → Step 4 的导航
7. 测试 Step 4 → Step 3 → Step 2 的返回

**测试数据**:

- 使用前面填写的测试数据

**验证点**:

- [ ] "下一步"按钮功能正常
- [ ] "上一步"按钮功能正常
- [ ] 数据在步骤间保留
- [ ] Steps 导航高亮正确
- [ ] 可以在任意步骤间自由切换

**执行命令**:

```javascript
// 1. 从 Step 1 开始
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/new"
})

mcp_chrome-devtoo_wait_for({
  text: "风险评分"
})

// 2. 填写一些数据作为标记
mcp_chrome-devtoo_take_snapshot({})
// 选择一个风险项

// 3. 点击"下一步"到 Step 2
mcp_chrome-devtoo_click({
  uid: "下一步按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "工作量估算"
})

// 4. 验证当前步骤
mcp_chrome-devtoo_evaluate_script({
  function: `() => {
    return {
      currentStep: document.querySelector('.ant-steps-item-active .ant-steps-item-title')?.innerText
    };
  }`
})
// 预期: { currentStep: "工作量估算" }

// 5. 点击"上一步"返回 Step 1
mcp_chrome-devtoo_click({
  uid: "上一步按钮的uid"
})

mcp_chrome-devtoo_wait_for({
  text: "风险评分"
})

// 6. 验证数据保留
mcp_chrome-devtoo_take_snapshot({})
// 检查之前选择的风险项是否还在

// 7. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-navigation.png"
})
```

---

### 用例 12：编辑模式 - 加载已有项目数据

**优先级**: 中  
**类型**: 功能测试

**测试步骤**:

1. 先创建一个测试项目 → 项目 ID = 123
2. 访问 `/assessment/new?id=123&mode=edit` → 页面加载
3. 验证所有步骤数据已填充 → 显示项目原有数据
4. 修改部分数据 → 数据更新
5. 保存项目 → 调用 PUT /api/projects/123
6. 验证项目更新成功

**测试数据**:

- 使用前面创建的测试项目

**验证点**:

- [ ] URL 参数正确解析
- [ ] 项目数据正确加载
- [ ] 所有步骤数据填充
- [ ] 可以编辑数据
- [ ] 保存调用 PUT 而非 POST
- [ ] 更新成功

**执行命令**:

```javascript
// 1. 获取已创建的项目 ID
mcp_chrome-devtoo_evaluate_script({
  function: `async () => {
    const response = await fetch('http://localhost:3001/api/projects');
    const { data } = await response.json();
    const testProject = data.find(p => p.name.includes('自动化测试-新建评估'));
    return { projectId: testProject?.id };
  }`
})
// 假设返回: { projectId: 123 }

// 2. 访问编辑页面
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/new?id=123&mode=edit"
})

mcp_chrome-devtoo_wait_for({
  text: "风险评分"
})

// 3. 验证数据已填充
mcp_chrome-devtoo_take_snapshot({})

// 4. 截图保存
mcp_chrome-devtoo_take_screenshot({
  filePath: "/Users/maylis/Desktop/github上的项目/项目评估系统/PPA/docs/tests/screenshots/assessment-edit-mode.png"
})

// 5. 修改项目名称
mcp_chrome-devtoo_navigate_page({
  url: "http://localhost:8000/assessment/new?id=123&mode=edit"
})

// 跳转到 Step 4
// (使用导航或直接点击 Steps 组件)

// 修改项目名称
mcp_chrome-devtoo_fill({
  uid: "项目名称输入框的uid",
  value: "自动化测试-新建评估-2025-10-20 (已编辑)"
})

// 6. 提交更新
mcp_chrome-devtoo_click({
  uid: "提交按钮的uid"
})

// 7. 监控网络请求（应该是 PUT）
mcp_chrome-devtoo_list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})
```

---

## 风险点识别

- ⚠️ **复杂表单状态管理**: 四个步骤间的数据传递可能出现丢失
- ⚠️ **动态表格操作**: 新增/删除行时可能出现索引错误
- ⚠️ **计算精度问题**: 浮点数计算可能导致精度误差
- ⚠️ **模板数据解析**: JSON 解析失败可能导致数据填充错误
- ⚠️ **表单验证时机**: 异步验证可能导致"下一步"按钮失效
- ⚠️ **API 超时**: 保存大数据量项目时可能超时

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
      p.name.includes('自动化测试') || 
      p.name.includes('测试项目')
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

- [ ] 用例 1: 页面加载与初始状态验证
- [ ] 用例 2: 模板选择功能测试
- [ ] 用例 3: Step 1 - 风险评分必填项验证
- [ ] 用例 4: Step 1 - 风险评分实时计算
- [ ] 用例 5: Step 2 - 新增功能项并计算工时
- [ ] 用例 6: Step 2 - 切换 Tab 功能
- [ ] 用例 7: Step 3 - 其他成本输入与验证
- [ ] 用例 8: Step 4 - 计算报价并验证准确性
- [ ] 用例 9: Step 4 - 保存项目
- [ ] 用例 10: 另存为模板功能
- [ ] 用例 11: 步骤导航 - 上一步/下一步
- [ ] 用例 12: 编辑模式 - 加载已有项目数据

### 预期测试结果

- ✅ 核心流程通过率 100%
- ✅ 计算准确率 100%
- ✅ 无阻塞性 Bug

---

**脚本版本**: v1.0  
**创建日期**: 2025-10-20  
**最后更新**: 2025-10-20
