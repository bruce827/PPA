# 历史项目管理功能详细规格

**版本**: v1.0  
**最后更新**: 2025-10-21

---

## 1. 功能概述

历史项目管理模块提供已完成项目评估的查看、管理和操作功能。用户可以浏览所有历史项目，进行搜索、筛选、编辑、删除、查看详情和导出报告等操作。

## 2. 功能入口

### 2.1 路由

- **路径**: `/assessment/history`
- **访问权限**: 所有用户可访问

### 2.2 导航入口

- 左侧菜单：项目评估 → 历史项目
- Dashboard 卡片点击跳转

---

## 3. 页面布局设计

### 3.1 整体布局

```
┌─────────────────────────────────────────────────┐
│  �� 历史项目                                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  [🔍 搜索项目...]  [🏷️ 模板 ▼]  [+ 新建评估]  │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 项目名称 │ 成本 │ 风险 │ 创建时间 │ 操作 │ │
│  ├────────────────────────────────────────────┤ │
│  │ 项目A    │125万│ 85分 │2025-10-15│ [...]│ │
│  │ 项目B    │ 68万│ 45分 │2025-10-12│ [...]│ │
│  │ ...                                        │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  显示 1-10 / 共 25 条        [1] 2 3 4 5 >     │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 4. 功能模块详细设计

### 4.1 搜索与筛选

#### 4.1.1 搜索框

**位置**: 页面顶部左侧

**功能**:
- 实时搜索项目名称和描述
- 支持模糊匹配
- 防抖优化（300ms延迟）

**实现**:
```typescript
const [searchText, setSearchText] = useState('');

// 防抖搜索
const debouncedSearch = useDebounce(searchText, 300);

useEffect(() => {
  fetchProjects({ search: debouncedSearch });
}, [debouncedSearch]);
```

#### 4.1.2 模板筛选

**位置**: 搜索框右侧

**选项**:
- 全部项目（默认）
- 仅正式项目
- 仅模板项目

**实现**:
```typescript
const filterOptions = [
  { label: '全部项目', value: 'all' },
  { label: '仅正式项目', value: 'projects' },
  { label: '仅模板', value: 'templates' },
];

