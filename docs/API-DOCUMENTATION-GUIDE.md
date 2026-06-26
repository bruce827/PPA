# PPA API文档维护指南

## 📋 目录

1. [概述](#概述)
2. [文档架构](#文档架构)
3. [Swagger配置](#swagger配置)
4. [添加新API文档](#添加新api文档)
5. [更新现有文档](#更新现有文档)
6. [数据模型管理](#数据模型管理)
7. [团队协作流程](#团队协作流程)
8. [自动化工具](#自动化工具)
9. [最佳实践](#最佳实践)
10. [常见问题](#常见问题)

## 概述

PPA项目使用Swagger/OpenAPI 3.0规范来维护后端API文档。本文档指南旨在帮助开发团队高效地创建、维护和更新API文档，确保文档与代码保持同步。

### 文档目标

- **完整性**: 覆盖所有API端点
- **准确性**: 与实际API行为一致
- **可维护性**: 易于更新和扩展
- **用户友好**: 便于前端开发者和测试人员使用

### 技术栈

- **规范**: OpenAPI 3.0
- **工具**: swagger-jsdoc + swagger-ui-express
- **格式**: JSDoc注释 + YAML配置
- **托管**: 内嵌在Express应用中

## 文档架构

### 目录结构

```
PPA/
├── server/
│   ├── swagger/
│   │   ├── index.js              # Swagger配置主文件
│   │   ├── README.md             # Swagger使用说明
│   │   └── examples/             # 注释示例
│   │       └── config-swagger.js # 配置路由示例
│   ├── routes/
│   │   ├── health.js             # 健康检查路由（含Swagger注释）
│   │   ├── config.js             # 配置路由
│   │   ├── projects.js           # 项目路由
│   │   ├── ai.js                 # AI路由
│   │   └── ...                   # 其他路由
│   ├── controllers/
│   │   └── ...                   # 控制器（可选注释）
│   ├── models/
│   │   └── ...                   # 数据模型（可选注释）
│   └── package.json              # 依赖配置
├── docs/
│   ├── API-DOCUMENTATION-GUIDE.md # 本文档
│   ├── PRD.md                    # 产品需求文档
│   └── ...                       # 其他文档
└── AGENTS.md                     # 项目指南
```

### 文件职责

| 文件 | 职责 | 维护频率 |
|------|------|----------|
| `swagger/index.js` | Swagger配置、数据模型定义 | 低频（架构变更时） |
| `routes/*.js` | API端点定义和JSDoc注释 | 高频（每次API变更） |
| `swagger/examples/` | 注释示例和参考 | 低频（新增示例时） |
| `docs/API-DOCUMENTATION-GUIDE.md` | 维护指南 | 低频（流程变更时） |

## Swagger配置

### 主配置文件 (`swagger/index.js`)

主要配置部分：

```javascript
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PPA 项目评估系统 API',
      version: '1.0.0',
      description: 'API文档描述',
      contact: { name: '团队名称', email: 'team@example.com' },
      license: { name: 'ISC', url: 'https://opensource.org/licenses/ISC' }
    },
    servers: [
      { url: 'http://localhost:3001', description: '开发环境' },
      { url: 'https://api.ppa.com', description: '生产环境' }
    ],
    tags: [
      { name: '健康检查', description: '系统状态检查' },
      { name: '配置管理', description: '系统配置管理' },
      // ... 其他标签
    ],
    components: {
      schemas: {
        // 数据模型定义
        ApiResponse: { /* ... */ },
        Project: { /* ... */ },
        Role: { /* ... */ },
        // ... 其他模型
      }
    }
  },
  apis: [
    './routes/*.js',      // 路由文件中的JSDoc注释
    './controllers/*.js', // 控制器文件（可选）
    './models/*.js'       // 模型文件（可选）
  ]
};
```

### 配置更新流程

1. **添加新标签**: 在 `tags` 数组中添加新标签
2. **添加新模型**: 在 `components.schemas` 中添加新数据模型
3. **更新服务器**: 在 `servers` 数组中添加新环境
4. **更新信息**: 修改 `info` 对象中的元数据

## 添加新API文档

### 步骤1: 确定API分类

根据API功能确定使用哪个标签：

| 功能 | 标签 | 示例路径 |
|------|------|----------|
| 系统状态 | 健康检查 | `/api/health` |
| 配置管理 | 配置管理 | `/api/config/*` |
| 项目操作 | 项目管理 | `/api/projects/*` |
| 成本计算 | 实时计算 | `/api/calculate` |
| AI功能 | AI集成 | `/api/ai/*` |
| 数据导出 | 数据导出 | `/api/projects/:id/export/*` |
| 数据可视化 | 仪表盘 | `/api/dashboard/*` |
| Web3D项目 | Web3D评估 | `/api/web3d/*` |
| 系统监控 | 监控 | `/api/monitoring/*` |

### 步骤2: 编写JSDoc注释

在对应的路由文件中添加JSDoc注释：

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: 简短描述（动词开头）
 *     description: |
 *       详细描述，包括：
 *       - 功能说明
 *       - 使用场景
 *       - 注意事项
 *     tags: [标签名]
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *           enum: [value1, value2]
 *           default: defaultValue
 *         required: false
 *         description: 参数描述
 *         example: exampleValue
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field1, field2]
 *             properties:
 *               field1:
 *                 type: string
 *                 description: 字段描述
 *                 example: exampleValue
 *               field2:
 *                 type: number
 *                 description: 字段描述
 *                 example: 123
 *     responses:
 *       200:
 *         description: 成功响应描述
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/YourSchema'
 *             examples:
 *               success:
 *                 summary: 成功示例
 *                 value:
 *                   success: true
 *                   data: { /* 示例数据 */ }
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 资源不存在
 *       500:
 *         description: 服务器内部错误
 *     security:
 *       - bearerAuth: []  # 如果需要认证
 */
router.get('/your-endpoint', controller.handler);
```

### 步骤3: 定义数据模型

如果需要新的数据模型，在 `swagger/index.js` 的 `components.schemas` 中添加：

```javascript
components: {
  schemas: {
    YourNewSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
          description: '唯一标识',
          example: 1
        },
        name: {
          type: 'string',
          description: '名称',
          example: '示例名称'
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: '状态',
          example: 'active'
        },
        created_at: {
          type: 'string',
          format: 'date-time',
          description: '创建时间',
          example: '2024-01-01T00:00:00.000Z'
        }
      },
      required: ['id', 'name']
    }
  }
}
```

### 步骤4: 测试文档

1. 启动服务器：`node index.js`
2. 访问Swagger UI：`http://localhost:3001/api-docs`
3. 验证新API文档显示正确
4. 测试"Try it out"功能

## 更新现有文档

### 场景1: 修改API参数

1. 找到对应的路由文件
2. 更新JSDoc注释中的 `parameters` 或 `requestBody`
3. 测试更新后的文档

### 场景2: 修改响应格式

1. 更新JSDoc注释中的 `responses` 部分
2. 如果需要新模型，在 `components.schemas` 中添加
3. 更新示例数据

### 场景3: 添加新端点

1. 在路由文件中添加新路由
2. 添加完整的JSDoc注释
3. 更新相关的数据模型（如需要）
4. 测试新端点文档

### 场景4: 废弃API

1. 在JSDoc注释中添加 `deprecated: true`
2. 在描述中说明废弃原因和替代方案
3. 保留文档以便现有用户迁移

```javascript
/**
 * @swagger
 * /api/old-endpoint:
 *   get:
 *     summary: 旧API端点
 *     deprecated: true
 *     description: |
 *       ⚠️ **已废弃**: 此API将在v2.0中移除。
 *       请使用 `/api/new-endpoint` 替代。
 *     tags: [标签名]
 */
```

## 数据模型管理

### 模型定义规范

1. **命名规范**: 使用PascalCase，如 `Project`, `UserRole`
2. **描述完整**: 每个字段都有 `description` 和 `example`
3. **类型准确**: 使用正确的OpenAPI类型
4. **关系引用**: 使用 `$ref` 引用其他模型

### 常用数据类型

```javascript
// 字符串
{ type: 'string', example: 'text' }

// 数字
{ type: 'number', example: 123.45 }
{ type: 'integer', example: 123 }

// 布尔
{ type: 'boolean', example: true }

// 日期时间
{ type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' }

// 数组
{ type: 'array', items: { $ref: '#/components/schemas/Item' } }

// 对象
{ type: 'object', properties: { /* ... */ } }

// 枚举
{ type: 'string', enum: ['value1', 'value2', 'value3'] }
```

### 模型复用

1. **通用响应**: 使用 `ApiResponse` 包装所有响应
2. **分页**: 使用 `PaginationParams` 和 `PaginatedResponse`
3. **错误**: 使用 `ErrorResponse` 统一错误格式

## 团队协作流程

### 开发流程

1. **API设计**: 后端开发者设计API接口
2. **文档编写**: 同时编写代码和JSDoc注释
3. **代码审查**: 审查API设计和文档质量
4. **测试验证**: 测试API功能和文档准确性
5. **合并发布**: 合并代码并更新文档版本

### 审查清单

- [ ] API路径符合RESTful规范
- [ ] HTTP方法使用正确
- [ ] 参数描述完整准确
- [ ] 响应格式符合规范
- [ ] 错误处理完善
- [ ] 示例数据合理
- [ ] 标签分类正确
- [ ] 数据模型定义完整

### 版本管理

1. **语义化版本**: 遵循SemVer规范
2. **变更日志**: 记录API变更历史
3. **向后兼容**: 尽量保持向后兼容
4. **废弃通知**: 提前通知废弃的API

## 自动化工具

### 1. 文档生成脚本

创建 `scripts/generate-docs.js`：

```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const options = {
  definition: { /* ... */ },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);
const outputPath = path.join(__dirname, '../docs/swagger.json');

fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`Swagger文档已生成: ${outputPath}`);
```

### 2. 文档验证脚本

创建 `scripts/validate-docs.js`：

```javascript
const SwaggerParser = require('@apidevtools/swagger-parser');

async function validateDocs() {
  try {
    const api = await SwaggerParser.validate('./docs/swagger.json');
    console.log('✅ 文档验证通过');
    console.log(`API标题: ${api.info.title}`);
    console.log(`API版本: ${api.info.version}`);
    console.log(`端点数量: ${Object.keys(api.paths).length}`);
  } catch (error) {
    console.error('❌ 文档验证失败:', error.message);
    process.exit(1);
  }
}

validateDocs();
```

### 3. CI/CD集成

在 `.github/workflows/ci.yml` 中添加：

```yaml
jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: node scripts/validate-docs.js
```

### 4. 文档更新提醒

创建 `.github/workflows/doc-check.yml`：

```yaml
name: Documentation Check
on:
  pull_request:
    paths:
      - 'server/routes/**'
      - 'server/controllers/**'
      - 'server/models/**'

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check for documentation updates
        run: |
          # 检查是否有路由文件变更但没有文档更新
          git diff --name-only origin/main | grep -q "routes/" && \
          ! git diff --name-only origin/main | grep -q "swagger/" && \
          echo "⚠️ 警告: 路由文件已更新，请检查是否需要更新API文档"
```

## 最佳实践

### 1. 文档编写

- **及时更新**: API变更时同步更新文档
- **详细描述**: 提供足够的使用说明
- **示例完整**: 包含请求和响应示例
- **错误处理**: 文档化所有可能的错误

### 2. 注释规范

- **一致性**: 遵循统一的注释格式
- **简洁性**: 避免冗余信息
- **准确性**: 确保与代码一致
- **可读性**: 使用清晰的语言

### 3. 数据模型

- **复用性**: 设计可复用的数据模型
- **扩展性**: 考虑未来的扩展需求
- **一致性**: 保持字段命名一致
- **完整性**: 定义所有必要的字段

### 4. 测试验证

- **功能测试**: 测试API功能是否正常
- **文档测试**: 测试文档是否准确
- **集成测试**: 测试前后端集成
- **回归测试**: 确保变更不影响现有功能

## 常见问题

### Q1: 如何处理复杂的请求体？

A: 使用 `requestBody` 和 `content` 定义：

```javascript
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/ComplexRequest'
    multipart/form-data:
      schema:
        type: object
        properties:
          file:
            type: string
            format: binary
```

### Q2: 如何定义嵌套对象？

A: 使用嵌套的 `properties`：

```javascript
schema:
  type: 'object'
  properties:
    user:
      type: 'object'
      properties:
        name:
          type: 'string'
        address:
          type: 'object'
          properties:
            city:
              type: 'string'
            street:
              type: 'string'
```

### Q3: 如何处理文件上传？

A: 使用 `multipart/form-data`：

```javascript
requestBody:
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          file:
            type: string
            format: binary
            description: 上传的文件
          description:
            type: string
            description: 文件描述
```

### Q4: 如何定义分页响应？

A: 创建通用的分页模型：

```javascript
components:
  schemas:
    PaginatedResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            list:
              type: array
              items:
                $ref: '#/components/schemas/Item'
            total:
              type: integer
            page:
              type: integer
            pageSize:
              type: integer
            totalPages:
              type: integer
```

### Q5: 如何处理认证？

A: 定义安全方案并在API中使用：

```javascript
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

# 在API中使用
security:
  - bearerAuth: []
```

### Q6: 如何版本化API？

A: 使用URL路径或请求头：

```javascript
// URL路径版本
servers:
  - url: 'http://localhost:3001/api/v1'
  - url: 'http://localhost:3001/api/v2'

// 或使用请求头
paths:
  /api/resource:
    get:
      parameters:
        - in: header
          name: API-Version
          schema:
            type: string
            default: '1.0'
```

## 总结

良好的API文档是项目成功的关键因素之一。通过遵循本指南，团队可以：

1. **提高开发效率**: 清晰的API文档减少沟通成本
2. **保证代码质量**: 文档驱动的开发方式提高代码质量
3. **便于维护**: 结构化的文档易于维护和更新
4. **促进协作**: 统一的文档标准促进团队协作

记住，文档不是一次性的任务，而是需要持续维护的资产。定期审查和更新文档，确保其始终与代码保持同步。