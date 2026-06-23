# 小程序内部渠道功能规格

> **版本**: 1.1
> **日期**: 2026-04-04
> **状态**: ✅ 已实现

---

## 1. 功能概述

微信小程序新增"内部渠道"Tab，展示从 PPA Web 端推送过来的项目列表。用户可查看项目详情（报价、风险、工作量、附件），适用于售前团队在移动端快速了解已推送项目的关键信息。

## 2. 技术架构

| 层级 | 组件 | 说明 |
|------|------|------|
| 小程序页面 | `pages/internal-channel/` | WXML + WXSS + JS 三件套 |
| 云函数 | `cloudfunctions/getInternalProjectList/` | 查询 internal_projects 集合 |
| 后端推送 | `server/services/pushService.js` | 构建快照 + 上传 + 调用云函数 |
| 数据库 | CloudBase `internal_projects` 集合 | 推送数据持久化 |

## 3. 页面结构

### 3.1 TabBar 配置

```json
{
  "tabBar": {
    "list": [
      { "text": "公开渠道", "pagePath": "pages/tender-list/index" },
      { "text": "内部渠道", "pagePath": "pages/internal-channel/index" }
    ]
  }
}
```

### 3.2 列表页布局

```
┌─────────────────────────────────┐
│ 项目名称               [高风险]  │  ← 卡片头部
│ ─────────────────────────────── │
│ 我方报价    客户预算      差额   │  ← 摘要指标（3列）
│ 88.96万     100万       -11.04万 │
│ 推送时间：2026-04-03 15:30      │
│                                 │
│ ▼ 展开详情                      │
│ ─────────────────────────────── │
│ 项目描述：xxx...                │  ← 独占一行
│ ─────────────────────────────── │
│ 实施成本     商务报价总计       │  ← 2列网格
│ 70.00万      88.96万            │
│ 总工作量     新功能开发工作量    │
│ 322.8人天    322.8人天          │
│ 差旅成本     风险总分           │
│ 0万元        65                 │
│ 风险等级                        │
│ [中风险]                        │
│                                 │
│ 商务报价组成（定制开发模式）      │  ← 饼图标题
│ ┌─────────────────────────────┐ │
│ │    ╭────╮                   │ │
│ │   /  🟦  \  实施成本 45%    │ │  ← 环形饼图
│ │  |  🟩  |  管理分摊 15%    │ │    （懒加载，首次展开时渲染）
│ │   \  🟨 /  销售商务 10%    │ │
│ │    ╰────╯  利润 20%        │ │
│ │            税费 10%        │ │
│ │   [图例]                    │ │
│ └─────────────────────────────┘ │
│                                 │
│ TOP 3 风险评分                  │
│ 需求变更风险 ............ 85    │
│ 系统集成风险 ............ 90    │
│ 数据安全风险 ............ 85    │
│                                 │
│ 附件                            │
│ 需求说明书v4.docx    [下载]     │
│ 技术方案.pdf         [下载]     │
└─────────────────────────────────┘
```

## 4. 数据字段映射

| 小程序显示 | 字段名 | 数据来源 |
|-----------|--------|----------|
| 项目名称 | `projectName` | `internal_projects.projectName` |
| 风险等级 chip | `riskLevel` + `riskChipClass` | `internal_projects.riskLevel` → chip-high/medium/low |
| 我方报价 | `ourQuoteText` | `formatWan(internal_projects.ourQuote)` |
| 客户预算 | `budgetText` | `formatWan(internal_projects.customerBudget)` |
| 差额 | `diffText` + `diffClass` | `formatWan(internal_projects.budgetDifference)` → diff-positive/negative |
| 推送时间 | `pushTimeText` | `formatTime(internal_projects.pushTime)` |
| 项目描述 | `projectDescription` | `internal_projects.projectDescription` |
| 实施成本 | `implementationCostText` | `formatWan(internal_projects.implementationCost)` |
| 商务报价总计 | `ourQuoteText` | 同上方 |
| 风险总分 | `riskTotalScore` | `internal_projects.riskTotalScore` |
| 风险等级 | `riskLevel` | `internal_projects.riskLevel` |
| 总工作量 | `totalWorkloadText` | `${internal_projects.totalWorkloadDays}人天` |
| 新功能开发工作量 | `newDevWorkloadText` | `${internal_projects.newDevWorkloadDays}人天` |
| 差旅成本 | `travelCostText` | `formatWan(internal_projects.travelCostTotal)` |
| TOP 3 风险 | `top3RiskScores` | `internal_projects.top3RiskScores` |
| 附件列表 | `attachments` | 云存储 fileID 列表 + 元数据 |
| 饼图标题 | `pieChartTitle` | 根据 `costBreakdownJson.pricing_mode` 动态生成 |
| 饼图数据 | `pieChartData` | 解析 `costBreakdownJson` 的 amounts 字段 |

## 5. 云函数

### 5.1 getInternalProjectList

**用途**: 小程序端查询 internal_projects 集合（规避直连数据库权限问题）

**入参**:
```javascript
{
  pageNo: 1,
  pageSize: 50
}
```

