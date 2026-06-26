#!/usr/bin/env node

/**
 * API文档生成脚本
 * 
 * 功能：
 * 1. 扫描所有路由文件，提取API端点信息
 * 2. 生成Markdown格式的API文档
 * 3. 生成Postman Collection
 * 4. 生成Swagger/OpenAPI规范
 * 
 * 用法：
 *   node scripts/generate-api-docs.js [选项]
 * 
 * 选项：
 *   --format=markdown    生成Markdown文档（默认）
 *   --format=swagger     生成Swagger JSON
 *   --format=postman     生成Postman Collection
 *   --format=all         生成所有格式
 *   --output=<path>      输出目录（默认: ./docs/api）
 *   --help               显示帮助信息
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  routesDir: path.join(__dirname, '../routes'),
  outputDir: path.join(__dirname, '../docs/api'),
  defaultFormat: 'markdown'
};

// API信息收集器
class APICollector {
  constructor() {
    this.apis = [];
    this.tags = new Set();
    this.schemas = new Map();
  }

  /**
   * 从路由文件收集API信息
   */
  collectFromRoutes() {
    const routeFiles = fs.readdirSync(CONFIG.routesDir)
      .filter(file => file.endsWith('.js') && !file.includes('index'))
      .filter(file => !file.includes('swagger')); // 排除swagger示例文件

    routeFiles.forEach(file => {
      const filePath = path.join(CONFIG.routesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      this.parseRouteFile(file, content);
    });

    return this;
  }

  /**
   * 解析路由文件
   */
  parseRouteFile(filename, content) {
    // 提取路由定义
    const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      
      // 从文件名推断标签
      const tag = this.inferTag(filename);
      
      // 从路径推断描述
      const description = this.inferDescription(method, path);
      
      this.apis.push({
        method,
        path: `/api${path}`,
        tag,
        description,
        filename
      });
    }
  }

  /**
   * 从文件名推断标签
   */
  inferTag(filename) {
    const tagMap = {
      'health.js': '健康检查',
      'config.js': '配置管理',
      'projects.js': '项目管理',
      'calculation.js': '实时计算',
      'ai.js': 'AI集成',
      'dashboard.js': '仪表盘',
      'web3d.js': 'Web3D评估',
      'monitoring.js': '监控',
      'contracts.js': '合同管理',
      'opportunity.js': '商机管理',
      'attachment.js': '附件管理',
      'push.js': '推送管理',
      'formDesign.js': '表单设计',
      'wiki.js': '知识库',
      'dataMetrics.js': '数据指标'
    };
    
    return tagMap[filename] || '其他';
  }

  /**
   * 从路径推断描述
   */
  inferDescription(method, path) {
    const descriptions = {
      'GET /health': '检查系统健康状态',
      'GET /config/roles': '获取角色配置列表',
      'POST /config/roles': '创建角色配置',
      'PUT /config/roles/:id': '更新角色配置',
      'DELETE /config/roles/:id': '删除角色配置',
      'GET /config/risk-items': '获取风险评估项',
      'POST /config/risk-items': '创建风险评估项',
      'PUT /config/risk-items/:id': '更新风险评估项',
      'DELETE /config/risk-items/:id': '删除风险评估项',
      'GET /config/travel-costs': '获取差旅成本配置',
      'POST /config/travel-costs': '创建差旅成本配置',
      'PUT /config/travel-costs/:id': '更新差旅成本配置',
      'DELETE /config/travel-costs/:id': '删除差旅成本配置',
      'GET /config/ai-models': '获取AI模型配置列表',
      'POST /config/ai-models': '创建AI模型配置',
      'PUT /config/ai-models/:id': '更新AI模型配置',
      'DELETE /config/ai-models/:id': '删除AI模型配置',
      'GET /config/prompts': '获取提示词模板列表',
      'POST /config/prompts': '创建提示词模板',
      'PUT /config/prompts/:id': '更新提示词模板',
      'DELETE /config/prompts/:id': '删除提示词模板',
      'GET /config/all': '获取所有配置数据',
      'GET /projects': '获取项目列表',
      'POST /projects': '创建项目',
      'GET /projects/:id': '获取项目详情',
      'PUT /projects/:id': '更新项目',
      'DELETE /projects/:id': '删除项目',
      'GET /projects/:id/export/pdf': '导出PDF报告',
      'GET /projects/:id/export/excel': '导出Excel报告',
      'GET /templates': '获取模板列表',
      'POST /calculate': '计算项目成本',
      'GET /ai/prompts': '获取AI提示词列表',
      'POST /ai/assess-risk': 'AI风险评估',
      'POST /ai/analyze-project-modules': 'AI模块分析',
      'POST /ai/evaluate-workload': 'AI工作量评估',
      'POST /ai/normalize-risk-names': '风险名称标准化',
      'POST /ai/generate-project-tags': 'AI生成项目标签',
      'GET /dashboard/overview': '获取仪表盘概览',
      'GET /dashboard/trend': '获取趋势数据',
      'GET /dashboard/cost-range': '获取成本分布',
      'GET /dashboard/keywords': '获取关键词云',
      'GET /dashboard/dna': '获取DNA雷达图数据',
      'GET /dashboard/top-roles': '获取热门角色',
      'GET /dashboard/top-risks': '获取热门风险'
    };

    const key = `${method} ${path}`;
    return descriptions[key] || `${method} ${path}`;
  }

  /**
   * 获取收集到的API信息
   */
  getAPIs() {
    return this.apis;
  }

  /**
   * 获取所有标签
   */
  getTags() {
    return [...new Set(this.apis.map(api => api.tag))];
  }
}

