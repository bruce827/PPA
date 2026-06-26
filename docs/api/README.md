# PPA API文档目录

本目录包含PPA项目评估系统的API文档和相关资源。

## 📁 目录结构

```
api/
├── README.md                 # 本文档
├── swagger.json              # Swagger/OpenAPI规范文件（自动生成）
├── postman/                  # Postman集合
│   └── PPA-API.postman_collection.json
├── examples/                 # API使用示例
│   ├── requests/             # 请求示例
│   └── responses/            # 响应示例
└── schemas/                  # 数据模型定义
    └── models.json           # 数据模型JSON
```

## 🚀 快速开始

### 1. 生成Swagger文档

```bash
cd server
npm install
node scripts/generate-swagger.js
```

### 2. 查看交互式文档

启动服务器后访问：
- **Swagger UI**: http://localhost:3001/api-docs
- **Swagger JSON**: http://localhost:3001/api-docs.json

### 3. 导入到Postman

1. 打开Postman
2. 点击 "Import" 按钮
3. 选择 "Link" 标签
4. 输入: `http://localhost:3001/api-docs.json`
5. 点击 "Continue" 完成导入

## 📚 文档资源

### 核心文档

| 文档 | 描述 | 用途 |
|------|------|------|
| `swagger.json` | OpenAPI 3.0规范 | 机器可读的API定义 |
| `API-DOCUMENTATION-GUIDE.md` | 维护指南 | 团队协作参考 |
| `PRD.md` | 产品需求文档 | 功能需求参考 |

### 工具文档

| 工具 | 描述 | 使用场景 |
|------|------|----------|
| Swagger UI | 交互式API文档 | 开发和测试 |
| Postman | API测试工具 | 接口测试 |
| Swagger Editor | 在线编辑器 | 文档编写 |

## 🔧 API概览

### 主要模块

#### 1. 健康检查
- `GET /api/health` - 系统状态检查

#### 2. 配置管理
- **角色配置**: `/api/config/roles`
- **风险项配置**: `/api/config/risk-items`
- **差旅成本**: `/api/config/travel-costs`
- **AI模型配置**: `/api/config/ai-models`
- **提示词模板**: `/api/config/prompts`
- **聚合配置**: `/api/config/all`

#### 3. 项目管理
- `GET/POST/PUT/DELETE /api/projects` - 项目CRUD
- `GET /api/templates` - 模板列表
- `GET /api/projects/:id/export/pdf` - PDF导出
- `GET /api/projects/:id/export/excel` - Excel导出

#### 4. 实时计算
- `POST /api/calculate` - 成本计算

#### 5. AI集成
- `POST /api/ai/assess-risk` - 风险评估
- `POST /api/ai/analyze-project-modules` - 模块分析
- `POST /api/ai/evaluate-workload` - 工作量评估
- `POST /api/ai/normalize-risk-names` - 名称标准化
- `POST /api/ai/generate-project-tags` - 项目标签生成

#### 6. 仪表盘
- `GET /api/dashboard/overview` - 概览数据
- `GET /api/dashboard/trend` - 趋势分析
- `GET /api/dashboard/cost-range` - 成本分布
- `GET /api/dashboard/keywords` - 关键词云
- `GET /api/dashboard/dna` - 雷达图数据
- `GET /api/dashboard/top-roles` - 热门角色
- `GET /api/dashboard/top-risks` - 热门风险

#### 7. Web3D评估
- `GET/POST/PUT/DELETE /api/web3d/risk-items` - Web3D风险项
- `GET/POST/PUT/DELETE /api/web3d/workload-templates` - 工作量模板
- `GET/POST/PUT/DELETE /api/web3d/projects` - Web3D项目

#### 8. 其他功能
- `GET/POST /api/monitoring` - 监控日志
- `GET/POST /api/contracts` - 合同管理
- `GET/POST /api/opportunity` - 商机管理
- `GET/POST /api/attachments` - 附件管理
- `GET/POST /api/push` - 推送记录
- `GET/POST /api/form-design` - 表单设计
- `GET/POST /api/wiki` - 知识库

## 📊 数据模型

### 核心模型

