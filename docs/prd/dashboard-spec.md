# 数据看板功能详细规格

**版本**: v1.0  
**最后更新**: 2025-10-21

---

## 1. 功能概述

数据看板是系统的首页，提供项目评估数据的可视化展示，帮助用户快速了解项目整体情况和关键指标。通过统计卡片和图表展示，让用户一目了然地掌握所有项目的评估状况。

## 2. 功能入口

### 2.1 路由

- **路径**: `/dashboard`
- **访问权限**: 默认首页，所有用户可访问

### 2.2 导航入口

- 左侧菜单：数据看板（默认选中）
- 系统Logo点击：跳转到Dashboard

---

## 3. 页面布局设计

### 3.1 整体布局

```
┌─────────────────────────────────────────────────┐
│  📊 数据看板                                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ 📋       │  │ 💰       │  │ ⚠️       │     │
│  │ 项目总数 │  │ 平均成本 │  │ 平均风险 │     │
│  │   12     │  │  85.3万  │  │   65分   │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │                                          │   │
│  │        风险等级分布 (饼图)                │   │
│  │                                          │   │
│  │   🟢 低风险: 5个 (42%)                  │   │
│  │   🟡 中风险: 4个 (33%)                  │   │
│  │   �� 高风险: 3个 (25%)                  │   │
│  │                                          │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │                                          │   │
│  │    成本分布趋势 (可选扩展)               │   │
│  │                                          │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 4. 功能模块详细设计

### 4.1 统计卡片组

#### 4.1.1 项目总数卡片

**显示内容**:
- 标题: "项目总数"
- 图标: 📋 (文档图标)
- 数值: 所有项目的总数（不含模板）
- 单位: "个项目"

**数据来源**:
```typescript
// 统计所有非模板项目
const projectCount = projects.filter(p => !p.is_template).length;
```

**交互**:
- 点击卡片跳转到历史项目页面

#### 4.1.2 平均成本卡片

**显示内容**:
- 标题: "平均成本"
- 图标: 💰 (金钱图标)
- 数值: 所有项目的平均总成本
- 单位: "万元"
- 格式: 保留2位小数

**数据来源**:
```typescript
// 计算平均成本
const totalCost = projects
  .filter(p => !p.is_template)
  .reduce((sum, p) => sum + (p.final_total_cost || 0), 0);

const avgCost = projects.length > 0 
  ? (totalCost / projects.filter(p => !p.is_template).length).toFixed(2)
  : '0.00';
```

**交互**:
- 悬停显示成本范围（最小值-最大值）
- 点击查看成本详细分布

#### 4.1.3 平均风险分卡片

**显示内容**:
- 标题: "平均风险分"
- 图标: ⚠️ (警告图标)
- 数值: 所有项目的平均风险分
- 单位: "分"
- 格式: 整数

**数据来源**:
```typescript
// 计算平均风险分
const totalRisk = projects
  .filter(p => !p.is_template)
  .reduce((sum, p) => sum + (p.final_risk_score || 0), 0);

const avgRisk = projects.length > 0
  ? Math.round(totalRisk / projects.filter(p => !p.is_template).length)
  : 0;
```

**交互**:
- 悬停显示风险分范围
- 根据平均分显示不同颜色
  - < 40: 绿色（低风险）
  - 40-70: 黄色（中风险）
  - > 70: 红色（高风险）

---

### 4.2 风险等级分布图

#### 4.2.1 图表类型

- **类型**: 饼图 (Pie Chart)
- **库**: Ant Design Charts 或 ECharts

#### 4.2.2 数据分类

风险等级按以下规则划分：

```typescript
function getRiskLevel(riskScore: number, maxScore: number): string {
  const ratio = riskScore / maxScore;
  if (ratio < 0.4) return '低风险';
  if (ratio < 0.7) return '中风险';
  return '高风险';
}

// 统计各等级项目数
const riskDistribution = {
  low: projects.filter(p => getRiskLevel(p.final_risk_score, 200) === '低风险').length,
  medium: projects.filter(p => getRiskLevel(p.final_risk_score, 200) === '中风险').length,
  high: projects.filter(p => getRiskLevel(p.final_risk_score, 200) === '高风险').length,
};
```

#### 4.2.3 图表配置

```typescript
const pieConfig = {
  data: [
    { type: '低风险', value: riskDistribution.low, color: '#52c41a' },
    { type: '中风险', value: riskDistribution.medium, color: '#faad14' },
    { type: '高风险', value: riskDistribution.high, color: '#f5222d' },
  ],
  angleField: 'value',
  colorField: 'type',
  color: ({ type }) => {
    if (type === '低风险') return '#52c41a';
    if (type === '中风险') return '#faad14';
    return '#f5222d';
  },
  label: {
    type: 'outer',
    content: '{name} {percentage}',
  },
  interactions: [
    { type: 'element-active' },
    { type: 'pie-legend-active' },
  ],
  legend: {
    position: 'bottom',
  },
  radius: 0.8,
  innerRadius: 0.6, // 环形图
};
```

#### 4.2.4 交互功能

- **悬停**: 显示具体项目数量和百分比
- **点击**: 跳转到历史项目页面，并筛选该风险等级的项目
- **图例**: 点击图例可隐藏/显示对应数据

---

### 4.3 成本分布趋势（可选扩展）

#### 4.3.1 图表类型

- **类型**: 柱状图 (Bar Chart)
- **展示**: 不同成本区间的项目数量分布

#### 4.3.2 数据分组

```typescript
// 成本区间划分
const costRanges = [
  { range: '0-50万', min: 0, max: 50 },
  { range: '50-100万', min: 50, max: 100 },
  { range: '100-150万', min: 100, max: 150 },
  { range: '150-200万', min: 150, max: 200 },
  { range: '200万以上', min: 200, max: Infinity },
];