// 文档生成器
class DocGenerator {
  constructor(apis) {
    this.apis = apis;
  }

  /**
   * 生成Markdown文档
   */
  generateMarkdown() {
    const lines = [];
    
    // 标题
    lines.push('# PPA API文档');
    lines.push('');
    lines.push('> 自动生成于 ' + new Date().toISOString());
    lines.push('');
    
    // 概览
    lines.push('## 概览');
    lines.push('');
    lines.push(`- **API总数**: ${this.apis.length}`);
    lines.push(`- **标签分类**: ${new Set(this.apis.map(a => a.tag)).size}`);
    lines.push('');
    
    // 按标签分组
    const grouped = this.groupByTag();
    
    Object.entries(grouped).forEach(([tag, apis]) => {
      lines.push(`## ${tag}`);
      lines.push('');
      
      apis.forEach(api => {
        lines.push(`### ${api.method} ${api.path}`);
        lines.push('');
        lines.push(`**描述**: ${api.description}`);
        lines.push('');
        lines.push('**请求**:');
        lines.push('```');
        lines.push(`${api.method} ${api.path}`);
        lines.push('```');
        lines.push('');
        lines.push('**响应**:');
        lines.push('```json');
        lines.push(JSON.stringify({ success: true, data: {} }, null, 2));
        lines.push('```');
        lines.push('');
      });
    });
    
    return lines.join('\n');
  }

