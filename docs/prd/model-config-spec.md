# 模型配置功能详细规格 (PRD)

**版本**: v1.0  
**最后更新**: 2025-10-21  
**负责人**: Product Manager

---

## 1. 产品概述

### 1.1 功能定位

在PPA项目评估系统中新增"模型配置"模块，为系统提供AI能力支撑。用户可以配置多个AI模型连接，管理提示词模板，为未来的智能分析功能（如风险分析、成本优化建议等）提供基础设施。

### 1.2 业务价值

- **灵活性**: 支持多种AI服务商（OpenAI、阿里云、百度等），用户自主选择
- **可扩展**: 通过提示词模板系统，快速扩展新的AI应用场景
- **安全性**: API密钥加密存储，保障企业数据安全
- **用户控制**: 完全由用户配置和管理，不依赖外部服务

### 1.3 目标用户

- **系统管理员**: 配置AI模型连接、管理API密钥
- **项目经理**: 使用预置提示词模板进行智能分析
- **未来扩展**: 支持普通用户使用AI辅助功能

---

## 2. 功能架构

### 2.1 模块结构

```
🤖 模型配置 (Model Config)
    ├── 模型应用管理 (AI Model Management)
    │   ├── 模型配置 CRUD
    │   ├── 当前模型选择
    │   └── 连接测试
    │
    └── 提示词模板管理 (Prompt Template Management)
        ├── 模板库管理
        ├── 变量系统
        └── 预览功能
```

### 2.2 路由设计

- **主路由**: `/model-config`（与 `/config` 并列）
- **子路由**:
  - `/model-config/application` - 模型应用管理
  - `/model-config/prompts` - 提示词模板管理

### 2.3 导航入口

左侧菜单：
```
⚙️ 参数配置
    ├── 角色管理
    ├── 风险项管理
    └── 差旅成本管理

🤖 模型配置 (新增，与参数配置并列)
    ├── 模型应用管理
    └── 提示词模板管理
```

---

## 3. 子模块1: 模型应用管理

### 3.1 功能概述

用户可以配置多个AI模型的连接信息（API Key、Host等），并从中选择一个作为当前使用的模型。系统会将用户的选择应用到所有AI功能中。

### 3.2 核心功能

#### 3.2.1 模型配置管理

**支持的AI服务商**:
- OpenAI (ChatGPT)
- Azure OpenAI
- 阿里云通义千问
- 百度文心一言
- 其他（自定义）

**可配置项**:
- 配置名称（如"OpenAI GPT-4"）
- 配置描述（备注信息）
- 服务商类型（下拉选择）
- API Key（加密存储）
- API Host/Endpoint
- 模型名称（如gpt-4, qwen-max等）
- Temperature（温度参数，0.0-2.0，默认0.7）
- Max Tokens（最大输出，默认2000）
- Timeout（超时时间，默认30秒）

#### 3.2.2 当前模型选择

**业务规则**:
- 用户可配置多个模型连接
- 同一时间只能有**一个**模型为"当前使用"
- 点击"设为当前"按钮切换当前模型
- 切换后立即生效，所有AI功能使用新模型
- 当前使用的模型在列表中标记⭐

#### 3.2.3 连接测试

**测试流程**:
1. 用户点击"测试连接"按钮
2. 系统发送测试请求到AI服务商
3. 显示测试结果：
   - ✅ 成功：显示响应时间（如1.2s）
   - ❌ 失败：显示错误原因（如"API Key无效"）
4. 记录最后测试时间和状态

### 3.3 数据结构

```typescript
interface AIModelConfig {
  id: number;
  config_name: string;       // 配置名称
  description?: string;      // 配置描述
  provider: string;          // 服务商: 'openai' | 'azure' | 'qianwen' | 'wenxin' | 'other'
  api_key: string;           // API密钥（加密存储）
  api_host: string;          // API地址
  model_name: string;        // 模型名称
  
  // 基础参数
  temperature: number;       // 默认 0.7
  max_tokens: number;        // 默认 2000
  timeout: number;           // 默认 30秒
  
  // 状态
  is_current: boolean;       // 是否当前使用
  is_active: boolean;        // 是否启用
  last_test_time?: string;   // 最后测试时间
  test_status?: string;      // 'success' | 'failed'
  
  created_at: string;
  updated_at: string;
}
```