**出参**:
```javascript
{
  code: 0,
  data: [
    {
      _id: "xxx",
      projectName: "xxx",
      ourQuote: 88.96,
      customerBudget: 100,
      // ... 全部字段
    }
  ],
  total: 1
}
```

**查询条件**: `push_status === 'success'`，按 `pushTime` 倒序。

## 6. 样式规范

### 6.1 风险等级 Chip

| 等级 | 背景色 | 文字色 |
|------|--------|--------|
| 高风险 | `#fee2e2` | `#991b1b` |
| 中风险 | `#fef3c7` | `#92400e` |
| 低风险 | `#dcfce7` | `#166534` |

### 6.2 差额颜色

| 情况 | 颜色 | 含义 |
|------|------|------|
| 我方报价 > 客户预算（正差） | `#dc2626` 红色 | 报价超出预算 |
| 我方报价 < 客户预算（负差） | `#16a34a` 绿色 | 预算有余量 |

## 7. 交互说明

### 7.1 展开/收起详情
- 点击卡片切换展开状态
- 使用 `catchtap` 阻止事件冒泡，避免触发父元素点击

### 7.2 附件操作
- 长按附件: 触发分享（`wx.showShareMenu`）
- 点击下载: 调用 `wx.openDocument` 打开文件

### 7.3 空状态
- 加载中: 显示"加载中..."
- 无数据: 显示"暂无推送内容"

### 7.4 饼图交互
- 懒加载: 仅在卡片首次展开时初始化饼图，避免重复渲染
- 饼图 ID: 基于项目 `_id` 生成 `chart-{_id}`，确保每张卡片图表独立
- 无数据时隐藏: 若 `costBreakdownJson` 为空或无法解析，不显示饼图区域

---

## 9. 商务报价组成饼图

### 9.1 功能概述

在小程序内部渠道详情页中，以环形饼图可视化展示商务报价的成本构成，帮助用户直观理解报价结构。

### 9.2 技术选型

| 组件 | 说明 |
|------|------|
| `echarts-for-weixin` | ECharts 官方小程序适配组件，支持 canvas 2D 渲染 |
| 组件路径 | `components/ec-canvas/ec-canvas` |
| 图表类型 | 环形饼图（`radius: ['35%', '60%']`） |

### 9.3 数据来源

从推送快照的 `costBreakdownJson` 字段（完整商务报价 JSON 字符串）解析：

```javascript
// 解析函数输入: costBreakdownJson（字符串或对象）
// 输出: { title: '商务报价组成（定制开发模式）', series: [...] }
```

### 9.4 两种报价模式的饼图组成

**定制开发模式（custom_development）**:

| 扇区 | 字段 | 颜色 |
|------|------|------|
| 实施成本 | `base_cost_wan` | `#5470c6` 蓝 |
| 管理分摊 | `amounts.management_fee_wan` | `#91cc75` 绿 |
| 销售商务 | `amounts.sales_fee_wan` | `#fac858` 黄 |
| 利润 | `amounts.profit_fee_wan` | `#ee6666` 红 |
| 税费 | `amounts.tax_fee_wan` | `#73c0de` 青 |

**企业级产品模式（enterprise_product）**:

| 扇区 | 字段 | 颜色 |
|------|------|------|
| 实施基线 | `base_cost_wan` | `#5470c6` 蓝 |
| R&D 研发 | `amounts.rd_cost_wan` | `#91cc75` 绿 |
| CAC 营销 | `amounts.cac_cost_wan` | `#fac858` 黄 |
| COGS 基础设施 | `amounts.cogs_cost_wan` | `#ee6666` 红 |
| CSM 运维 | `amounts.csm_cost_wan` | `#73c0de` 青 |

值为 0 的扇区自动过滤不显示。

### 9.5 饼图配置

```javascript
{
  tooltip: { trigger: 'item', formatter: '{b}: {c} 万元 ({d}%)' },
  legend: { bottom: '0%', left: 'center', itemWidth: 12, itemHeight: 8 },
  series: [{
    name: '报价组成',
    type: 'pie',
    radius: ['35%', '60%'],    // 环形图
    center: ['50%', '42%'],
    avoidLabelOverlap: true,
    itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
    label: { show: true, formatter: '{d}%' },
    emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
  }]
}
```

### 9.6 容器样式

```css
.chart-section {
  margin-top: 20rpx;
}
.chart-container {
  width: 100%;
  height: 400rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx;
}
```

### 9.7 渲染时机

1. 用户点击卡片展开详情
2. 首次展开且饼图数据存在时，调用 `initPieChart(index)`
3. 通过 `this.selectComponent('#chart-{_id}')` 获取 ec-canvas 组件实例
4. 调用 `chartComponent.init()` 初始化 ECharts

### 9.8 已知问题与修复记录

| 问题 | 根因 | 修复 |
|------|------|------|
| `echarts.js` 体积 ~1MB | 完整 ECharts 库 | 可后续裁剪为仅含 pie/tooltip/legend 模块的精简版 |

---

_本文档为 PPA PRD 的补充规格，对应主 PRD 中的 FR-10（微信小程序内部渠道）。_
