# AI日志监控系统 PRD

## 修订历史

| 版本 | 日期 | 修订内容 | 修订人 |
|------|------|----------|--------|
| 1.0 | 2025-01-04 | 初始版本 | AI Assistant |
| 1.1 | 2025-01-04 | 优化版本: 增加实时刷新、移除导出功能、精简章节 | AI Assistant |

---

## 1. 项目概述

### 1.1 项目背景
PPA系统中集成了多个AI功能模块(风险评估、模块分析、工作量估算等),这些AI调用分散记录在文件系统和数据库中。当AI调用出现问题时,缺乏统一的监控和排查界面,导致问题定位困难。

**重要说明**: AI日志是本地存储的,每个PPA部署实例都有独立的日志文件,存储在`server/logs/ai/`目录下。不同用户/部署之间的日志是隔离的,无法互相访问,这是合理的设计。

### 1.2 项目目标
构建一个集中的AI日志监控平台,提供:
- 统一的AI调用日志查询和展示入口
- 多维度的日志筛选和搜索能力
- 实时日志刷新功能(WebSocket推送)
- 详细的调用链路查看功能
- 快速的问题定位和故障排查支持

### 1.3 核心术语

| 术语 | 说明 |
|------|------|
| AI日志 | 所有AI相关API调用的记录,包括请求、响应、耗时、状态等信息 |
| 文件日志 | 存储在`server/logs/ai/`目录下的详细JSON日志文件(本地存储) |
| 数据库日志 | 存储在`ai_assessment_logs`表中的基础日志记录 |
| Step | AI调用类型,如risk(风险评估)、modules(模块分析)、workload(工作量估算)等 |
| 实时刷新 | 通过WebSocket实时推送新产生的AI日志,无需手动刷新 |

---

## 2. 产品功能需求

### 2.1 功能结构

```
系统监控(一级模块)
└── AI日志监控(二级模块)
    ├── 日志列表(主视图)
    │   ├── 列表展示
    │   ├── 多条件筛选
    │   ├── 排序功能
    │   └── 实时刷新
    ├── 日志详情(详情页)
    │   ├── 基础信息
    │   ├── 请求内容
    │   ├── 响应内容
    │   └── 错误分析
    └── 统计面板(顶部统计)
        ├── 调用总量
        ├── 成功率
        ├── 平均耗时
        └── 错误分布
```

### 2.2 日志列表主视图

#### 2.2.1 页面布局
- **顶部**: 统计面板(4个关键指标卡片)
- **中部**: 筛选区域(多条件组合筛选)
- **底部**: 日志列表表格(支持分页、排序)

#### 2.2.2 列表字段

| 字段名 | 说明 | 是否默认显示 | 是否支持筛选 | 排序 |
|--------|------|--------------|--------------|------|
| 时间戳 | 日志创建时间(YYYY-MM-DD HH:mm:ss) | 是 | 是 | 降序 |
| Step | AI调用类型(risk/modules/workload等) | 是 | 是 | - |
| 请求Hash | 唯一标识(短格式) | 是 | 是 | - |
| Prompt ID | 提示词模板ID | 是 | 是 | - |
| AI模型 | 使用的模型名称 | 是 | 是 | - |
| 状态 | success/fail/timeout | 是 | 是 | - |
| 耗时 | 调用耗时(ms) | 是 | 是 | - |
| 项目ID | 关联的项目ID | 否 | 是 | - |
| 操作 | [查看详情]按钮 | 是 | - | - |

**说明**: 导出功能暂不支持,后续如需导出可单独实现。

#### 2.2.3 状态标识
- **success**: 绿色标签 ✓
- **fail**: 红色标签 ✗
- **timeout**: 橙色标签 ⏱

#### 2.2.4 耗时显示规则
- < 1s: 显示毫秒数(如: 856ms)
- ≥ 1s: 显示秒数(如: 3.2s)
- ≥ 10s: 红色高亮显示

### 2.3 多条件筛选

#### 2.3.1 筛选条件

| 筛选条件 | 类型 | 可选项/输入方式 |
|----------|------|-----------------|
| 时间范围 | 日期选择器 | 开始日期~结束日期 |
| Step | 多选下拉框 | risk/modules/workload/risk-normalize/model-test |
| 状态 | 多选下拉框 | success/fail/timeout |
| AI模型 | 多选下拉框 | 动态加载所有使用过的模型 |
| Prompt ID | 数字输入框 | 输入ID或留空 |
| 项目ID | 数字输入框 | 关联的项目ID |
| 请求Hash | 文本输入框 | 完整或部分hash |