### 3.4 页面设计

#### 列表页面

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 模型配置 > 模型应用管理                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [+ 新建模型配置]                        [🔍 搜索...]       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 配置名称     │服务商  │模型   │状态    │最后测试│操作│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │⭐OpenAI     │OpenAI  │GPT-4  │当前使用│1小时前 │[…]│  │
│  │ 通义千问     │阿里云  │qwen   │启用    │2天前   │[…]│  │
│  │ 文心一言     │百度    │ernie  │启用    │未测试  │[…]│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 表格列配置

| 列名 | 宽度 | 说明 | 排序 |
|------|------|------|------|
| 配置名称 | 25% | 显示用户自定义名称，当前使用的显示⭐ | ✅ |
| 服务商 | 15% | OpenAI/阿里云/百度等 | ✅ |
| 模型 | 15% | gpt-4/qwen-max等 | - |
| 状态 | 12% | 当前使用/启用/禁用 | - |
| 最后测试 | 15% | 相对时间（1小时前/2天前/未测试） | ✅ |
| 操作 | 18% | 编辑/测试/设为当前/删除 | - |

#### 新建/编辑表单

```
┌────────────────────────────────────────────┐
│  新建AI模型配置                             │
├────────────────────────────────────────────┤
│                                             │
│  📋 基础信息                                │
│  ┌────────────────────────────────────────┐│
│  │ 配置名称*: [OpenAI GPT-4__________]   ││
│  │ 配置描述:  [生产环境使用__________]   ││
│  └────────────────────────────────────────┘│
│                                             │
│  🔌 服务配置                                │
│  ┌────────────────────────────────────────┐│
│  │ 服务商*:   [OpenAI ▼]                 ││
│  │             • OpenAI                   ││
│  │             • Azure OpenAI             ││
│  │             • 阿里云-通义千问          ││
│  │             • 百度-文心一言            ││
│  │             • 其他                     ││
│  │                                        ││
│  │ API Key*:  [sk-xxxxxxxxxxxxx______]   ││
│  │            [显示/隐藏]                 ││
│  │                                        ││
│  │ API Host*: [https://api.openai.com]   ││
│  │                                        ││
│  │ 模型名称*: [gpt-4 ▼]                  ││
│  │             • gpt-4                    ││
│  │             • gpt-3.5-turbo            ││
│  │             • gpt-4-turbo              ││
│  └────────────────────────────────────────┘│
│                                             │
│  ⚙️ 基础参数                                │
│  ┌────────────────────────────────────────┐│
│  │ Temperature: [0.7____] (0.0-2.0)      ││
│  │ 💡 控制输出随机性，越高越创造性         ││
│  │                                        ││
│  │ Max Tokens:  [2000___]                ││
│  │ 💡 最大输出长度                        ││
│  │                                        ││
│  │ Timeout:     [30_____] 秒             ││
│  │ 💡 请求超时时间                        ││
│  └────────────────────────────────────────┘│
│                                             │
│  🔍 连接测试                                │
│  ┌────────────────────────────────────────┐│
│  │ [测试连接]                             ││
│  │                                        ││
│  │ ✅ 连接成功 (响应时间: 1.2s)          ││
│  │ 或                                     ││
│  │ ❌ 连接失败: API Key无效               ││
│  └────────────────────────────────────────┘│
│                                             │
│  [取消]                          [保存]    │
└────────────────────────────────────────────┘
```

### 3.5 交互逻辑

#### 3.5.1 新建配置

1. 点击"+ 新建模型配置"
2. 填写表单（必填项标*）
3. 可选：点击"测试连接"验证配置
4. 点击"保存"
5. 提示"配置创建成功"
6. 返回列表页面

**验证规则**:
- 配置名称：必填，最多50字符
- API Key：必填
- API Host：必填，需符合URL格式
- 模型名称：必填
- Temperature：0.0-2.0
- Max Tokens：1-10000
- Timeout：5-300秒

