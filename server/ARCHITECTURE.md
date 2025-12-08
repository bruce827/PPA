# Express.js 后端架构设计详解

## 一、整体架构概览

```text
┌─────────────────────────────────────────────────────────────┐
│                    Express.js 应用层                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Routes    │→ │ Controllers  │→ │    Services      │  │
│  │ (路由定义)   │  │ (请求处理)    │  │ (业务逻辑)        │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│         ↓                  ↓                  ↓             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Models (数据访问层)                      │  │
│  │         SQLite 数据库操作 + AI提供商集成               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 二、各层详细设计

### 1. 入口层 ([`server/index.js`](server/index.js:1))

**核心职责**：

- Express应用初始化
- 中间件注册（JSON解析、路由挂载）
- 全局错误处理中间件
- 数据库连接管理
- 优雅退出处理

**关键代码**：

```javascript
app.use(express.json({ limit: '1mb' }));
app.use(allRoutes);           // 挂载所有路由
app.use(errorHandler);        // 全局错误处理（必须最后挂载）
```

### 2. 路由层 ([`server/routes/`](server/routes/))

**设计模式**：按功能模块划分路由文件

**主要路由文件**：

- [`index.js`](server/routes/index.js:1) - 路由总入口，统一挂载各模块
- [`ai.js`](server/routes/ai.js:1) - AI相关API（风险评估、模块分析、工作量评估）
- [`projects.js`](server/routes/projects.js:1) - 项目管理API（CRUD、导出、模板）
- [`calculation.js`](server/routes/calculation.js:1) - 实时计算API
- [`config.js`](server/routes/config.js:1) - 配置管理API
- [`dashboard.js`](server/routes/dashboard.js:1) - 仪表板数据API
- [`health.js`](server/routes/health.js:1) - 健康检查API

**统一规范**：

- 所有API路径以 `/api` 为前缀
- 路由文件只定义HTTP方法和路径，不处理业务逻辑
- 通过 `router.use()` 实现模块化挂载

### 3. 控制器层 ([`server/controllers/`](server/controllers/))

**设计模式**：每个路由文件对应一个控制器

**核心职责**：

- 接收HTTP请求，提取参数
- 调用服务层处理业务逻辑
- 统一响应格式（`{success: true, data: ...}`）
- 请求日志记录（包括性能监控）
- 错误处理和传递给错误中间件

**典型控制器示例**（[`aiController.js`](server/controllers/aiController.js:75)）：

```javascript
async function assessRisk(req, res, next) {
  const startedAt = Date.now();
  const { promptId, document } = req.body || {};

  try {
    const result = await aiRiskAssessmentService.assessRisk(req.body || {});
    const durationMs = Date.now() - startedAt;

    logger.info('AI 风险评估成功', {
      route: 'POST /api/ai/assess-risk',
      promptId,
      durationMs,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    // 错误日志记录
    logger.error('AI 风险评估失败', { ... });
    // 传递给错误处理中间件
    next(error.statusCode ? error : internalError('AI 风险评估失败'));
  }
}
```

**控制器规范**：

- 所有异步操作使用 `try-catch` 包裹
- 记录详细的请求/响应日志（包含执行时间）
- 错误统一通过 `next(error)` 传递给中间件
- 支持性能监控（记录 `durationMs`）

### 4. 服务层 ([`server/services/`](server/services/))

**设计模式**：按业务功能划分服务

**核心服务**：

- [`aiRiskAssessmentService.js`](server/services/aiRiskAssessmentService.js:1) - AI风险评估核心逻辑
- [`aiModuleAnalysisService.js`](server/services/aiModuleAnalysisService.js:1) - 项目模块分析
- [`aiWorkloadEvaluationService.js`](server/services/aiWorkloadEvaluationService.js:1) - 工作量评估
- [`projectService.js`](server/services/projectService.js:1) - 项目业务逻辑
- [`calculationService.js`](server/services/calculationService.js:1) - 计算逻辑
- [`aiPromptService.js`](server/services/aiPromptService.js:1) - AI提示词管理
- [`aiFileLogger.js`](server/services/aiFileLogger.js:1) - AI调用文件日志

**服务层特点**：

1. **复杂的业务逻辑处理**：
   - 输入验证（`validatePayload()`）
   - 模板变量替换（`applyTemplate()`）
   - AI提供商选择和调用
   - 响应解析和标准化

2. **AI集成抽象**：

   ```javascript
   // 动态选择AI提供商
   const providerCall = selectedProvider.includes('doubao')
     ? doubaoProvider.createRiskAssessment(...)
     : openaiProvider.createRiskAssessment(...);
   ```

3. **超时控制**：

   ```javascript
   const providerResult = await Promise.race([
     providerCall,
     new Promise((_, reject) => {
       setTimeout(() => reject(timeoutError('AI 调用超时')), serviceTimeoutMs);
     }),
   ]);
   ```

4. **详细的日志记录**：
   - 数据库日志（`ai_assessment_logs`表）
   - 文件日志（JSON格式，包含完整请求/响应）
   - 应用日志（结构化日志）

### 5. 模型层 ([`server/models/`](server/models/) & [`server/providers/`](server/providers/))

**数据模型**（`server/models/`）：

- [`projectModel.js`](server/models/projectModel.js:1) - 项目数据操作
- [`aiModelModel.js`](server/models/aiModelModel.js:1) - AI模型配置
- [`promptTemplateModel.js`](server/models/promptTemplateModel.js:1) - 提示词模板
- [`aiAssessmentLogModel.js`](server/models/aiAssessmentLogModel.js:1) - AI评估日志
- [`configModel.js`](server/models/configModel.js:1) - 系统配置

**AI提供商**（`server/providers/ai/`）：

- [`openaiProvider.js`](server/providers/ai/openaiProvider.js:1) - OpenAI API封装
- [`doubaoProvider.js`](server/providers/ai/doubaoProvider.js:1) - 豆包API封装

**数据库设计特点**：

- 使用SQLite文件数据库
- 复杂字段使用JSON存储（如`assessment_details_json`）
- 自动建表和迁移（`migrations/`目录）

### 6. 中间件层 ([`server/middleware/`](server/middleware/))

**全局错误处理**（[`errorHandler.js`](server/middleware/errorHandler.js:1)）：

```javascript
const errorHandler = (err, req, res, next) => {
  // 数据库错误
  if (err.code === 'SQLITE_ERROR') {
    return res.status(500).json({
      success: false,
      error: 'Database error',
      message: err.message
    });
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({...});
  }

  // 默认错误
  res.status(err.statusCode || 500).json({...});
};
```

## 三、架构优势

### 1. **清晰的分层职责**

- **路由层**：HTTP协议处理
- **控制器层**：请求/响应格式化
- **服务层**：核心业务逻辑
- **模型层**：数据访问和外部API集成

### 2. **完善的错误处理**

- 分层错误捕获和传递
- 统一的错误响应格式
- 详细的错误日志记录

### 3. **强大的可观测性**

- 请求/响应完整日志
- 性能监控（执行时间统计）
- AI调用追踪（文件日志 + 数据库日志）
- 多层级日志（应用日志、文件日志、数据库日志）

### 4. **灵活的配置管理**

- AI模型动态切换（OpenAI/豆包）
- 超时时间可配置
- 提示词模板化管理

### 5. **高可测试性**

- 各层独立，便于单元测试
- 服务层纯业务逻辑，易于Mock
- 统一的数据库测试环境（`NODE_ENV=test`）

## 四、关键设计模式

1. **依赖注入**：服务层通过`require`引入依赖
2. **策略模式**：动态选择AI提供商
3. **模板方法**：统一的AI调用流程
4. **观察者模式**：日志记录和监控
5. **中间件模式**：Express中间件链

这个架构设计体现了企业级后端应用的**高内聚、低耦合**原则，特别适合AI集成场景下的复杂业务需求。

## 五、性能优化特性

- **响应时间监控**：所有API端点响应时间必须 < 500ms
- **连接池管理**：SQLite数据库连接的初始化和关闭
- **超时控制**：AI调用超时保护机制
- **内存限制**：JSON请求体大小限制（1mb）
- **优雅退出**：SIGINT信号处理，确保资源释放

## 六、AI集成架构特点

1. **多提供商支持**：OpenAI、豆包等AI提供商统一接口
2. **提示词模板化**：变量替换和模板管理
3. **响应解析弹性**：支持多种AI响应格式自动解析
4. **调用追踪完整**：请求/响应完整日志和统计
5. **错误恢复机制**：超时重试和降级策略

## 七、测试架构

- **Jest测试框架**：单元测试和集成测试
- **独立测试数据库**：`ppa.test.db`避免影响生产数据
- **API测试**：Supertest进行HTTP接口测试
- **性能测试**：响应时间断言（< 500ms）
- **环境隔离**：`NODE_ENV=test`环境变量区分

## 八、部署与运维

- **单一应用架构**：无分布式复杂性
- **SQLite文件数据库**：零配置部署
- **环境变量配置**：灵活的运行时配置
- **日志分层**：应用日志、文件日志、数据库日志
- **健康检查**：服务状态监控接口
