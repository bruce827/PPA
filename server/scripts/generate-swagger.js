#!/usr/bin/env node

/**
 * Swagger文档生成脚本
 * 
 * 用法:
 *   node scripts/generate-swagger.js [output-file]
 * 
 * 示例:
 *   node scripts/generate-swagger.js
 *   node scripts/generate-swagger.js ./docs/api.json
 *   node scripts/generate-swagger.js ./docs/api.yaml
 * 
 * 功能:
 *   - 从JSDoc注释生成Swagger/OpenAPI规范
 *   - 支持JSON和YAML格式输出
 *   - 验证生成的文档
 *   - 提供详细的统计信息
 */

const path = require('path');
const fs = require('fs');

// 动态导入swagger-jsdoc（避免在未安装时报错）
let swaggerJsdoc;
try {
  swaggerJsdoc = require('swagger-jsdoc');
} catch (error) {
  console.error('❌ 错误: 请先安装swagger-jsdoc依赖');
  console.error('   运行: npm install swagger-jsdoc');
  process.exit(1);
}

// Swagger配置选项
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PPA 项目评估系统 API',
      version: '1.0.0',
      description: '项目评估系统后端API文档',
      contact: {
        name: 'PPA开发团队',
        email: 'dev@ppa.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '开发环境'
      }
    ]
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/*.js'),
    path.join(__dirname, '../models/*.js')
  ]
};

/**
 * 生成Swagger规范
 */
function generateSwaggerSpec() {
  try {
    console.log('🔄 正在生成Swagger文档...');
    const swaggerSpec = swaggerJsdoc(options);
    return swaggerSpec;
  } catch (error) {
    console.error('❌ 生成Swagger文档失败:', error.message);
    process.exit(1);
  }
 }

/**
 * 验证Swagger规范
 */
function validateSwaggerSpec(spec) {
  const errors = [];
  
  // 检查基本信息
  if (!spec.openapi) {
    errors.push('缺少openapi版本字段');
  }
  
  if (!spec.info || !spec.info.title) {
    errors.push('缺少API标题');
  }
  
  if (!spec.paths || Object.keys(spec.paths).length === 0) {
    errors.push('没有找到API路径定义');
  }
  
  // 检查路径格式
  Object.entries(spec.paths || {}).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, details]) => {
      if (!details.summary && !details.description) {
        errors.push(`${method.toUpperCase()} ${path}: 缺少summary或description`);
      }
    });
  });
  
  return errors;
}

/**
 * 获取统计信息
 */
function getStats(spec) {
  const paths = spec.paths || {};
  const schemas = spec.components?.schemas || {};
  
  let totalEndpoints = 0;
  let methodCounts = {};
  
  Object.values(paths).forEach(methods => {
    Object.keys(methods).forEach(method => {
      totalEndpoints++;
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
  });
  
  return {
    totalPaths: Object.keys(paths).length,
    totalEndpoints,
    totalSchemas: Object.keys(schemas).length,
    methodCounts,
    tags: spec.tags || []
  };
}

/**
 * 保存文档到文件
 */
function saveToFile(spec, outputPath) {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const ext = path.extname(outputPath).toLowerCase();
    let content;
    
    if (ext === '.yaml' || ext === '.yml') {
      // YAML格式（简单实现，复杂情况建议使用js-yaml）
      console.log('⚠️  注意: YAML输出需要安装js-yaml依赖');
      console.log('   运行: npm install js-yaml');
      content = JSON.stringify(spec, null, 2);
      outputPath = outputPath.replace(/\.ya?ml$/, '.json');
    } else {
      // JSON格式
      content = JSON.stringify(spec, null, 2);
    }
    
    fs.writeFileSync(outputPath, content, 'utf8');
    return outputPath;
  } catch (error) {
    console.error('❌ 保存文件失败:', error.message);
    process.exit(1);
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
📚 Swagger文档生成工具

用法:
  node scripts/generate-swagger.js [选项]

选项:
  <output-file>    输出文件路径（默认: ./docs/swagger.json）
  --help, -h       显示帮助信息
  --validate       仅验证文档，不生成文件
  --stats          显示文档统计信息

示例:
  node scripts/generate-swagger.js
  node scripts/generate-swagger.js ./api-docs.json
  node scripts/generate-swagger.js --validate
  node scripts/generate-swagger.js --stats

支持格式:
  - JSON (.json)
  - YAML (.yaml, .yml) - 需要安装js-yaml依赖
`);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  
  // 处理帮助参数
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // 生成Swagger规范
  const spec = generateSwaggerSpec();
  
  // 验证文档
  const errors = validateSwaggerSpec(spec);
  if (errors.length > 0) {
    console.log('\n⚠️  文档验证警告:');
    errors.forEach(error => console.log(`  - ${error}`));
    console.log('');
  }
  
  // 显示统计信息
  if (args.includes('--stats')) {
    const stats = getStats(spec);
    console.log('\n📊 文档统计:');
    console.log(`  - API路径数量: ${stats.totalPaths}`);
    console.log(`  - API端点数量: ${stats.totalEndpoints}`);
    console.log(`  - 数据模型数量: ${stats.totalSchemas}`);
    console.log(`  - 标签数量: ${stats.tags.length}`);
    
    if (Object.keys(stats.methodCounts).length > 0) {
      console.log('\n📈 HTTP方法分布:');
      Object.entries(stats.methodCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([method, count]) => {
          console.log(`  - ${method.toUpperCase()}: ${count}`);
        });
    }
    
    if (stats.tags.length > 0) {
      console.log('\n🏷️  标签列表:');
      stats.tags.forEach(tag => {
        console.log(`  - ${tag.name}: ${tag.description || '无描述'}`);
      });
    }
    
    if (args.includes('--validate')) {
      return;
    }
  }
  
  // 仅验证模式
  if (args.includes('--validate')) {
    if (errors.length === 0) {
      console.log('✅ 文档验证通过');
    } else {
      console.log('❌ 文档验证失败');
      process.exit(1);
    }
    return;
  }
  
  // 确定输出文件路径
  let outputPath = args.find(arg => !arg.startsWith('--'));
  if (!outputPath) {
    outputPath = path.join(__dirname, '../docs/swagger.json');
  }
  
  // 保存到文件
  const savedPath = saveToFile(spec, outputPath);
  
  // 显示结果
  console.log('\n✅ Swagger文档生成成功!');
  console.log(`📄 输出文件: ${savedPath}`);
  console.log(`📊 包含 ${getStats(spec).totalEndpoints} 个API端点`);
  console.log(`📊 包含 ${getStats(spec).totalSchemas} 个数据模型`);
  
  // 显示使用提示
  console.log('\n💡 使用提示:');
  console.log('  1. 启动服务器后访问 http://localhost:3001/api-docs 查看交互式文档');
  console.log('  2. 将生成的JSON文件导入Postman或其他API工具');
  console.log('  3. 使用Swagger Editor在线编辑: https://editor.swagger.io/');
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  generateSwaggerSpec,
  validateSwaggerSpec,
  getStats
};