#### 3.5.2 设为当前

1. 点击"设为当前"按钮
2. 显示确认对话框："切换当前模型为 [配置名称]？"
3. 确认后：
   - 将原当前模型的`is_current`设为false
   - 将新模型的`is_current`设为true
   - 刷新列表，新模型显示⭐标记
4. 提示"已切换当前模型"

#### 3.5.3 测试连接

**表单内测试**:
- 用户填写配置后，点击"测试连接"
- 不保存数据，仅验证连接
- 显示测试结果

**列表操作测试**:
- 点击操作栏的"测试"链接
- 使用已保存的配置进行测试
- 更新`last_test_time`和`test_status`

#### 3.5.4 删除配置

**限制**:
- 当前使用的模型不能删除
- 提示："请先切换到其他模型"

**流程**:
1. 点击"删除"
2. 二次确认："确定删除 [配置名称]？删除后无法恢复。"
3. 确认后删除
4. 提示"删除成功"

### 3.6 API接口

```
GET    /api/config/ai-models              # 获取模型列表
GET    /api/config/ai-models/:id          # 获取配置详情
GET    /api/config/ai-models/current      # 获取当前使用的模型
POST   /api/config/ai-models              # 创建配置
PUT    /api/config/ai-models/:id          # 更新配置
DELETE /api/config/ai-models/:id          # 删除配置
POST   /api/config/ai-models/:id/test     # 测试连接
POST   /api/config/ai-models/:id/set-current # 设为当前使用
```

---

## 4. 子模块2: 提示词模板管理

### 4.1 功能概述

管理AI功能使用的提示词模板。系统预置常用模板（如风险分析、成本估算），用户也可以创建自定义模板。模板支持变量占位符，运行时动态替换。

### 4.2 核心功能

#### 4.2.1 提示词模板库

**模板分类**:
- 风险分析 (risk_analysis)
- 成本估算 (cost_estimation)
- 报告生成 (report_generation)
- 自定义 (custom)

**模板类型**:
- **系统预置**: 不可删除，可以禁用
- **用户自定义**: 可编辑、删除

#### 4.2.2 提示词编辑

**提示词组成**:

1. **System Prompt（系统提示词）**
   - 定义AI的角色和任务
   - 例如："你是一个资深的项目风险评估专家..."

2. **User Prompt Template（用户提示词模板）**
   - 包含变量占位符，如`{project_name}`、`{risk_score}`
   - 运行时替换为实际值

**变量系统**:
- 变量格式：`{variable_name}`
- 每个变量包含：
  - 名称（如project_name）
  - 描述（如"项目名称"）
  - 示例值（如"电商平台升级"）
  - 是否必填

#### 4.2.3 模板预览

**功能**:
- 填入测试数据
- 实时预览生成的完整提示词
- 查看变量替换效果

### 4.3 数据结构

```typescript
interface PromptTemplate {
  id: number;
  template_name: string;      // 模板名称
  category: string;           // 分类
  description?: string;       // 模板描述
  
  system_prompt: string;      // 系统提示词
  user_prompt_template: string; // 用户提示词模板
  
  variables: Array<{          // 变量定义
    name: string;             // 变量名
    description: string;      // 说明
    example: string;          // 示例
    required: boolean;        // 是否必填
  }>;
  
  is_system: boolean;         // 是否系统预置
  is_active: boolean;         // 是否启用
  created_at: string;
  updated_at: string;
}
```

### 4.4 页面设计

#### 列表页面