#### 2.3.2 筛选逻辑
- 所有筛选条件支持组合使用(AND关系)
- 重置按钮一键清空所有筛选条件
- 筛选条件变更后自动触发查询(500ms防抖)

### 2.4 日志详情页

#### 2.4.1 基础信息
- **调用时间**: 完整时间戳
- **Step类型**: 调用的step名称
- **请求Hash**: 完整hash值(可复制)
- **路由地址**: API路由URL
- **AI模型**: 模型提供商+模型名称
- **Prompt模板ID**: 链接到模板详情(新窗口打开)
- **状态**: 带图标的完整状态显示
- **耗时**: 毫秒数,如超过阈值显示警告
- **超时设置**: provider超时、service超时

#### 2.4.2 请求内容(Tab页形式)

**Tab 1: 完整请求** (代码块展示)
```json
{
  "promptId": "35",
  "template_content": "...",
  "variables": { ... },
  "document": "...",
  "final_prompt": "..."
}
```
- 支持JSON语法高亮
- 支持折叠/展开
- 支持复制到剪贴板
- 大文本自动折叠(>1000字符)

**Tab 2: 变量列表** (表格展示)
| 变量名 | 值 | 备注 |
|--------|----|------|
| desc | ... | 项目描述 |
| current_risk_items | ... | 当前风险项 |
| ... | ... | ... |

#### 2.4.3 响应内容(Tab页形式)

**Tab 1: 原始响应** (代码块展示)
- 显示完整的原始响应文本
- 支持文本搜索
- AI格式化的内容保持原始格式

**Tab 2: 解析响应** (如果存在)
- JSON格式展示解析后的响应
- 语法高亮和格式化
- 支持复制

#### 2.4.4 错误分析(仅fail状态)

**错误信息**: 错误消息高亮显示

**超时分析**: (如果timeout)
- 实际耗时: 30,948ms
- Provider超时: 30,000ms
- Service超时: 32,000ms
- 超时原因: Provider超时

**建议解决方案**:
- 超时错误: "建议增加provider超时时间或优化请求内容"
- 解析错误: "建议检查AI响应格式是否符合预期"
- 网络错误: "建议检查网络连接和API密钥有效性"

#### 2.4.5 文件路径
显示所有相关文件的完整路径(可点击复制):
- `server/logs/ai/risk/2025-12-23/101009_3785780b4483/index.json`
- `server/logs/ai/risk/2025-12-23/101009_3785780b4483/request.json`
- `server/logs/ai/risk/2025-12-23/101009_3785780b4483/response.raw.txt`
- ...

**重要说明**: 这些日志文件存储在本地,仅当前PPA实例可访问。如果是多用户部署,每个用户只能看到自己所在实例的日志。

### 2.5 统计面板

#### 2.5.1 统计指标
1. **总调用次数**: 当前筛选条件下的总日志数
2. **成功率**: 成功调用占比(success / total)
3. **平均耗时**: 所有调用的平均耗时(ms)
4. **错误分布**: 各类错误的数量和占比

#### 2.5.2 实时刷新机制(核心功能)

**功能概述**:
通过WebSocket实现日志的实时推送,新产生的AI调用日志会立即推送到前端,无需手动刷新。这是本模块的核心功能,极大提升问题排查效率。

**刷新方式对比**:

**静态刷新**:
- 进入页面自动加载
- 筛选条件变化自动刷新
- 手动刷新按钮
- 用于WebSocket连接失败时的降级方案

**实时刷新(WebSocket)**:
- ✅ 通过WebSocket连接实时接收新日志(延迟<100ms)
- ✅ 新日志自动插入到列表顶部(带淡入高亮动画)
- ✅ 统计面板实时更新
- ✅ 可开关实时刷新功能(默认开启)
- ✅ 断线自动重连(指数退避策略)
- ✅ 连接状态可视化(绿色:已连接,黄色:连接中,红色:已断开)

**使用场景示例**:
1. 在AI评估页面点击"风险评估"按钮
2. AI调用开始执行
3. 日志监控页面立即显示该次调用记录(状态:执行中)
4. AI调用完成后自动更新状态(成功/失败)和耗时
5. 无需任何手动刷新操作

