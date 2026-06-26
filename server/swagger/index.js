const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger配置选项
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PPA 项目评估系统 API',
      version: '1.0.0',
      description: `
# 项目评估系统后端API文档

## 概述
PPA (Project Portfolio Assessment) 是一个Web端的项目成本与风险评估系统，提供系统化的在线评估流程。

## 主要功能
- **项目管理**：项目和模板的CRUD操作
- **配置管理**：角色、风险项、差旅成本等配置
- **实时计算**：基于评估数据的实时成本计算
- **AI集成**：风险评估、模块分析、工作量评估
- **数据导出**：PDF和Excel格式的报告导出
- **仪表盘**：数据可视化和趋势分析

## 技术架构
- **后端**：Node.js + Express.js
- **数据库**：SQLite3
- **AI提供商**：OpenAI、Doubao（豆包）等

## 响应格式
所有API响应都遵循统一格式：
\`\`\`json
{
  "success": true,
  "data": {},
  "error": "错误信息（可选）"
}
\`\`\`

## 错误处理
- **400**：请求参数错误
- **404**：资源不存在
- **500**：服务器内部错误
      `,
      contact: {
        name: 'PPA开发团队',
        email: 'dev@ppa.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '开发环境'
      },
      {
        url: 'https://api.ppa.com',
        description: '生产环境'
      }
    ],
    tags: [
      {
        name: '健康检查',
        description: '系统健康状态检查'
      },
      {
        name: '配置管理',
        description: '系统配置参数管理'
      },
      {
        name: '项目管理',
        description: '项目和模板的CRUD操作'
      },
      {
        name: '实时计算',
        description: '基于评估数据的实时成本计算'
      },
      {
        name: 'AI集成',
        description: 'AI风险评估、模块分析、工作量评估'
      },
      {
        name: '数据导出',
        description: 'PDF和Excel格式的报告导出'
      },
      {
        name: '仪表盘',
        description: '数据可视化和趋势分析'
      },
      {
        name: 'Web3D评估',
        description: 'Web3D项目的专门评估流程'
      },
      {
        name: '监控',
        description: 'AI日志和系统监控'
      }
    ],
    components: {
      schemas: {
        // 通用响应格式
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '请求是否成功'
            },
            data: {
              description: '响应数据'
            },
            error: {
              type: 'string',
              description: '错误信息（当success为false时）'
            }
          }
        },
        // 项目数据结构
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '项目ID'
            },
            name: {
              type: 'string',
              description: '项目名称'
            },
            description: {
              type: 'string',
              description: '项目描述'
            },
            is_template: {
              type: 'boolean',
              description: '是否为模板'
            },
            assessment_details_json: {
              type: 'object',
              description: '评估详情JSON'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        // 角色配置
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '角色ID'
            },
            role_name: {
              type: 'string',
              description: '角色名称'
            },
            unit_price: {
              type: 'number',
              description: '单价（元/人/天）'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        // 风险项
        RiskItem: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '风险项ID'
            },
            item_name: {
              type: 'string',
              description: '风险项名称'
            },
            description: {
              type: 'string',
              description: '风险项描述'
            },
            options_json: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: '风险评分选项JSON'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        // 差旅成本
        TravelCost: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '差旅成本ID'
            },
            city: {
              type: 'string',
              description: '城市名称'
            },
            cost_per_month: {
              type: 'number',
              description: '每月成本（元/人）'
            },
            active: {
              type: 'boolean',
              description: '是否启用'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        // AI模型配置
        AIModel: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '模型ID'
            },
            provider: {
              type: 'string',
              description: '提供商',
              enum: ['openai', 'doubao', 'gemini', 'minimax', 'cherry-studio']
            },
            model_name: {
              type: 'string',
              description: '模型名称'
            },
            api_host: {
              type: 'string',
              description: 'API主机地址'
            },
            api_key: {
              type: 'string',
              description: 'API密钥'
            },
            is_current: {
              type: 'boolean',
              description: '是否为当前使用模型'
            },
            supports_vision: {
              type: 'boolean',
              description: '是否支持视觉功能'
            },
            is_current_vision: {
              type: 'boolean',
              description: '是否为当前视觉模型'
            },
            supports_web_search: {
              type: 'boolean',
              description: '是否支持网络搜索'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        // 提示词模板
        PromptTemplate: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '模板ID'
            },
            name: {
              type: 'string',
              description: '模板名称'
            },
            category: {
              type: 'string',
              description: '模板分类',
              enum: ['risk_analysis', 'module_analysis', 'workload_evaluation', 'project_tag']
            },
            content: {
              type: 'string',
              description: '模板内容'
            },
            variables_json: {
              type: 'object',
              description: '模板变量定义JSON'
            },
            is_system: {
              type: 'boolean',
              description: '是否为系统模板'
            },
            is_active: {
              type: 'boolean',
              description: '是否启用'
            },
            module_tag: {
              type: 'string',
              description: '模块标签'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        // 计算请求数据
        CalculationRequest: {
          type: 'object',
          required: ['risk_scores', 'roles', 'development_workload'],
          properties: {
            risk_scores: {
              type: 'object',
              description: '风险评分',
              additionalProperties: {
                type: 'number'
              }
            },
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role_name: { type: 'string' },
                  unit_price: { type: 'number' }
                }
              },
              description: '角色配置'
            },
            development_workload: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: '开发工作量'
            },
            integration_workload: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: '集成工作量'
            },
            travel_months: {
              type: 'number',
              description: '差旅月数'
            },
            travel_headcount: {
              type: 'number',
              description: '差旅人数'
            },
            maintenance_months: {
              type: 'number',
              description: '维护月数'
            },
            maintenance_headcount: {
              type: 'number',
              description: '维护人数'
            },
            maintenance_daily_cost: {
              type: 'number',
              description: '维护日成本'
            },
            risk_items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  cost: { type: 'number' }
                }
              },
              description: '风险成本项'
            }
          }
        },
        // 计算响应数据
        CalculationResponse: {
          type: 'object',
          properties: {
            software_dev_cost: {
              type: 'number',
              description: '软件开发成本（万元）'
            },
            system_integration_cost: {
              type: 'number',
              description: '系统集成成本（万元）'
            },
            travel_cost: {
              type: 'number',
              description: '差旅成本（万元）'
            },
            maintenance_cost: {
              type: 'number',
              description: '维护成本（万元）'
            },
            risk_cost: {
              type: 'number',
              description: '风险成本（万元）'
            },
            total_cost_exact: {
              type: 'number',
              description: '总成本（精确，万元）'
            },
            total_cost: {
              type: 'number',
              description: '总成本（四舍五入，万元）'
            },
            software_dev_workload_days: {
              type: 'number',
              description: '软件开发工作量（人天）'
            },
            system_integration_workload_days: {
              type: 'number',
              description: '系统集成工作量（人天）'
            }
          }
        },
        // AI风险评估请求
        AIRiskAssessmentRequest: {
          type: 'object',
          required: ['document'],
          properties: {
            document: {
              type: 'string',
              maxLength: 5000,
              description: '项目文档内容'
            },
            promptId: {
              type: 'integer',
              description: '提示词模板ID（可选）'
            },
            variable_values: {
              type: 'object',
              description: '模板变量值（可选）'
            }
          }
        },
        // AI模块分析请求
        AIModuleAnalysisRequest: {
          type: 'object',
          required: ['document'],
          properties: {
            document: {
              type: 'string',
              maxLength: 5000,
              description: '项目文档内容'
            },
            promptId: {
              type: 'integer',
              description: '提示词模板ID（可选）'
            },
            variable_values: {
              type: 'object',
              description: '模板变量值（可选）'
            }
          }
        },
        // AI工作量评估请求
        AIWorkloadEvaluationRequest: {
          type: 'object',
          required: ['document'],
          properties: {
            document: {
              type: 'string',
              maxLength: 5000,
              description: '项目文档内容'
            },
            promptId: {
              type: 'integer',
              description: '提示词模板ID（可选）'
            },
            variable_values: {
              type: 'object',
              description: '模板变量值（可选）'
            }
          }
        },
        // 分页参数
        PaginationParams: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              default: 1,
              description: '页码'
            },
            pageSize: {
              type: 'integer',
              default: 10,
              description: '每页数量'
            }
          }
        },
        // 错误响应
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: '错误信息'
            }
          }
        }
      }
    }
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js'
  ]
};

// 创建Swagger规范
const swaggerSpec = swaggerJsdoc(options);

// 自定义Swagger UI选项
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { background: #fafafa; padding: 15px; margin: 20px 0 }
  `,
  customSiteTitle: 'PPA API文档',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    deepLinking: true
  }
};

// 设置Swagger UI
function setupSwagger(app) {
  // Swagger UI路由
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  // Swagger JSON路由
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('📚 Swagger文档已启用: http://localhost:3001/api-docs');
  console.log('📄 Swagger JSON: http://localhost:3001/api-docs.json');
}

module.exports = {
  setupSwagger,
  swaggerSpec
};