```
┌─────────────────────────────────────────────────────────┐
│  💬 模型配置 > 提示词模板管理                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [+ 新建模板] [📚 系统预置] [👤 我的模板] [🔍 搜索...] │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 模板名称      │ 分类      │类型│变量数│状态│操作│    │
│  ├────────────────────────────────────────────────┤    │
│  │ 项目风险分析  │风险分析   │系统│  5   │启用│[…]│    │
│  │ 项目成本分析  │成本估算   │系统│  6   │启用│[…]│    │
│  │ 我的分析模板  │自定义     │用户│  3   │启用│[…]│    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 表格列配置

| 列名 | 宽度 | 说明 |
|------|------|------|
| 模板名称 | 30% | 模板的名称 |
| 分类 | 20% | 风险分析/成本估算/自定义等 |
| 类型 | 12% | 系统/用户 |
| 变量数 | 12% | 包含的变量数量 |
| 状态 | 10% | 启用/禁用 |
| 操作 | 16% | 查看/编辑/复制/删除/预览 |

#### 编辑器页面

```
┌───────────────────────────────────────────────────────┐
│  编辑提示词模板                                        │
├───────────────────────────────────────────────────────┤
│                                                        │
│  📋 基础信息                                           │
│  ┌──────────────────────────────────────────────┐    │
│  │ 模板名称*: [项目风险分析_______________]     │    │
│  │ 分类*:     [风险分析 ▼]                      │    │
│  │            • 风险分析                         │    │
│  │            • 成本估算                         │    │
│  │            • 报告生成                         │    │
│  │            • 自定义                           │    │
│  │ 描述:      [基于项目数据生成风险分析______]  │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  🤖 系统提示词 (System Prompt)                         │
│  ┌──────────────────────────────────────────────┐    │
│  │ 你是一个专业的项目风险分析专家，拥有15年   │    │
│  │ 的项目管理经验。请基于提供的项目信息，给   │    │
│  │ 出详细的风险分析和建议。                    │    │
│  │                                              │    │
│  │ [展开 ▼]                                     │    │
│  └──────────────────────────────────────────────┘    │
│  💡 定义AI的角色、专业领域和任务目标                   │
│                                                        │
│  👤 用户提示词模板 (User Prompt Template)              │
│  💡 使用 {变量名} 格式插入变量，点击变量快速插入       │
│  ┌──────────────────────────────────────────────┐    │
│  │ 项目基本信息:                                │    │
│  │ - 项目名称: {project_name}                   │    │
│  │ - 项目描述: {project_description}            │    │
│  │ - 风险总分: {risk_score} / 200               │    │
│  │ - 风险等级: {risk_level}                     │    │
│  │                                              │    │
│  │ 详细风险评分:                                │    │
│  │ {risk_details}                               │    │
│  │                                              │    │
│  │ 请提供:                                      │    │
│  │ 1. 识别出的TOP 3主要风险点                  │    │
│  │ 2. 每个风险点的影响分析                     │    │
│  │ 3. 针对性的缓解措施（至少3条）              │    │
│  │ 4. 风险优先级排序                           │    │
│  │                                              │    │
│  │ [展开 ▼] [全屏编辑]                         │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  🏷️ 变量定义                                          │
│  ┌──────────────────────────────────────────────┐    │
│  │ 变量名              │说明    │必填│操作      │    │
│  ├──────────────────────────────────────────────┤    │
│  │ project_name        │项目名称│ ✓ │[编辑][×]│    │
│  │ project_description │项目描述│   │[编辑][×]│    │
│  │ risk_score          │风险总分│ ✓ │[编辑][×]│    │
│  │ risk_level          │风险等级│ ✓ │[编辑][×]│    │
│  │ risk_details        │风险详情│ ✓ │[编辑][×]│    │
│  └──────────────────────────────────────────────┘    │
│  [+ 添加变量]                                          │
│                                                        │
│  [预览]  [取消]                            [保存]     │
└───────────────────────────────────────────────────────┘
```

#### 变量编辑对话框

```
┌─────────────────────────────────┐
│  编辑变量                        │
├─────────────────────────────────┤
│                                  │
│  变量名*:   [project_name____]  │
│  💡 变量名只能包含字母、数字、下划线 │
│                                  │
│  显示名称*: [项目名称________]  │
│                                  │
│  描述:      [项目的名称______]  │
│                                  │
│  示例值:    [电商平台升级____]  │
│  💡 帮助用户理解变量的含义      │
│                                  │
│  □ 必填                          │
│                                  │
│  [取消]              [确定]     │
└─────────────────────────────────┘
```

#### 预览对话框

```
┌──────────────────────────────────────────────┐
│  预览提示词                                   │
├──────────────────────────────────────────────┤
│                                               │
│  📝 填入测试数据                              │
│  ┌────────────────────────────────────────┐  │
│  │ project_name: [电商平台升级_______]   │  │
│  │ risk_score:   [85_________________]   │  │
│  │ risk_level:   [中风险_____________]   │  │
│  │ risk_details: [{"需求明确度":8}___]   │  │
│  │ ...                                    │  │
│  └────────────────────────────────────────┘  │
│  [生成预览]                                   │
│                                               │
│  📄 生成的完整提示词                          │
│  ┌────────────────────────────────────────┐  │
│  │ System: 你是一个专业的项目风险分析专家 │  │
│  │                                        │  │
│  │ User: 项目基本信息:                   │  │
│  │ - 项目名称: 电商平台升级              │  │
│  │ - 风险总分: 85 / 200                  │  │
│  │ - 风险等级: 中风险                    │  │
│  │ ...                                    │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  [复制]  [关闭]                              │
└──────────────────────────────────────────────┘
```

### 4.5 交互逻辑

#### 4.5.1 新建模板

1. 点击"+ 新建模板"
2. 填写基础信息
3. 编写系统提示词
4. 编写用户提示词模板
5. 添加变量定义
6. 点击"预览"测试效果（可选）
7. 点击"保存"

**智能提示**:
- 输入`{`时，自动弹出变量列表供选择
- 检测未定义的变量，提示添加定义

#### 4.5.2 变量管理

**添加变量**:
1. 在用户提示词中输入`{new_var}`
2. 系统检测到新变量，提示"检测到未定义变量，是否添加？"
3. 点击"添加"，打开变量编辑对话框
4. 填写变量信息并保存

**编辑变量**:
- 在变量列表中点击"编辑"
- 修改变量信息
- 保存后更新

**删除变量**:
- 点击"×"删除变量
- 如果模板中仍使用该变量，提示警告

#### 4.5.3 预览功能

1. 点击"预览"按钮
2. 弹出预览对话框
3. 为每个必填变量填入测试值
4. 点击"生成预览"
5. 显示替换变量后的完整提示词
6. 可复制预览结果

#### 4.5.4 复制模板

**用途**: 基于现有模板快速创建新模板

**流程**:
1. 点击"复制"
2. 复制所有内容（除ID）
3. 模板名称自动添加"(副本)"
4. 进入编辑页面
5. 修改后保存

### 4.6 系统预置模板

#### 模板1: 项目风险分析

```yaml
template_name: 项目风险分析
category: risk_analysis
description: 基于风险评分数据，生成专业的风险分析报告

system_prompt: |
  你是一个资深的软件项目风险评估专家，拥有15年项目管理经验。
  你的任务是基于项目的风险评分数据，提供专业的风险分析和缓解建议。
  请用结构化、清晰的方式呈现分析结果。

user_prompt_template: |
  项目基本信息:
  - 项目名称: {project_name}
  - 项目描述: {project_description}
  - 风险总分: {risk_score} / 200
  - 风险等级: {risk_level}
  
  详细风险评分:
  {risk_details}
  
  请提供:
  1. 识别出的TOP 3主要风险点
  2. 每个风险点的影响分析
  3. 针对性的缓解措施（至少3条）
  4. 风险优先级排序

variables:
  - name: project_name
    description: 项目名称
    example: 电商平台升级项目
    required: true
  - name: project_description
    description: 项目描述
    example: 对现有电商平台进行架构升级
    required: false
  - name: risk_score
    description: 风险总分
    example: 85
    required: true
  - name: risk_level
    description: 风险等级
    example: 中风险
    required: true
  - name: risk_details
    description: 详细风险评分数据（JSON格式）
    example: '{"需求明确度": 8, "技术难度": 10}'
    required: true
```

#### 模板2: 项目成本分析

```yaml
template_name: 项目成本分析
category: cost_estimation
description: 评估项目成本构成的合理性，提供优化建议

system_prompt: |
  你是一个IT项目成本评估专家，熟悉各类软件项目的成本构成。
  你需要基于项目的成本数据，评估其合理性并提供优化建议。

user_prompt_template: |
  项目成本明细:
  - 研发成本: {development_cost} 万元
  - 对接成本: {integration_cost} 万元
  - 运维成本: {maintenance_cost} 万元
  - 风险成本: {risk_cost} 万元
  - 总成本: {total_cost} 万元
  
  项目规模:
  - 总工作量: {total_workdays} 人天
  
  请分析:
  1. 成本构成是否合理
  2. 是否存在成本过高或过低的项
  3. 优化建议（至少2条）

variables:
  - name: development_cost
    description: 研发成本（万元）
    example: 125.5
    required: true
  - name: integration_cost
    description: 系统对接成本（万元）
    example: 35.2
    required: true
  - name: maintenance_cost
    description: 运维成本（万元）
    example: 9.0
    required: true
  - name: risk_cost
    description: 风险成本（万元）
    example: 5.0
    required: true
  - name: total_cost
    description: 总成本（万元）
    example: 174.7
    required: true
  - name: total_workdays
    description: 总工作量（人天）
    example: 180
    required: true
```

### 4.7 API接口

```
GET    /api/config/prompts                # 获取模板列表
GET    /api/config/prompts/:id            # 获取模板详情
GET    /api/config/prompts/system         # 获取系统预置模板
POST   /api/config/prompts                # 创建模板
PUT    /api/config/prompts/:id            # 更新模板
DELETE /api/config/prompts/:id            # 删除模板（仅用户创建）
POST   /api/config/prompts/:id/preview    # 预览模板（填充变量）
POST   /api/config/prompts/:id/copy       # 复制模板
```

---

## 5. 数据库设计

### 5.1 表1: ai_model_configs

```sql
CREATE TABLE ai_model_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_name TEXT NOT NULL,           -- 配置名称
  description TEXT,                    -- 配置描述
  provider TEXT NOT NULL,              -- 服务商
  api_key TEXT NOT NULL,               -- API密钥（加密存储）
  api_host TEXT NOT NULL,              -- API地址
  model_name TEXT NOT NULL,            -- 模型名称
  
  -- 基础参数
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  timeout INTEGER DEFAULT 30,
  
  -- 状态
  is_current BOOLEAN DEFAULT 0,        -- 是否当前使用
  is_active BOOLEAN DEFAULT 1,         -- 是否启用
  last_test_time DATETIME,             -- 最后测试时间
  test_status TEXT,                    -- 测试状态
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 确保只有一个当前使用的模型
CREATE UNIQUE INDEX idx_current_model 
  ON ai_model_configs(is_current) 
  WHERE is_current = 1;

-- 配置名称索引
CREATE INDEX idx_config_name 
  ON ai_model_configs(config_name);
```

### 5.2 表2: prompt_templates

```sql
CREATE TABLE prompt_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL,         -- 模板名称
  category TEXT NOT NULL,              -- 分类
  description TEXT,                    -- 模板描述
  
  system_prompt TEXT NOT NULL,         -- 系统提示词
  user_prompt_template TEXT NOT NULL,  -- 用户提示词模板
  
  variables_json TEXT,                 -- 变量定义（JSON）
  /*
    [
      {
        "name": "project_name",
        "description": "项目名称",
        "example": "项目A",
        "required": true
      }
    ]
  */
  
  is_system BOOLEAN DEFAULT 0,         -- 是否系统预置
  is_active BOOLEAN DEFAULT 1,         -- 是否启用
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_prompt_category 
  ON prompt_templates(category);

CREATE INDEX idx_prompt_active 
  ON prompt_templates(is_active);

CREATE INDEX idx_prompt_system 
  ON prompt_templates(is_system);
```

### 5.3 数据迁移脚本

**位置**: `server/migrations/`

```javascript
// 001_create_ai_model_configs.js
// 002_create_prompt_templates.js
// 003_seed_system_prompts.js
```

---

## 6. 安全性设计

### 6.1 API密钥加密

**加密方案**:
- 使用AES-256-CBC加密
- 密钥存储在环境变量中（不提交到代码仓库）
- 加密后存储到数据库

**实现**:
```javascript
// server/utils/encryption.js
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY; // 32字节
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', 
    Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', 
    Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### 6.2 前端脱敏显示

**API Key显示**:
- 列表：显示为`sk-***...***abc`（前后各显示3个字符）
- 编辑表单：可切换"显示/隐藏"
- 测试日志：不记录完整Key

### 6.3 权限控制

**访问权限**:
- 仅管理员可访问模型配置模块
- 普通用户可查看系统预置模板（只读）

---

## 7. 实现优先级

### P0 (第一期 - MVP) - 必须实现

**模型应用管理**:
- ✅ 基础CRUD功能
- ✅ 设置当前使用模型
- ✅ 连接测试功能
- ✅ API密钥加密存储

**提示词模板管理**:
- ✅ 基础CRUD功能
- ✅ 2个系统预置模板（风险分析、成本分析）
- ✅ 变量定义和管理

**预计工期**: 8-10天

### P1 (第二期 - 增强) - 重要

**模型应用管理**:
- 模型配置导入/导出
- 连接测试历史记录
- 批量管理功能

**提示词模板管理**:
- 预览功能（变量替换）
- 模板复制功能
- 变量智能提示

**预计工期**: 5-7天

### P2 (第三期 - 优化) - 可选

**模型应用管理**:
- 使用统计（调用次数、成功率）
- 成本追踪（Token消耗）
- 多模型对比

**提示词模板管理**:
- 实际调用AI测试模板
- 模板版本管理
- 模板分享功能

**预计工期**: 7-10天

---

## 8. 技术实现要点

### 8.1 前端技术栈

- **框架**: React + UMI Max
- **UI组件**: Ant Design Pro (ProTable, ProForm)
- **状态管理**: UMI内置model
- **数据请求**: UMI request (基于axios)

### 8.2 后端技术栈

- **运行时**: Node.js + Express
- **数据库**: SQLite3
- **加密**: crypto (Node.js内置)

### 8.3 关键组件

**前端**:
- `AIModelList` - 模型列表组件
- `AIModelForm` - 模型配置表单
- `PromptTemplateList` - 模板列表
- `PromptTemplateEditor` - 模板编辑器
- `VariableManager` - 变量管理器
- `PromptPreview` - 预览对话框

**后端**:
- `modelConfigController.js` - 模型配置控制器
- `promptTemplateController.js` - 模板控制器
- `aiTestService.js` - AI连接测试服务
- `encryptionUtil.js` - 加密工具

### 8.4 文件结构

```
frontend/ppa_frontend/src/
  pages/
    ModelConfig/                 # 模型配置模块（独立目录）
      Application/
        index.tsx                # 模型应用管理主页
        components/
          ModelList.tsx          # 模型列表
          ModelForm.tsx          # 模型表单
          TestConnection.tsx     # 测试连接组件
      Prompts/
        index.tsx                # 提示词管理主页
        components/
          PromptList.tsx         # 模板列表
          PromptEditor.tsx       # 模板编辑器
          VariableEditor.tsx     # 变量编辑器
          PreviewModal.tsx       # 预览对话框
  services/
    aiModel.ts                   # 模型API服务
    promptTemplate.ts            # 模板API服务

server/
  controllers/
    aiModelController.js         # 模型配置控制器
    promptTemplateController.js  # 模板控制器
  services/
    aiTestService.js             # AI测试服务
  utils/
    encryption.js                # 加密工具
  migrations/
    001_create_ai_model_configs.js
    002_create_prompt_templates.js
    003_seed_system_prompts.js
```

---

## 9. 测试计划

### 9.1 功能测试

**模型应用管理**:
- ✅ 创建配置（各服务商）
- ✅ 编辑配置
- ✅ 删除配置（含限制测试）
- ✅ 设置当前模型（唯一性）
- ✅ 连接测试（成功/失败场景）
- ✅ API Key加密/解密

**提示词模板管理**:
- ✅ 创建模板
- ✅ 编辑模板
- ✅ 删除模板（系统/用户）
- ✅ 变量管理（增删改）
- ✅ 预览功能
- ✅ 模板复制

### 9.2 安全测试

- ✅ API Key加密存储
- ✅ 前端脱敏显示
- ✅ SQL注入防护
- ✅ XSS防护
- ✅ CSRF防护

### 9.3 性能测试

- ✅ 列表加载性能（100+记录）
- ✅ 编辑器响应速度
- ✅ 预览生成速度
- ✅ 连接测试超时处理

### 9.4 兼容性测试

- ✅ Chrome（推荐）
- ✅ Edge
- ✅ Safari
- ✅ Firefox

---

## 10. 用户文档

### 10.1 快速开始指南

**配置第一个AI模型**:
1. 访问"模型配置" → "模型应用管理"
2. 点击"+ 新建模型配置"
3. 填写配置信息（以OpenAI为例）：
   - 配置名称：OpenAI GPT-4
   - 服务商：OpenAI
   - API Key：从OpenAI官网获取
   - API Host：https://api.openai.com
   - 模型名称：gpt-4
4. 点击"测试连接"验证配置
5. 保存后，点击"设为当前"

**使用提示词模板**:
1. 访问"模型配置" → "提示词模板管理"
2. 查看系统预置的"项目风险分析"模板
3. 点击"预览"
4. 填入测试数据
5. 查看生成的完整提示词

### 10.2 常见问题 (FAQ)

**Q: 为什么需要配置AI模型？**
A: 系统使用AI提供智能分析功能（如风险分析、成本优化建议）。您需要提供自己的AI服务商账号，确保数据安全和费用可控。

**Q: 支持哪些AI服务商？**
A: 目前支持OpenAI、Azure OpenAI、阿里云通义千问、百度文心一言等主流服务商。

**Q: API Key会泄露吗？**
A: 不会。API Key使用AES-256加密存储，前端仅显示脱敏信息（如sk-***...***abc）。

**Q: 可以同时使用多个模型吗？**
A: 可以配置多个模型，但同一时间只能有一个"当前使用"模型。您可以随时切换。

**Q: 系统预置模板可以修改吗？**
A: 系统预置模板不可修改，但您可以复制后创建自定义版本。

**Q: 如何创建自定义提示词模板？**
A: 访问"提示词模板管理" → 点击"+ 新建模板" → 编写系统提示词和用户提示词 → 定义变量 → 保存。

---

## 11. 验收标准

### 11.1 功能完整性

- ✅ 模型应用管理的所有P0功能已实现
- ✅ 提示词模板管理的所有P0功能已实现
- ✅ 2个系统预置模板已内置
- ✅ API接口完整且符合RESTful规范
- ✅ 数据库表结构完整

### 11.2 用户体验

- ✅ 界面简洁直观，符合Ant Design规范
- ✅ 表单验证即时反馈
- ✅ 操作成功/失败有明确提示
- ✅ 关键操作有二次确认
- ✅ 空状态有友好提示

### 11.3 性能标准

- ✅ 列表加载 < 1秒
- ✅ 表单提交响应 < 2秒
- ✅ 连接测试超时设置合理（30秒）
- ✅ 编辑器输入无卡顿

### 11.4 安全标准

- ✅ API Key加密存储
- ✅ 前端脱敏显示
- ✅ 无SQL注入风险
- ✅ 无XSS风险

### 11.5 文档完整性

- ✅ 用户操作手册
- ✅ API接口文档
- ✅ 数据库设计文档
- ✅ FAQ常见问题

---

## 12. 后续规划

### 12.1 功能扩展

**短期（1-3个月）**:
- AI驱动的风险分析功能
- AI驱动的成本优化建议
- 报告自动生成

**中期（3-6个月）**:
- 对话式项目评估助手
- 多模型对比分析
- 模板市场（分享模板）

**长期（6-12个月）**:
- 模型Fine-tuning支持
- 本地模型部署支持
- 多语言AI支持

### 12.2 性能优化

- 模板缓存机制
- 批量操作优化
- 大规模变量处理优化

### 12.3 用户体验优化

- 模板推荐系统
- 智能变量提取
- 可视化配置向导

---

**文档结束**

**修订历史**:
- v1.0 (2025-10-21): 初始版本，定义核心功能和实现计划