// 统计各区间项目数
const costDistribution = costRanges.map(range => ({
  range: range.range,
  count: projects.filter(p => 
    p.final_total_cost >= range.min && 
    p.final_total_cost < range.max
  ).length,
}));
```

---

## 5. 数据加载与刷新

### 5.1 初始加载

```typescript
useEffect(() => {
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 获取所有项目数据
      const response = await fetch('/api/projects');
      const result = await response.json();
      
      // 过滤非模板项目
      const projects = result.data.filter(p => !p.is_template);
      setProjects(projects);
      
      // 计算统计数据
      calculateStatistics(projects);
      
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };
  
  loadDashboardData();
}, []);
```

### 5.2 数据刷新

- **自动刷新**: 页面可见时自动刷新（可选）
- **手动刷新**: 提供刷新按钮
- **实时更新**: 当用户创建/编辑/删除项目后自动更新

---

## 6. 空状态处理

### 6.1 无项目数据

**显示内容**:
```
┌─────────────────────────────────────┐
│                                      │
│         📊                           │
│                                      │
│      暂无项目数据                    │
│                                      │
│  [+ 创建第一个项目评估]              │
│                                      │
└─────────────────────────────────────┘
```

**交互**:
- 点击按钮跳转到新建评估页面

### 6.2 加载状态

- 使用 Skeleton 占位符
- 统计卡片显示加载动画
- 图表区域显示 Spin 组件

---

## 7. 响应式设计

### 7.1 桌面端 (>1200px)

- 统计卡片: 3列布局
- 图表: 并排显示
- 最佳浏览体验

### 7.2 平板端 (768px - 1200px)

- 统计卡片: 3列布局（略窄）
- 图表: 垂直堆叠
- 保持完整功能

### 7.3 移动端 (<768px)

- 统计卡片: 单列垂直布局
- 图表: 全宽显示
- 触摸友好的交互

---

## 8. 性能优化

### 8.1 数据缓存

```typescript
// 使用 useMemo 缓存计算结果
const statistics = useMemo(() => {
  if (!projects.length) return null;
  
  return {
    totalCount: projects.length,
    avgCost: calculateAvgCost(projects),
    avgRisk: calculateAvgRisk(projects),
    riskDistribution: calculateRiskDistribution(projects),
  };
}, [projects]);
```

### 8.2 图表性能

- 大数据量时启用数据抽样
- 使用虚拟滚动（如适用）
- 延迟渲染图表

---

## 9. API 接口

### 9.1 获取项目列表

```
GET /api/projects
```

**查询参数**:
- `is_template`: 可选，过滤模板项目

**响应**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "项目A",
      "final_total_cost": 125.5,
      "final_risk_score": 85,
      "is_template": false,
      "created_at": "2025-10-20T10:00:00Z"
    },
    ...
  ]
}
```

### 9.2 获取统计数据（可选优化）

```
GET /api/dashboard/statistics
```

**响应**:
```json
{
  "data": {
    "total_projects": 12,
    "avg_cost": 85.3,
    "avg_risk": 65,
    "risk_distribution": {
      "low": 5,
      "medium": 4,
      "high": 3
    }
  }
}
```

---

## 10. 用户体验优化

### 10.1 视觉反馈

- 卡片悬停效果（阴影增强）
- 数值增长动画（CountUp效果）
- 图表加载过渡动画

### 10.2 交互引导

- 首次访问显示功能提示
- 空状态提供明确的操作引导
- 工具提示说明各指标含义

### 10.3 颜色语义

| 风险等级 | 颜色 | 含义 |
|---------|------|------|
| 低风险 | 🟢 绿色 #52c41a | 安全、正常 |
| 中风险 | 🟡 黄色 #faad14 | 注意、警告 |
| 高风险 | 🔴 红色 #f5222d | 危险、需关注 |

---

## 11. 未来扩展

### 11.1 近期计划

- [ ] 增加时间范围筛选（本周/本月/本季度）
- [ ] 显示项目创建趋势图（折线图）
- [ ] 导出Dashboard数据为Excel

### 11.2 中期计划

- [ ] 成本对比分析（预算vs实际）
- [ ] 风险变化趋势追踪
- [ ] 团队效能分析

### 11.3 长期计划

- [ ] 自定义Dashboard布局
- [ ] 实时数据推送
- [ ] AI预测和建议

---

## 12. 测试要点

### 12.1 功能测试

- ✅ 数据正确性验证
- ✅ 统计计算准确性
- ✅ 图表渲染正常
- ✅ 空状态显示
- ✅ 加载状态处理

### 12.2 性能测试

- ✅ 大量项目（100+）下的渲染性能
- ✅ 图表交互流畅性
- ✅ 数据刷新响应时间

### 12.3 兼容性测试

- ✅ 不同浏览器（Chrome、Firefox、Safari、Edge）
- ✅ 不同屏幕尺寸
- ✅ 移动设备触摸操作

---

**文档结束**
