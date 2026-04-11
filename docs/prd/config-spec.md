# 参数配置功能详细规格

**版本**: v1.2  
**最后更新**: 2026-04-11

---

## 1. 功能概述

参数配置模块提供系统基础数据的管理功能，包括项目角色、风险评估项、差旅成本以及商务报价默认参数的配置。这些配置数据是项目评估与商务报价的基础，直接影响成本计算、风险评分和商务测算结果。

> 补充说明：`商务报价配置` 的完整交互、校验规则与接口约定，详见 [business-pricing-spec.md](./business-pricing-spec.md)。

## 2. 功能入口

### 2.1 路由

- **路径**: `/config`
- **子路由**:
  - `/config/roles` - 角色管理
  - `/config/risk-items` - 风险项管理
  - `/config/travel-costs` - 差旅成本管理
  - `/config` Tab: `商务报价配置` - 商务报价默认参数

### 2.2 导航入口

- 左侧菜单：参数配置
  - 角色管理
  - 风险项管理
  - 差旅成本管理
  - 商务报价配置

---

## 3. 模块1: 角色管理

### 3.1 功能概述

管理项目中涉及的各类角色及其单价配置，用于工作量成本计算。

### 3.2 页面布局

```
┌─────────────────────────────────────────────────┐
│  ⚙️ 参数配置 > 角色管理                          │
├─────────────────────────────────────────────────┤
│                                                  │
│  [+ 新建角色]                  [🔍 搜索...]     │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 角色名称  │ 单价(元/人天) │ 状态 │ 操作  │ │
│  ├────────────────────────────────────────────┤ │
│  │ 项目经理  │ 1,800      │ 启用 │ [编辑] │ │
│  │ 技术经理  │ 2,000      │ 启用 │ [编辑] │ │
│  │ UI设计师  │ 1,400      │ 启用 │ [编辑] │ │
│  │ ...                                        │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 3.3 数据结构

```typescript
interface RoleConfig {
  id: number;
  role_name: string;        // 角色名称
  unit_price: number;       // 单价（元/人天）
  is_active: boolean;       // 是否启用
  created_at: string;
  updated_at?: string;
}
```

### 3.4 表格列配置

```typescript
const columns: ProColumns<RoleConfig>[] = [
  {
    title: '角色名称',
    dataIndex: 'role_name',
    key: 'role_name',
    width: '30%',
    sorter: true,
    formItemProps: {
      rules: [
        { required: true, message: '请输入角色名称' },
        { max: 50, message: '角色名称不超过50字符' },
      ],
    },
  },
  {
    title: '单价（元/人天）',
    dataIndex: 'unit_price',
    key: 'unit_price',
    width: '25%',
    sorter: true,
    align: 'right',
    valueType: 'digit',
    fieldProps: {
      precision: 0,
      min: 0,
      max: 1000000,
      formatter: (value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      parser: (value) => value.replace(/\$\s?|(,*)/g, ''),
    },
    formItemProps: {
      rules: [
        { required: true, message: '请输入单价' },
      ],
    },
    render: (value) => `¥ ${value.toLocaleString()}`,
  },
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
    width: '15%',
    valueType: 'select',
    valueEnum: {
      true: { text: '启用', status: 'Success' },
      false: { text: '禁用', status: 'Default' },
    },
    render: (_, record) => (
      <Badge
        status={record.is_active ? 'success' : 'default'}
        text={record.is_active ? '启用' : '禁用'}
      />
    ),
  },
  {
    title: '操作',
    key: 'actions',
    width: '30%',
    valueType: 'option',
    render: (_, record, __, action) => [
      <a key="edit" onClick={() => action?.startEditable(record.id)}>
        编辑
      </a>,
      <a
        key="toggle"
        onClick={() => toggleRoleStatus(record.id, !record.is_active)}
      >
        {record.is_active ? '禁用' : '启用'}
      </a>,
      <Popconfirm
        key="delete"
        title="确定删除此角色吗？"
        description="删除后无法恢复，且可能影响历史项目数据。"
        onConfirm={() => deleteRole(record.id)}
      >
        <a style={{ color: 'red' }}>删除</a>
      </Popconfirm>,
    ],
  },
];
```

### 3.5 操作功能

#### 3.5.1 新建角色

**触发**: 点击"+ 新建角色"按钮

**表单字段**:
- 角色名称（必填）
- 单价（必填，元/人天）
- 状态（默认启用）

**验证规则**:
- 角色名称不能重复
- 单价必须 > 0
- 单价上限: 1000000 元/人天

**保存逻辑**:
```typescript
const handleAdd = async (values: RoleConfig) => {
  try {
    const response = await fetch('/api/config/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    
    if (response.ok) {
      message.success('角色创建成功');
      actionRef.current?.reload();
    }
  } catch (error) {
    message.error('创建失败，请重试');
  }
};
```

#### 3.5.2 编辑角色

**触发**: 点击"编辑"链接

**行为**:
- 表格行切换为编辑模式
- 允许修改角色名称和单价
- 点击"✓"保存，点击"×"取消

**保存逻辑**:
```typescript
const handleEdit = async (id: number, values: Partial<RoleConfig>) => {
  try {
    const response = await fetch(`/api/config/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    
    if (response.ok) {
      message.success('角色更新成功');
      return true;
    }
  } catch (error) {
    message.error('更新失败，请重试');
    return false;
  }
};
```

#### 3.5.3 启用/禁用角色

**触发**: 点击"启用"或"禁用"链接

**行为**:
- 禁用后，该角色在新建评估时不可选
- 不影响已有项目中的历史数据
- 显示确认提示

#### 3.5.4 删除角色

**触发**: 点击"删除"链接

**行为**:
- 显示二次确认对话框
- 提示可能影响历史项目
- 建议使用"禁用"而非删除

**限制**:
- 如果有项目正在使用该角色，不允许删除
- 提示先禁用该角色

---

## 4. 模块2: 风险项管理

### 4.1 功能概述

管理风险评估所需的评估项及其选项配置，用于项目风险评分。

### 4.2 页面布局

```
┌─────────────────────────────────────────────────┐
│  ⚙️ 参数配置 > 风险项管理                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  [+ 新建风险项]                [🔍 搜索...]     │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 分类  │ 评估项     │ 选项配置 │ 状态│操作│ │
│  ├────────────────────────────────────────────┤ │
│  │ 需求  │ 需求明确度 │ 5个选项  │启用│[..]│ │
│  │ 技术  │ 技术难度   │ 5个选项  │启用│[..]│ │
│  │ ...                                        │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 4.3 数据结构

```typescript
interface RiskItemConfig {
  id: number;
  category: string;         // 风险类别
  item_name: string;        // 评估项名称
  options_json: string;     // 选项配置（JSON字符串）
  is_active: boolean;       // 是否启用
  created_at: string;
  updated_at?: string;
}

// 选项配置解析后的结构
interface RiskOption {
  label: string;            // 选项描述，如"需求非常明确"
  score: number;            // 对应分值，如 2
}

// options_json 示例
const optionsExample = [
  { label: "需求非常明确", score: 2 },
  { label: "需求基本明确", score: 4 },
  { label: "需求部分明确", score: 6 },
  { label: "需求不太明确", score: 8 },
  { label: "需求完全不明确", score: 10 },
];
```

### 4.4 表格列配置

```typescript
const columns: ProColumns<RiskItemConfig>[] = [
  {
    title: '风险类别',
    dataIndex: 'category',
    key: 'category',
    width: '15%',
    valueType: 'select',
    valueEnum: {
      '需求风险': { text: '需求风险' },
      '技术风险': { text: '技术风险' },
      '人员风险': { text: '人员风险' },
      '进度风险': { text: '进度风险' },
      '外部风险': { text: '外部风险' },
    },
    formItemProps: {
      rules: [{ required: true, message: '请选择风险类别' }],
    },
  },
  {
    title: '评估项名称',
    dataIndex: 'item_name',
    key: 'item_name',
    width: '25%',
    formItemProps: {
      rules: [
        { required: true, message: '请输入评估项名称' },
        { max: 100, message: '名称不超过100字符' },
      ],
    },
  },
  {
    title: '选项配置',
    dataIndex: 'options_json',
    key: 'options',
    width: '30%',
    render: (text) => {
      const options = JSON.parse(text);
      return (
        <Tooltip
          title={
            <div>
              {options.map((opt, idx) => (
                <div key={idx}>
                  {opt.label}: {opt.score}分
                </div>
              ))}
            </div>
          }
        >
          <Tag color="blue">{options.length} 个选项</Tag>
        </Tooltip>
      );
    },
    renderFormItem: () => <RiskOptionsEditor />,
  },
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
    width: '12%',
    valueType: 'select',
    valueEnum: {
      true: { text: '启用', status: 'Success' },
      false: { text: '禁用', status: 'Default' },
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: '18%',
    valueType: 'option',
    render: (_, record, __, action) => [
      <a key="edit" onClick={() => action?.startEditable(record.id)}>
        编辑
      </a>,
      <a key="copy" onClick={() => copyRiskItem(record)}>
        复制
      </a>,
      <Popconfirm
        key="delete"
        title="确定删除此风险项吗？"
        onConfirm={() => deleteRiskItem(record.id)}
      >
        <a style={{ color: 'red' }}>删除</a>
      </Popconfirm>,
    ],
  },
];
```

### 4.5 选项配置编辑器

**组件**: `RiskOptionsEditor`

**功能**:
- 动态添加/删除选项
- 每个选项包含：描述文本 + 分值
- 拖拽排序
- 验证分值范围（0-10）

**界面设计**:
```
┌───────────────────────────────────────┐
│  选项配置                              │
├───────────────────────────────────────┤
│  ┌─────────────────────────────────┐ │
│  │ ≡ 需求非常明确      [2] 分  [×] │ │
│  │ ≡ 需求基本明确      [4] 分  [×] │ │
│  │ ≡ 需求部分明确      [6] 分  [×] │ │
│  │ ≡ 需求不太明确      [8] 分  [×] │ │
│  │ ≡ 需求完全不明确   [10] 分  [×] │ │
│  └─────────────────────────────────┘ │
│  [+ 添加选项]                         │
└───────────────────────────────────────┘
```

### 4.6 操作功能

#### 4.6.1 新建风险项

**表单字段**:
- 风险类别（下拉选择）
- 评估项名称（文本输入）
- 选项配置（自定义编辑器）
- 状态（默认启用）

**预设模板**:
提供常用风险项模板，快速创建：
- 需求明确度（5级）
- 技术难度（5级）
- 团队经验（5级）
- 时间紧迫度（5级）

#### 4.6.2 复制风险项

**目的**: 快速创建相似的风险项

**行为**:
- 复制所有字段（除 ID）
- 名称自动添加"(副本)"后缀
- 进入编辑模式

---

## 5. 模块3: 差旅成本管理

### 5.1 功能概述

管理差旅相关的成本项及其标准，用于计算项目的差旅总成本。

### 5.2 页面布局

```
┌─────────────────────────────────────────────────┐
│  ⚙️ 参数配置 > 差旅成本管理                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  💡 差旅成本总计: ¥10,800 元/月                  │
│                                                  │
│  [+ 新建成本项]                [🔍 搜索...]     │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 成本项    │ 金额(元/月) │ 状态 │ 操作    │ │
│  ├────────────────────────────────────────────┤ │
│  │ 市内通勤  │ 1,500       │ 启用 │ [编辑] │ │
│  │ 住宿      │ 6,000       │ 启用 │ [编辑] │ │
│  │ 餐补      │ 900         │ 启用 │ [编辑] │ │
│  │ 出差补助  │ 2,400       │ 启用 │ [编辑] │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 5.3 数据结构

```typescript
interface TravelCostConfig {
  id: number;
  item_name: string;        // 成本项名称
  amount: number;           // 金额（元/月）
  is_active: boolean;       // 是否启用
  created_at: string;
  updated_at?: string;
}
```

### 5.4 表格列配置

```typescript
const columns: ProColumns<TravelCostConfig>[] = [
  {
    title: '成本项',
    dataIndex: 'item_name',
    key: 'item_name',
    width: '35%',
    formItemProps: {
      rules: [
        { required: true, message: '请输入成本项名称' },
        { max: 50, message: '名称不超过50字符' },
      ],
    },
  },
  {
    title: '金额（元/月）',
    dataIndex: 'amount',
    key: 'amount',
    width: '25%',
    valueType: 'digit',
    align: 'right',
    fieldProps: {
      precision: 0,
      min: 0,
      max: 100000,
    },
    formItemProps: {
      rules: [{ required: true, message: '请输入金额' }],
    },
    render: (value) => `¥ ${value.toLocaleString()}`,
  },
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
    width: '15%',
    valueType: 'select',
    valueEnum: {
      true: { text: '启用', status: 'Success' },
      false: { text: '禁用', status: 'Default' },
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: '25%',
    valueType: 'option',
    render: (_, record, __, action) => [
      <a key="edit" onClick={() => action?.startEditable(record.id)}>
        编辑
      </a>,
      <Popconfirm
        key="delete"
        title="确定删除此成本项吗？"
        onConfirm={() => deleteTravelCost(record.id)}
      >
        <a style={{ color: 'red' }}>删除</a>
      </Popconfirm>,
    ],
  },
];
```

### 5.5 总计显示

**计算逻辑**:
```typescript
const totalMonthly = useMemo(() => {
  return travelCosts
    .filter(item => item.is_active)
    .reduce((sum, item) => sum + item.amount, 0);
}, [travelCosts]);
```

**显示位置**: 页面顶部，醒目展示

---

## 6. API 接口

### 6.1 角色管理接口

```
GET    /api/config/roles           # 获取角色列表
GET    /api/config/roles/:id       # 获取角色详情
POST   /api/config/roles           # 创建角色
PUT    /api/config/roles/:id       # 更新角色
DELETE /api/config/roles/:id       # 删除角色
```

### 6.2 风险项管理接口

```
GET    /api/config/risk-items      # 获取风险项列表
GET    /api/config/risk-items/:id  # 获取风险项详情
POST   /api/config/risk-items      # 创建风险项
PUT    /api/config/risk-items/:id  # 更新风险项
DELETE /api/config/risk-items/:id  # 删除风险项
```

### 6.3 差旅成本管理接口

```
GET    /api/config/travel-costs    # 获取差旅成本列表
GET    /api/config/travel-costs/:id # 获取成本项详情
POST   /api/config/travel-costs    # 创建成本项
PUT    /api/config/travel-costs/:id # 更新成本项
DELETE /api/config/travel-costs/:id # 删除成本项
```

### 6.4 批量获取接口

```
GET    /api/config/all             # 一次性获取所有配置
响应: {
  data: {
    roles: RoleConfig[],
    risk_items: RiskItemConfig[],
    travel_costs: TravelCostConfig[]
  }
}
```

### 6.5 商务报价配置接口

```http
GET    /api/config/business-pricing      # 获取商务报价默认配置
PUT    /api/config/business-pricing      # 更新商务报价默认配置
```

**说明**:

- `custom_development` 用于 B 端定制项目报价。
- `enterprise_product` 用于企业级产品模式。
- 企业级产品模式要求 `R&D + CAC + COGS + CSM = 100%`。

---

## 7. 数据初始化

### 7.1 种子数据

**位置**: `server/seed-data/`

**脚本**:
- `seed-roles.js` - 初始化9个角色
- `seed-risk-items.js` - 初始化风险评估项
- `seed-travel-costs.js` - 初始化4个差旅成本项
- `seed-all.js` - 一键初始化所有数据

**执行**:
```bash
cd server/seed-data
node seed-all.js
```

---

## 8. 用户体验优化

### 8.1 编辑体验

- 使用 ProTable 的可编辑表格
- 行内编辑，即时保存
- 编辑时自动聚焦第一个字段
- ESC 键取消编辑

### 8.2 视觉反馈

- 保存成功显示 Toast 提示
- 删除操作显示二次确认
- 禁用状态使用灰色 Badge
- 金额字段千分位格式化

### 8.3 空状态

**无数据时显示**:
```
┌────────────────────────────┐
│          ⚙️                 │
│                             │
│      暂无配置数据           │
│                             │
│  [+ 创建第一条配置]         │
│                             │
└────────────────────────────┘
```

---

## 9. 异常处理

### 9.1 数据校验

- 前端校验 + 后端校验双重保障
- 必填项不能为空
- 数值范围限制
- 唯一性约束检查

### 9.2 删除限制

- 正在使用的配置不能删除
- 提示影响范围
- 建议使用禁用功能

### 9.3 网络错误

- 显示友好的错误提示
- 提供重试按钮
- 保留用户编辑内容

---

## 10. 性能优化

### 10.1 数据加载

- 使用 useSWR 缓存配置数据
- 配置数据不频繁变化，缓存时间较长
- 批量获取接口减少请求次数

### 10.2 列表渲染

- ProTable 内置虚拟滚动
- 分页加载（如数据量大）
- 搜索防抖

---

## 11. 测试要点

### 11.1 功能测试

- ✅ CRUD 操作正常
- ✅ 数据校验生效
- ✅ 启用/禁用状态切换
- ✅ 删除限制正确
- ✅ 搜索功能准确

### 11.2 数据完整性

- ✅ 并发编辑冲突处理
- ✅ 数据关联约束检查
- ✅ JSON 格式正确解析

### 11.3 边界测试

- ✅ 最大/最小值限制
- ✅ 特殊字符处理
- ✅ 长文本截断

---

**文档结束**