1. **Project** - 项目模型
2. **Role** - 角色配置模型
3. **RiskItem** - 风险项模型
4. **TravelCost** - 差旅成本模型
5. **AIModel** - AI模型配置
6. **PromptTemplate** - 提示词模板

### 通用模型

1. **ApiResponse** - 通用响应格式
2. **ErrorResponse** - 错误响应格式
3. **PaginatedResponse** - 分页响应格式
4. **CalculationRequest** - 计算请求
5. **CalculationResponse** - 计算响应

## 🧪 测试API

### 使用Swagger UI

1. 访问 http://localhost:3001/api-docs
2. 找到要测试的API端点
3. 点击 "Try it out" 按钮
4. 填写请求参数
5. 点击 "Execute" 执行
6. 查看响应结果

### 使用cURL

```bash
# 健康检查
curl http://localhost:3001/api/health

# 获取角色列表
curl http://localhost:3001/api/config/roles

# 创建项目
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "测试项目", "description": "项目描述"}'

# 计算成本
curl -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"risk_scores": {"技术": 10}, "roles": [{"role_name": "前端", "unit_price": 1800}]}'
```

### 使用Postman

1. 导入Swagger文档: `http://localhost:3001/api-docs.json`
2. 设置环境变量:
   - `base_url`: `http://localhost:3001`
   - `api_prefix`: `/api`
3. 使用预设的请求集合

## 📝 文档维护

### 更新文档流程

1. **代码变更**: 修改路由文件中的JSDoc注释
2. **生成文档**: 运行 `node scripts/generate-swagger.js`
3. **验证文档**: 检查生成的文档是否正确
4. **提交变更**: 将文档变更提交到版本控制

### 文档规范

- **注释格式**: 使用JSDoc格式的Swagger注释
- **命名规范**: 遵循项目统一的命名规范
- **示例完整**: 提供完整的请求/响应示例
- **描述清晰**: 使用简洁明了的语言描述

### 团队协作

1. **文档审查**: 代码审查时同步审查文档
2. **版本同步**: 文档版本与代码版本保持一致
3. **变更通知**: API变更时通知相关团队成员
4. **培训支持**: 为新成员提供文档使用培训

## 🔗 相关资源

### 官方文档

- [OpenAPI规范](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Swagger Editor](https://editor.swagger.io/)

### 工具推荐

- [Postman](https://www.postman.com/) - API开发协作平台
- [Insomnia](https://insomnia.rest/) - API设计和测试工具
- [Hoppscotch](https://hoppscotch.io/) - 开源API测试工具

### 学习资源

- [OpenAPI 3.0指南](https://swagger.io/docs/specification/)
- [RESTful API设计最佳实践](https://restfulapi.net/)
- [API文档编写指南](https://idratherbewriting.com/learnapidoc/)

## 🆘 常见问题

### Q: Swagger UI无法访问？

A: 检查以下几点：
1. 服务器是否正常运行
2. 端口是否正确（默认3001）
3. 防火墙是否阻止访问
4. 浏览器控制台是否有错误

### Q: 文档与实际API不一致？

A: 执行以下步骤：
1. 重新生成文档: `node scripts/generate-swagger.js`
2. 重启服务器
3. 清除浏览器缓存
4. 检查JSDoc注释是否正确

### Q: 如何添加新的API文档？

A: 参考 `API-DOCUMENTATION-GUIDE.md` 中的详细说明：
1. 在路由文件中添加JSDoc注释
2. 遵循现有的注释格式
3. 重新生成文档
4. 测试新文档是否正确显示

### Q: 如何导出文档？

A: 有多种方式：
1. **Swagger JSON**: 访问 `/api-docs.json` 下载
2. **Postman**: 导入Swagger文档
3. **PDF**: 使用第三方工具转换
4. **静态HTML**: 使用Swagger UI构建工具

## 📞 支持与反馈

如有问题或建议，请通过以下方式联系：

- **文档问题**: 提交GitHub Issue
- **功能建议**: 创建Feature Request
- **紧急问题**: 联系开发团队

---

**最后更新**: 2024年1月
**维护者**: PPA开发团队