---

**实时刷新技术实现**

**前端实现方案**:
- **技术选型**: 使用`reconnecting-websocket`库增强连接稳定性
- **核心功能**:
  - 管理WebSocket连接状态(连接中/已连接/已断开)
  - 实现消息队列,防止消息丢失
  - 新日志高亮显示(淡入动画3秒)
  - 列表自动滚动到顶部
  - 连接状态指示器
- **降级处理**: WebSocket连接失败时自动切换为静态刷新模式
- **性能优化**: 消息去重、批量处理、虚拟滚动(超过1000条)

**后端实现方案**:
- **技术选型**: 使用Node.js原生`ws`库创建WebSocket服务器
- **核心功能**:
  - 维护客户端连接池(Set数据结构)
  - 在AI服务调用成功后广播日志给订阅的客户端
  - 实现心跳检测(每30秒ping/pong)
  - 断线自动重连支持
  - 连接数限制(最多5个并发连接)
- **广播策略**: 只向订阅了对应step类型的客户端推送
- **性能影响**:
  - 内存占用: 每个连接约50KB,5个连接约250KB
  - CPU占用: 广播操作耗时<1ms
  - 网络流量: 每条日志约2-5KB

**实现复杂度评估**:
- **前端**: 中等(需要管理连接状态、消息队列、UI动画)
- **后端**: 中等(需要处理并发连接、消息广播、连接清理)
- **整体难度**: 中等
- **开发时间估算**: 2天
  - 后端: 0.5天(WebSocket服务器 + 广播逻辑)
  - 前端: 1天(连接管理 + 消息处理 + UI动画)
  - 联调: 0.5天

**风险控制措施**:
- 自动降级: WebSocket连接失败时切换为静态刷新
- 消息去重: 防止重复推送同一条日志
- 连接数限制: 防止资源耗尽(最多5个连接)
- 异常捕获: 所有WebSocket操作try-catch包裹

**WebSocket API设计**:
```
连接地址: ws://localhost:3001/api/monitoring/logs/live

客户端发送消息:
{
  type: "subscribe",
  steps: ["risk", "modules", "workload"]  // 订阅的step类型
}

服务器推送消息:
{
  type: "new_log",
  data: { /* 完整的日志对象 */ }
}

心跳检测:
{
  type: "ping"
}
{
  type: "pong"
}
```

**代码示例**:

*后端广播逻辑(伪代码)*:
```javascript
// 在AI服务调用成功后
async function onAiCallComplete(log) {
  // 1. 保存到数据库和文件
  await saveLogToDatabase(log);
  await saveLogToFile(log);
  
  // 2. 广播给WebSocket客户端
  for (const client of websocketClients) {
    if (client.isAlive && client.subscribedSteps.includes(log.step)) {
      client.send(JSON.stringify({
        type: 'new_log',
        data: log
      }));
    }
  }
}
```

*前端接收逻辑(伪代码)*:
```javascript
useEffect(() => {
  const ws = new ReconnectingWebSocket('ws://localhost:3001/api/monitoring/logs/live');
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'new_log') {
      // 将新日志插入到列表顶部
      setLogs(prevLogs => [message.data, ...prevLogs]);
      
      // 添加高亮动画
      addHighlightAnimation(message.data.request_hash);
      
      // 更新统计面板
      updateStatsPanel(message.data);
    }
  };
  
  return () => ws.close();
}, []);
```

---

## 3. 技术实现需求

### 3.1 前端技术栈

- **框架**: UmiJS 4 + React 18 + TypeScript
- **UI组件**: Ant Design 5.x + ProComponents
- **代码高亮**: react-syntax-highlighter
- **日期处理**: dayjs
- **样式**: TailwindCSS
- **实时通信**: WebSocket API + reconnecting-websocket(增强库)

### 3.2 后端API需求

#### 3.2.1 日志列表查询
```
GET /api/monitoring/logs

Query参数:
- page: 页码(默认1)
- pageSize: 每页数量(默认20)
- startDate: 开始日期(ISO格式)
- endDate: 结束日期(ISO格式)
- steps: Step类型数组(risk,modules,workload...)
- statuses: 状态数组(success,fail,timeout)
- models: 模型名称数组
- promptId: Prompt ID
- projectId: 项目ID
- searchHash: Hash搜索关键字

返回:
{
  success: true,
  data: {
    total: number,
    page: number,
    pageSize: number,
    list: Array<LogItem>
  }
}
```