const handleFilterChange = (value) => {
  fetchProjects({ 
    is_template: value === 'templates' ? 1 : value === 'projects' ? 0 : undefined 
  });
};
```

#### 4.1.3 高级筛选（可选扩展）

- 风险等级筛选（低/中/高）
- 成本区间筛选
- 创建时间范围筛选

---

### 4.2 项目列表表格

#### 4.2.1 列定义

| 列名 | 宽度 | 可排序 | 说明 |
|------|------|--------|------|
| 项目名称 | 25% | 是 | 主标题，点击查看详情 |
| 项目描述 | 25% | 否 | 截断显示，悬停查看完整 |
| 是否模板 | 8%  | 否 | 仅有一条记录可以为模板 |
| 总成本 | 10% | 是 | 万元，2位小数 |
| 风险分 | 8% | 是 | 显示分数和等级标识 |
| 工作量 | 8% | 是 | 人天数 |
| 创建时间 | 12% | 是 | YYYY-MM-DD格式 |
| 操作 | 4% | 否 | 操作按钮组 |

#### 4.2.2 数据结构

```typescript
interface ProjectRecord {
  id: number;
  name: string;
  description?: string;
  final_total_cost: number;       // 万元
  final_risk_score: number;       // 0-200
  final_workload_days: number;    // 人天
  is_template: boolean;           // 是否为当前模板（全局仅一条 true）
  created_at: string;             // ISO 8601
  updated_at?: string;
  assessment_details_json: string; // JSON字符串
}
```

#### 4.2.3 ProTable 配置

```typescript
const columns: ProColumns<ProjectRecord>[] = [
  {
    title: '项目名称',
    dataIndex: 'name',
    key: 'name',
    sorter: true,
    render: (text, record) => (
      <Space>
        <a onClick={() => viewDetails(record.id)}>{text}</a>
        {record.is_template && <Tag color="blue">当前模板</Tag>}
      </Space>
    ),
  },
  {
    title: '项目描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: { showTitle: false },
    render: (text) => (
      <Tooltip title={text}>
        {text || '-'}
      </Tooltip>
    ),
  },
  {
    title: '是否模板',
    dataIndex: 'is_template',
    key: 'is_template',
    width: 100,
    align: 'center',
    render: (value) => (value ? <Tag color="blue">当前模板</Tag> : '-'),
  },
  {
    title: '总成本（万元）',
    dataIndex: 'final_total_cost',
    key: 'cost',
    sorter: true,
    align: 'right',
    render: (value) => `¥ ${value.toFixed(2)}`,
  },
  {
    title: '风险分',
    dataIndex: 'final_risk_score',
    key: 'risk',
    sorter: true,
    align: 'center',
    render: (score) => {
      const level = getRiskLevel(score);
      const color = level === '高风险' ? 'red' : level === '中风险' ? 'orange' : 'green';
      return (
        <Space>
          <span>{score}</span>
          <Tag color={color}>{level}</Tag>
        </Space>
      );
    },
  },
  {
    title: '工作量（人天）',
    dataIndex: 'final_workload_days',
    key: 'workload',
    sorter: true,
    align: 'right',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    sorter: true,
    render: (date) => dayjs(date).format('YYYY-MM-DD'),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 120,
    render: (_, record) => (
      <Space size="small">
        <Tooltip title="查看详情">
          <Button type="link" icon={<EyeOutlined />} onClick={() => viewDetails(record.id)} />
        </Tooltip>
        <Tooltip title="编辑">
          <Button type="link" icon={<EditOutlined />} onClick={() => editProject(record.id)} />
        </Tooltip>
        <Tooltip title="导出报告">
          <Button type="link" icon={<DownloadOutlined />} onClick={() => exportReport(record.id)} />
        </Tooltip>
        <Popconfirm
          title="确定删除此项目吗？"
          onConfirm={() => deleteProject(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Tooltip title="删除">
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      </Space>
    ),
  },
];
```

---

### 4.3 操作功能

#### 4.3.1 查看详情

**触发方式**:
- 点击项目名称
- 点击操作栏的"查看"按钮

**行为**:
- 打开详情页面（新路由 `/assessment/detail/:id`）
- 显示完整的评估信息
- 只读模式，不可编辑

**详情页面布局**:
```
┌─────────────────────────────────────────┐
│  [← 返回]  项目A - 评估详情              │
├─────────────────────────────────────────┤
│                                          │
│  📋 基本信息                             │
│  ├─ 项目名称: 项目A                      │
│  ├─ 项目描述: ...                        │
│  ├─ 创建时间: 2025-10-15                │
│  └─ 是否模板: 否                         │
│                                          │
│  💰 成本汇总                             │
│  [同评估总览页面的成本表格]              │
│                                          │
│  ⚠️ 风险评分详情                         │
│  [风险评估项列表及得分]                  │
│                                          │
│  📊 工作量明细                           │
│  [新功能开发和系统对接表格]              │
│                                          │
│  📦 其他成本                             │
│  [差旅、运维、风险成本详情]              │
│                                          │
│  [编辑项目] [导出报告] [删除项目]        │
│                                          │
└─────────────────────────────────────────┘
```

#### 4.3.2 编辑项目

**触发方式**:
- 点击操作栏的"编辑"按钮
- 详情页点击"编辑项目"按钮

**行为**:
- 跳转到评估页面 `/assessment/new?edit_id={id}`
- 自动加载项目数据
- 填充所有表单字段
- 保存时更新已有项目（PUT请求）

**实现**:
```typescript
const editProject = (id: number) => {
  history.push(`/assessment/new?edit_id=${id}`);
};

// 在评估页面
useEffect(() => {
  const editId = searchParams.get('edit_id');
  if (editId) {
    loadProjectData(editId);
  }
}, [searchParams]);
```

#### 4.3.3 导出报告

**触发方式**:
- 点击操作栏的"导出"按钮
- 详情页点击"导出报告"按钮

**行为**:
- 弹出导出选项对话框
- 选择导出格式（PDF / Excel）
- 下载生成的报告文件

**对话框设计**:
```
┌─────────────────────────────┐
│  导出项目报告                │
├─────────────────────────────┤
│                              │
│  选择导出格式:               │
│  ○ PDF报告（推荐）           │
│  ○ Excel表格                │
│                              │
│  包含内容:                   │
│  ☑ 基本信息                  │
│  ☑ 成本汇总                  │
│  ☑ 风险评分                  │
│  ☑ 工作量明细                │
│  ☑ 其他成本                  │
│                              │
│  [取消]        [确定导出]    │
│                              │
└─────────────────────────────┘
```

#### 4.3.4 删除项目

**触发方式**:
- 点击操作栏的"删除"按钮
- 详情页点击"删除项目"按钮

**业务约束**:
- 若项目为当前模板（`is_template = 1`），则**不允许删除**：
  - 列表操作列中不显示删除按钮，或展示为禁用状态并附带 Tooltip「当前模板不可删除，请先在新评估中设置新的模板」。
  - 详情页同理，不提供“删除项目”操作。
- 只有 `is_template = 0` 的普通项目才允许执行删除操作。

**行为（仅对非模板项目）**:
- 显示确认对话框（Popconfirm）
- 二次确认防止误删
- 删除后刷新列表
- 显示成功提示

**确认对话框**:
```
确定删除此项目吗？
此操作不可恢复。

[取消]  [确定]
```

**实现**:
```typescript
const deleteProject = async (id: number) => {
  try {
    // 伪代码：在调用前应已保证 record.is_template === false
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    message.success('项目已删除');
    fetchProjects(); // 刷新列表
  } catch (error) {
    message.error('删除失败，请重试');
  }
};
```

---

### 4.4 分页与排序

#### 4.4.1 分页配置

```typescript
const pagination = {
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total) => `共 ${total} 条记录`,
};
```

#### 4.4.2 排序逻辑

- **前端排序**: 数据量 < 100条
- **后端排序**: 数据量 ≥ 100条

```typescript
// 后端排序请求
const fetchProjects = async (params) => {
  const { sorter, pagination } = params;
  const queryParams = {
    page: pagination.current,
    pageSize: pagination.pageSize,
    sortField: sorter?.field,
    sortOrder: sorter?.order, // 'ascend' | 'descend'
  };
  
  const response = await fetch('/api/projects?' + new URLSearchParams(queryParams));
  return response.json();
};
```

---

## 5. API 接口

### 5.1 获取项目列表

```
GET /api/projects
```

**查询参数**:
```typescript
{
  page?: number;           // 页码，从1开始
  pageSize?: number;       // 每页数量
  search?: string;         // 搜索关键词
  is_template?: 0 | 1;     // 是否模板（1 表示当前模板，最多仅一条记录）
  sortField?: string;      // 排序字段
  sortOrder?: 'ascend' | 'descend'; // 排序方向
}
```

**响应**:
```json
{
  "data": [...],
  "total": 25,
  "page": 1,
  "pageSize": 10
}
```

### 5.2 获取项目详情

```
GET /api/projects/:id
```

**响应**:
```json
{
  "data": {
    "id": 1,
    "name": "项目A",
    "description": "...",
    "final_total_cost": 125.5,
    "final_risk_score": 85,
    "final_workload_days": 180,
    "is_template": false,
    "created_at": "2025-10-15T08:30:00Z",
    "assessment_details_json": "{...}"
  }
}
```

### 5.3 删除项目

```
DELETE /api/projects/:id
```

**响应**:
```json
{
  "success": true,
  "message": "项目已删除"
}
```

---

## 6. 用户体验优化

### 6.1 加载状态

- 表格加载显示 Skeleton
- 操作按钮显示 Loading 状态
- 分页切换流畅过渡

### 6.2 空状态

**无数据时显示**:
```
┌────────────────────────────┐
│                             │
│          📂                 │
│                             │
│      暂无项目数据           │
│                             │
│  [+ 创建第一个项目评估]     │
│                             │
└────────────────────────────┘
```

**搜索无结果时显示**:
```
┌────────────────────────────┐
│                             │
│          🔍                 │
│                             │
│   未找到匹配的项目          │
│   请尝试其他搜索词          │
│                             │
│  [清除搜索]                 │
│                             │
└────────────────────────────┘
```

### 6.3 批量操作（未来扩展）

- [ ] 批量选择项目
- [ ] 批量导出报告
- [ ] 批量删除
- [ ] 批量设为模板

---

## 7. 性能优化

### 7.1 列表渲染

- 使用虚拟滚动（数据量>100时）
- 按需加载详情数据
- 图片懒加载（如有）

### 7.2 数据缓存

```typescript
// 使用 SWR 或 React Query 缓存数据
const { data, mutate } = useSWR('/api/projects', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1分钟内不重复请求
});
```

---

## 8. 异常处理

### 8.1 网络错误

- 显示友好的错误提示
- 提供重试按钮
- 记录错误日志

### 8.2 权限错误

- 隐藏无权限的操作按钮
- 操作失败显示权限提示

### 8.3 数据异常

- 缺失数据显示"-"
- JSON解析失败显示警告
- 数值异常显示默认值

---

## 9. 测试要点

### 9.1 功能测试

- ✅ 列表正常显示
- ✅ 搜索功能准确
- ✅ 筛选逻辑正确
- ✅ 排序功能正常
- ✅ 分页切换流畅
- ✅ 编辑跳转正确
- ✅ 删除功能可靠
- ✅ 详情页显示完整

### 9.2 边界测试

- ✅ 空数据处理
- ✅ 大量数据（1000+）性能
- ✅ 长文本截断
- ✅ 特殊字符搜索

### 9.3 交互测试

- ✅ 确认对话框正常
- ✅ 加载状态显示
- ✅ 错误提示清晰
- ✅ 操作反馈及时

---

**文档结束**
