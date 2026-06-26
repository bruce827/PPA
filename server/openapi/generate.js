const { OpenApiGeneratorV3 } = require('@asteasolutions/zod-to-openapi');
const { registry } = require('./registry');

// Requiring the paths barrel executes every contract-registration module, which
// is where the registerRoute calls live. This is the single trigger that
// populates the registry with all contract paths.
require('./paths');

function buildSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'PPA 项目评估系统 API',
      version: '1.0.0',
      description:
        '由代码派生的机器可读接口契约。消费方为 agent：契约即工具调用规范，无需阅读后端源码。',
    },
    servers: [{ url: process.env.API_BASE_URL || 'http://localhost:3001' }],
  });
}

module.exports = { buildSpec };
