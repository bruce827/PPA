# PPA API文档系统

本目录包含PPA项目评估系统的API文档配置和示例。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 启动服务器

```bash
node index.js
```

### 3. 访问API文档

启动服务器后，访问以下地址：

- **Swagger UI**: http://localhost:3001/api-docs
- **Swagger JSON**: http://localhost:3001/api-docs.json

## 📁 目录结构

```
swagger/
├── index.js              # Swagger配置和UI设置
├── README.md             # 本文档
└── examples/             # Swagger注释示例
    └── config-swagger.js # 配置路由的Swagger注释示例
```

## 🔧 配置说明

### Swagger配置 (`index.js`)

主要配置包括：

1. **基本信息**
   - API标题和版本
   - 联系方式和许可证
   - 服务器环境配置

2. **标签分类**
   - 健康检查
   - 配置管理
   - 项目管理
   - 实时计算
   - AI集成
   - 数据导出
   - 仪表盘
   - Web3D评估
   - 监控

3. **数据模型**
   - 通用响应格式 (`ApiResponse`)
   - 项目数据结构 (`Project`)
   - 角色配置 (`Role`)
   - 风险项 (`RiskItem`)
   - 差旅成本 (`TravelCost`)
   - AI模型配置 (`AIModel`)
   - 提示词模板 (`PromptTemplate`)
   - 计算请求/响应 (`CalculationRequest`, `CalculationResponse`)
   - AI相关请求 (`AIRiskAssessmentRequest`, `AIModuleAnalysisRequest`, `AIWorkloadEvaluationRequest`)

4. **UI自定义**
   - 隐藏顶部栏
   - 自定义标题和图标
   - 启用授权持久化
   - 显示请求耗时

## 📝 如何添加API文档

### 方法1: JSDoc注释 (推荐)

在路由文件中添加JSDoc注释，Swagger会自动解析：

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: 简短描述
 *     description: 详细描述
 *     tags: [标签名]
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *         description: 参数描述
 *     responses:
 *       200:
 *         description: 成功响应
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/YourSchema'
 *       500:
 *         description: 错误响应
 */
router.get('/your-endpoint', controller.handler);
```

### 方法2: 独立路径文件

对于复杂的API，可以在 `swagger/paths/` 目录下创建独立的路径文件：

```javascript
// swagger/paths/your-feature.js
module.exports = {
  '/api/your-endpoint': {
    get: {
      summary: '简短描述',
      // ... 其他配置
    }
  }
};
```

然后在 `index.js` 中引用：

```javascript
const options = {
  // ... 其他配置
  apis: [
    './routes/*.js',
    './swagger/paths/*.js'  // 添加路径文件
  ]
};
```

## 🏷️ 标签使用规范

| 标签 | 描述 | 使用场景 |
|------|------|----------|
| `健康检查` | 系统状态检查 | `/api/health` |
| `配置管理` | 系统配置管理 | `/api/config/*` |
| `项目管理` | 项目CRUD操作 | `/api/projects/*` |
| `实时计算` | 成本计算 | `/api/calculate` |
| `AI集成` | AI功能 | `/api/ai/*` |
| `数据导出` | 导出功能 | `/api/projects/:id/export/*` |
| `仪表盘` | 数据可视化 | `/api/dashboard/*` |
| `Web3D评估` | Web3D项目 | `/api/web3d/*` |
| `监控` | 系统监控 | `/api/monitoring/*` |

## 📊 数据模型规范

### 请求模型

- 使用 `required` 数组定义必填字段
- 为每个字段提供 `description` 和 `example`
- 使用 `enum` 限制可选值

### 响应模型

- 统一使用 `ApiResponse` 包装
- 成功响应包含 `data` 字段
- 错误响应包含 `error` 字段

### 分页参数

- `page`: 页码，默认1
- `pageSize`: 每页数量，默认10

## 🔍 最佳实践

### 1. 描述清晰

```javascript
/**
 * @swagger
 * /api/example:
 *   get:
 *     summary: 获取示例列表  # 简短，动词开头
 *     description: |          # 详细，包含使用场景
 *       获取系统中所有示例数据。
 *       支持分页和筛选参数。
 *       适用于前端列表页面。
 */
```

### 2. 参数完整

```javascript
parameters:
  - in: query
    name: status
    schema:
      type: string
      enum: [active, inactive, archived]
      default: active
    description: 按状态筛选
    example: active
```

### 3. 响应示例

```javascript
responses:
  200:
    description: 成功获取数据
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/YourSchema'
        examples:
          success:
            summary: 成功示例
            value:
              success: true
              data: { ... }
```

### 4. 错误处理

```javascript
responses:
  400:
    description: 请求参数错误
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ErrorResponse'
        examples:
          validation_error:
            summary: 验证错误
            value:
              success: false
              error: "参数验证失败: name不能为空"
```

## 🧪 测试API

Swagger UI提供交互式测试功能：

1. 点击API端点展开详情
2. 点击 "Try it out" 按钮
3. 填写请求参数
4. 点击 "Execute" 执行请求
5. 查看响应结果

## 📦 生产环境

### 环境变量

```bash
# 禁用Swagger UI（生产环境建议禁用）
SWAGGER_ENABLED=false

# 自定义文档路径
SWAGGER_PATH=/docs
```

### 安全考虑

1. **生产环境禁用**: 建议在生产环境禁用Swagger UI
2. **访问控制**: 可以添加认证中间件保护文档访问
3. **敏感信息**: 确保文档中不包含敏感信息

### Nginx配置

```nginx
# 仅在开发环境启用
location /api-docs {
    if ($environment = "production") {
        return 404;
    }
    proxy_pass http://localhost:3001;
}
```

## 🔄 更新日志

### v1.0.0 (2024-01-01)
- 初始版本
- 支持所有核心API文档
- 集成Swagger UI
- 添加数据模型定义

## 🤝 贡献指南

### 添加新API文档

1. 在对应的路由文件中添加JSDoc注释
2. 遵循现有的注释格式和规范
3. 确保包含完整的请求/响应示例
4. 测试Swagger UI中的显示效果

### 更新数据模型

1. 在 `swagger/index.js` 的 `components.schemas` 中添加新模型
2. 更新相关的API注释引用
3. 确保模型定义完整且准确

## 📚 相关资源

- [Swagger/OpenAPI规范](https://swagger.io/specification/)
- [Swagger UI文档](https://swagger.io/tools/swagger-ui/)
- [swagger-jsdoc文档](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express文档](https://github.com/scottie1984/swagger-ui-express)

## 🐛 常见问题

### Q: Swagger UI无法访问？

A: 检查以下几点：
1. 服务器是否正常启动
2. 端口是否正确（默认3001）
3. 控制台是否有错误信息

### Q: API文档没有显示？

A: 检查以下几点：
1. JSDoc注释格式是否正确
2. 路径是否在 `apis` 配置中
3. 检查浏览器控制台错误

### Q: 如何自定义Swagger UI样式？

A: 修改 `index.js` 中的 `customCss` 配置：

```javascript
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    /* 添加你的自定义样式 */
  `
};
```

### Q: 如何添加认证支持？

A: 在 `components.securitySchemes` 中添加认证配置：

```javascript
components: {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  }
}
```

然后在API注释中添加：

```javascript
security:
  - bearerAuth: []
```