  /**
   * 生成Swagger JSON
   */
  generateSwagger() {
    const swagger = {
      openapi: '3.0.0',
      info: {
        title: 'PPA 项目评估系统 API',
        version: '1.0.0',
        description: '项目评估系统后端API文档（自动生成）'
      },
      servers: [
        { url: 'http://localhost:3001', description: '开发环境' }
      ],
      tags: this.getTags().map(tag => ({ name: tag })),
      paths: {},
      components: {
        schemas: {
          ApiResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              error: { type: 'string' }
            }
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' }
            }
          }
        }
      }
    };

    // 按路径分组
    const pathGroups = {};
    this.apis.forEach(api => {
      if (!pathGroups[api.path]) {
        pathGroups[api.path] = {};
      }
      pathGroups[api.path][api.method.toLowerCase()] = {
        summary: api.description,
        tags: [api.tag],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '500': {
            description: '服务器错误',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      };
    });

    swagger.paths = pathGroups;
    return swagger;
  }

  /**
   * 生成Postman Collection
   */
  generatePostman() {
    const collection = {
      info: {
        name: 'PPA API',
        description: 'PPA项目评估系统API集合（自动生成）',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      variable: [
        { key: 'base_url', value: 'http://localhost:3001' }
      ],
      item: []
    };

    // 按标签分组
    const grouped = this.groupByTag();
    
    Object.entries(grouped).forEach(([tag, apis]) => {
      const folder = {
        name: tag,
        item: apis.map(api => ({
          name: api.description,
          request: {
            method: api.method,
            header: [],
            url: {
              raw: `{{base_url}}${api.path}`,
              host: ['{{base_url}}'],
              path: api.path.split('/').filter(Boolean)
            }
          }
        }))
      };
      collection.item.push(folder);
    });

    return collection;
  }

  /**
   * 按标签分组
   */
  groupByTag() {
    const grouped = {};
    this.apis.forEach(api => {
      if (!grouped[api.tag]) {
        grouped[api.tag] = [];
      }
      grouped[api.tag].push(api);
    });
    return grouped;
  }

  /**
   * 获取标签信息
   */
  getTags() {
    const tagDescriptions = {
      '健康检查': '系统状态检查',
      '配置管理': '系统配置参数管理',
      '项目管理': '项目和模板的CRUD操作',
      '实时计算': '基于评估数据的实时成本计算',
      'AI集成': 'AI风险评估、模块分析、工作量评估',
      '数据导出': 'PDF和Excel格式的报告导出',
      '仪表盘': '数据可视化和趋势分析',
      'Web3D评估': 'Web3D项目的专门评估流程',
      '监控': 'AI日志和系统监控'
    };

    return [...new Set(this.apis.map(a => a.tag))].map(tag => ({
      name: tag,
      description: tagDescriptions[tag] || tag
    }));
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  // 解析参数
  const format = args.find(a => a.startsWith('--format='))?.split('=')[1] || CONFIG.defaultFormat;
  const output = args.find(a => a.startsWith('--output='))?.split('=')[1] || CONFIG.outputDir;
  
  if (args.includes('--help')) {
    showHelp();
    return;
  }

  console.log('🔄 正在收集API信息...');
  
  // 收集API信息
  const collector = new APICollector();
  const apis = collector.collectFromRoutes().getAPIs();
  
  console.log(`✅ 收集到 ${apis.length} 个API端点`);
  
  // 创建输出目录
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output, { recursive: true });
  }

  const generator = new DocGenerator(apis);
  
  // 根据格式生成文档
  switch (format) {
    case 'markdown':
      generateMarkdownDoc(generator, output);
      break;
    case 'swagger':
      generateSwaggerDoc(generator, output);
      break;
    case 'postman':
      generatePostmanDoc(generator, output);
      break;
    case 'all':
      generateMarkdownDoc(generator, output);
      generateSwaggerDoc(generator, output);
      generatePostmanDoc(generator, output);
      break;
    default:
      console.error(`❌ 未知格式: ${format}`);
      process.exit(1);
  }

  console.log('\n✨ 文档生成完成！');
  console.log(`📁 输出目录: ${output}`);
}

/**
 * 生成Markdown文档
 */
function generateMarkdownDoc(generator, output) {
  const content = generator.generateMarkdown();
  const filePath = path.join(output, 'API.md');
  fs.writeFileSync(filePath, content);
  console.log(`📄 生成Markdown文档: ${filePath}`);
}

/**
 * 生成Swagger文档
 */
function generateSwaggerDoc(generator, output) {
  const content = generator.generateSwagger();
  const filePath = path.join(output, 'swagger.json');
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  console.log(`📄 生成Swagger文档: ${filePath}`);
}

/**
 * 生成Postman文档
 */
function generatePostmanDoc(generator, output) {
  const content = generator.generatePostman();
  const filePath = path.join(output, 'PPA-API.postman_collection.json');
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  console.log(`📄 生成Postman Collection: ${filePath}`);
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
📚 API文档生成工具

用法:
  node scripts/generate-api-docs.js [选项]

选项:
  --format=markdown    生成Markdown文档（默认）
  --format=swagger     生成Swagger JSON
  --format=postman     生成Postman Collection
  --format=all         生成所有格式
  --output=<path>      输出目录（默认: ./docs/api）
  --help               显示帮助信息

示例:
  node scripts/generate-api-docs.js
  node scripts/generate-api-docs.js --format=all
  node scripts/generate-api-docs.js --format=swagger --output=./api-docs
`);
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { APICollector, DocGenerator };