#### 3.2.2 日志详情查询
```
GET /api/monitoring/logs/:requestHash

返回:
{
  success: true,
  data: {
    index: object,        // index.json内容
    request: object,      // request.json内容
    responseRaw: string,  // response.raw.txt内容
    responseParsed: object|null,  // response.parsed.json内容(如果有)
    notes: string|null    // notes.log内容(如果有)
  }
}
```

#### 3.2.3 统计信息查询
```
GET /api/monitoring/stats

Query参数: 同列表筛选条件

返回:
{
  success: true,
  data: {
    totalCalls: number,      // 总调用次数
    successRate: number,     // 成功率(百分比)
    avgDuration: number,     // 平均耗时(ms)
    errorDistribution: {     // 错误分布
      timeout: number,
      parse: number,
      network: number,
      other: number
    }
  }
}
```

#### 3.2.4 WebSocket实时推送
```
连接: ws://localhost:3001/api/monitoring/logs/live

客户端发送:
{
  type: "subscribe",
  steps: ["risk", "modules", "workload"]  // 订阅的step类型
}

服务器推送:
{
  type: "new_log",
  data: {
    // 完整的日志对象(同列表项结构)
  }
}

心跳保持:
{
  type: "ping"
}
{
  type: "pong"
}
```

### 3.3 数据处理逻辑

#### 3.3.1 数据来源整合

**数据库日志** (`ai_assessment_logs`表):
```sql
SELECT 
  id, prompt_id, model_used, request_hash, 
  duration_ms, status, error_message, created_at
FROM ai_assessment_logs
WHERE created_at BETWEEN ? AND ?
  AND status IN (...)
ORDER BY created_at DESC
```

**文件日志** (`server/logs/ai/`目录):
```javascript
// 目录结构
// server/logs/ai/{step}/{date}/{timestamp}_{hash}/
//   - index.json
//   - request.json
//   - response.raw.txt
//   - response.parsed.json (可选)
//   - notes.log (可选)

// 读取策略
1. 首先查询数据库获取基础列表和统计
2. 需要详情时,根据request_hash拼接文件路径
3. 读取文件内容并返回
4. 文件读取失败时返回友好错误提示
```

**本地日志文件说明**:
- 日志文件存储在本地文件系统,不会上传到云端
- 每个PPA部署实例都有自己的独立日志
- 如果是单机部署,只有当前机器能看到日志
- 如果是多人共享部署,所有用户共享同一份日志(因为用的是同一个PPA实例)
- 日志隔离是合理的,符合数据安全和隐私要求

#### 3.3.2 文件读取权限
- 后端服务需要读取`server/logs/ai/`目录权限
- 通过Node.js `fs`模块读取JSON和文本文件
- 文件不存在时返回`null`,前端显示"文件不存在或已被清理"
- **权限控制**: 只有后端服务能访问日志文件,前端通过API间接访问,保证安全性

### 3.4 数据库优化

#### 3.4.1 现有索引
```sql
-- 已存在索引
CREATE INDEX idx_ai_assessment_logs_prompt ON ai_assessment_logs(prompt_id);

-- 建议新增索引
CREATE INDEX idx_ai_assessment_logs_created_at ON ai_assessment_logs(created_at);
CREATE INDEX idx_ai_assessment_logs_status ON ai_assessment_logs(status);
CREATE INDEX idx_ai_assessment_logs_model ON ai_assessment_logs(model_used);
```

#### 3.4.2 查询优化
- 时间范围筛选必须加索引
- 避免全表扫描
- 分页使用`LIMIT`+`OFFSET`

### 3.5 错误处理

- 文件读取失败: 返回`null`,前端显示"文件不存在或已被清理"
- JSON解析失败: 返回原始文本,标记为"解析失败"
- 数据库查询失败: 返回错误信息,状态500
- 权限不足: 返回403错误
- WebSocket连接失败: 自动降级为静态刷新

### 3.6 实时刷新实现细节

#### 3.6.1 后端实现
```javascript
// 伪代码示例
class LogWebSocketServer {
  constructor() {
    this.clients = new Set();
    this.logQueue = []; // 新日志队列
  }
  
  // AI服务调用成功后调用此方法
  onNewLog(log) {
    // 保存到数据库和文件
    await this.saveLog(log);
    
    // 广播给所有订阅的客户端
    for (const client of this.clients) {
      if (client.subscribedSteps.includes(log.step)) {
        client.send(JSON.stringify({
          type: 'new_log',
          data: log
        }));
      }
    }
  }
}
```

**实现复杂度**: 中等
- 需要修改AI服务层,在调用成功后触发WebSocket推送
- 需要处理并发连接和消息广播
- 需要实现连接管理和清理机制

#### 3.6.2 前端实现
```javascript
// 伪代码示例
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3001/api/monitoring/logs/live');
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'new_log') {
      // 将新日志插入到列表顶部
      setLogs(prev => [message.data, ...prev]);
      
      // 高亮动画
      highlightNewLog(message.data.request_hash);
    }
  };
  
  return () => ws.close();
}, []);
```

**实现复杂度**: 中等
- 需要管理WebSocket连接状态
- 需要处理消息队列和去重
- 需要实现高亮动画和自动滚动

---

## 4. 界面设计需求

### 4.1 页面路由

**一级模块路由**: `/monitoring`
**二级模块路由**: `/monitoring/ai-logs`

### 4.2 列表页面原型

```
┌─────────────────────────────────────────────────────────────┐
│  PPA系统 > 系统监控 > AI日志监控                            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 统计面板                                               │  │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌───────────────────────┐ │  │
│  │ │总调用│ │成功率│ │平均耗│ │ 错误分布              │ │  │
│  │ │12,456│ │ 92.3%│ │2.3s  │ │ timeout: 45 (68%)   │ │  │
│  │ │次    │ │      │ │      │ │ parse: 12 (18%)     │ │  │
│  │ └──────┘ └──────┘ └──────┘ │ network: 9 (14%)    │ │  │
│  │                              │ other: 0 (0%)       │ │  │
│  │                              └───────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 筛选条件                                               │  │
│  │ 时间范围: [2025-01-01]~[2025-01-31]  Step: [风险分析▼]│  │
│  │ 状态: [全部▼]  模型: [全部▼]  Prompt ID: [____]      │  │
│  │ 项目ID: [____]  Hash: [____]  [查询] [重置]          │  │
│  │                                                       │  │
│  │ [开启实时刷新] ← 开关                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 日志列表                                               │  │
│  │ 时间          Step    Hash        模型    状态  耗时 │  │
│  │ 2025-01-04... risk    3785780b... 智谱GLM fail  30.9s│  │
│  │ 2025-01-04... modules 9a974e26... 智谱GLM succ   2.3s│  │
│  │ 2025-01-04... workload fa0ab432... GPT-4  succ   5.1s│  │
│  │ ...                                                   │  │
│  │                                          [刷新]        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**说明**: 右上角有"开启实时刷新"开关,开启后新日志会自动推送到列表。

### 4.3 详情页面原型

```
┌─────────────────────────────────────────────────────────────┐
│  PPA系统 > 系统监控 > AI日志监控 > 日志详情                 │
│                                                             │
│  时间: 2025-01-04 14:30:25  状态: ✗ fail  耗时: 30,948ms │
│  Step: risk  Hash: 3785780b4483...                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Tab: [基础信息] [请求内容] [响应内容] [错误分析]      │  │
│  │                                                       │  │
│  │ 基础信息页:                                           │  │
│  │ • 调用时间: 2025-01-04T02:10:09.340Z                 │  │
│  │ • 路由地址: POST /api/ai/assess-risk                 │  │
│  │ • AI模型: 智谱 GLM / glm-4.5-flash                   │  │
│  │ • Prompt模板: #35 (点击链接查看模板详情)             │  │
│  │ • Provider超时: 30,000ms                             │  │
│  │ • Service超时: 32,000ms                              │  │
│  │                                                       │  │
│  │ • 文件路径:                                            │  │
│  │   - server/logs/ai/risk/2025-12-23/101009_3785780b... │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 响应式设计

- **PC端**: 1920x1080及以上,双栏布局
- **平板端**: 768px以上,单栏布局,可横向滚动
- **移动端**: 375px以上,卡片式布局,简化字段

---

## 5. 非功能性需求

### 5.1 性能要求

- **响应时间**:
  - 列表查询: < 500ms
  - 详情加载: < 300ms
  - 统计刷新: < 200ms
  - WebSocket推送: < 100ms(延迟)
- **并发支持**: 支持5个并发WebSocket连接
- **数据量**: 支持10万条日志存储和查询

### 5.2 安全要求

- 不记录敏感信息(API密钥、token等)
- 文件日志访问需要服务端权限控制
- 数据库日志查询使用参数化查询,防止SQL注入
- WebSocket连接无需认证(单用户系统)

### 5.3 可维护性

- 代码注释覆盖率 > 30%
- API文档自动生成(OpenAPI规范)
- 日志清理机制(可配置保留天数,默认90天)
- WebSocket连接监控和自动清理

### 5.4 可用性

- 7x24小时可用
- 页面加载成功率 > 99.9%
- WebSocket自动降级: 连接失败时自动切换为静态刷新

---



## 7. 测试需求

### 7.1 单元测试

- API接口单元测试(覆盖率 > 80%)
  - `/api/monitoring/logs` - 列表查询
  - `/api/monitoring/logs/:hash` - 详情查询
  - `/api/monitoring/stats` - 统计查询
- 工具函数测试(数据转换、时间格式化等)
- WebSocket消息处理逻辑测试
  
**测试框架**: Jest + Supertest

### 7.2 集成测试

- 端到端的日志查询流程
- 文件读取异常场景(文件不存在、权限不足)
- WebSocket连接和消息推送
- 实时刷新开关切换
- 筛选条件组合查询

**测试数据**: 准备1000条模拟日志数据

---

## 8. 附录

### 8.1 现有日志结构参考

**index.json示例**:
```json
{
  "step": "risk",
  "route": "/api/ai/assess-risk",
  "request_hash": "3785780b4483...",
  "prompt_template_id": "35",
  "model_provider": "智谱 GLM",
  "model_name": "glm-4.5-flash",
  "status": "fail",
  "duration_ms": 30948,
  "provider_timeout_ms": 30000,
  "service_timeout_ms": 32000,
  "timestamp": "2025-12-23T02:10:09.340Z"
}
```

**request.json结构**:
```json
{
  "promptId": "35",
  "template_content": "...",
  "variables": { "desc": "...", "document": "..." },
  "document": "...",
  "final_prompt": "..."
}
```

**数据库日志表结构**:
```sql
CREATE TABLE ai_assessment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id TEXT,
  model_used TEXT,
  request_hash TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 8.2 相关文件路径

- 日志目录: `server/logs/ai/{step}/{date}/{timestamp}_{hash}/`
- 数据库文件: `server/ppa.db`
- 前端页面: `frontend/ppa_frontend/src/pages/Monitoring/`
- 后端路由: `server/routes/monitoring.js`
- 后端服务: `server/services/monitoringService.js`
- 后端模型: `server/models/monitoringModel.js`
- WebSocket服务: `server/websocket/monitoring.js`

### 8.3 本地存储说明

**为什么日志要本地存储?**
1. **隐私安全**: AI调用可能包含敏感项目信息,不上云更安全
2. **成本考虑**: 日志量大,本地存储无额外费用
3. **访问速度**: 本地文件读取速度更快
4. **离线可用**: 无需网络也能查看历史日志

**日志文件访问权限**:
```
PPA/
├── server/
│   ├── logs/
│   │   └── ai/           ← 只有本机后端服务可读写
│   │       ├── risk/
│   │       ├── modules/
│   │       └── workload/
│   └── index.js          ← 提供API访问日志
└── frontend/             ← 通过API间接访问
```

**权限控制**: 前端无法直接访问`server/logs/`目录,必须通过后端API,确保安全性。

---

## 9. 验收标准

### 9.1 功能验收

- [ ] 可以查看所有AI调用日志列表
- [ ] 支持按时间、step、状态、模型等条件筛选
- [ ] 可以查看单条日志的完整详情
- [ ] 可以查看请求内容、响应内容和错误分析
- [ ] 统计面板显示正确
- [ ] **实时刷新功能正常工作**(WebSocket)
- [ ] 断线自动重连功能正常
- [ ] 日志文件本地读取正常

### 9.2 性能验收

- [ ] 列表查询响应时间 < 500ms
- [ ] 详情页加载时间 < 300ms
- [ ] WebSocket推送延迟 < 100ms
- [ ] 支持100+页日志数据流畅翻页



---

**文档结束**
