/**
 * PPA API JavaScript调用示例
 * 
 * 本文件展示如何使用JavaScript Fetch API调用PPA后端接口
 * 适用于前端开发或Node.js环境
 */

// 基础配置
const BASE_URL = 'http://localhost:3001';
const API_PREFIX = '/api';

/**
 * 通用API请求函数
 * @param {string} endpoint - API端点
 * @param {object} options - 请求选项
 * @returns {Promise<object>} 响应数据
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${API_PREFIX}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
}

/**
 * 健康检查
 * @returns {Promise<object>} 系统健康状态
 */
async function checkHealth() {
  return apiRequest('/health');
}

/**
 * 获取所有角色配置
 * @returns {Promise<object>} 角色列表
 */
async function getRoles() {
  return apiRequest('/config/roles');
}

/**
 * 创建角色配置
 * @param {object} roleData - 角色数据
 * @param {string} roleData.role_name - 角色名称
 * @param {number} roleData.unit_price - 单价（元/人/天）
 * @returns {Promise<object>} 创建的角色
 */
async function createRole(roleData) {
  return apiRequest('/config/roles', {
    method: 'POST',
    body: JSON.stringify(roleData),
  });
}

/**
 * 获取所有风险评估项
 * @returns {Promise<object>} 风险项列表
 */
async function getRiskItems() {
  return apiRequest('/config/risk-items');
}

/**
 * 创建风险评估项
 * @param {object} riskItemData - 风险项数据
 * @param {string} riskItemData.item_name - 风险项名称
 * @param {string} riskItemData.description - 风险项描述
 * @param {string} riskItemData.options_json - 评分选项JSON字符串
 * @returns {Promise<object>} 创建的风险项
 */
async function createRiskItem(riskItemData) {
  return apiRequest('/config/risk-items', {
    method: 'POST',
    body: JSON.stringify(riskItemData),
  });
}

/**
 * 获取所有差旅成本配置
 * @returns {Promise<object>} 差旅成本列表
 */
async function getTravelCosts() {
  return apiRequest('/config/travel-costs');
}

/**
 * 创建差旅成本配置
 * @param {object} travelCostData - 差旅成本数据
 * @param {string} travelCostData.city - 城市名称
 * @param {number} travelCostData.cost_per_month - 每月成本（元/人）
 * @param {boolean} travelCostData.active - 是否启用
 * @returns {Promise<object>} 创建的差旅成本
 */
async function createTravelCost(travelCostData) {
  return apiRequest('/config/travel-costs', {
    method: 'POST',
    body: JSON.stringify(travelCostData),
  });
}

/**
 * 获取所有配置数据
 * @returns {Promise<object>} 所有配置
 */
async function getAllConfigs() {
  return apiRequest('/config/all');
}

/**
 * 获取所有项目
 * @returns {Promise<object>} 项目列表
 */
async function getProjects() {
  return apiRequest('/projects');
}

/**
 * 创建项目
 * @param {object} projectData - 项目数据
 * @param {string} projectData.name - 项目名称
 * @param {string} projectData.description - 项目描述
 * @param {boolean} projectData.is_template - 是否为模板
 * @returns {Promise<object>} 创建的项目
 */
async function createProject(projectData) {
  return apiRequest('/projects', {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
}

/**
 * 获取项目详情
 * @param {number} projectId - 项目ID
 * @returns {Promise<object>} 项目详情
 */
async function getProjectById(projectId) {
  return apiRequest(`/projects/${projectId}`);
}

/**
 * 更新项目
 * @param {number} projectId - 项目ID
 * @param {object} projectData - 项目数据
 * @returns {Promise<object>} 更新后的项目
 */
async function updateProject(projectId, projectData) {
  return apiRequest(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(projectData),
  });
}

/**
 * 删除项目
 * @param {number} projectId - 项目ID
 * @returns {Promise<object>} 删除结果
 */
async function deleteProject(projectId) {
  return apiRequest(`/projects/${projectId}`, {
    method: 'DELETE',
  });
}

/**
 * 计算项目成本
 * @param {object} assessmentData - 评估数据
 * @returns {Promise<object>} 计算结果
 */
async function calculateCost(assessmentData) {
  return apiRequest('/calculate', {
    method: 'POST',
    body: JSON.stringify(assessmentData),
  });
}

/**
 * AI风险评估
 * @param {string} document - 项目文档内容
 * @param {number} [promptId] - 提示词模板ID（可选）
 * @param {object} [variableValues] - 模板变量值（可选）
 * @returns {Promise<object>} 风险评估结果
 */
async function assessRisk(document, promptId = null, variableValues = null) {
  const requestData = { document };
  
  if (promptId) {
    requestData.promptId = promptId;
  }
  
  if (variableValues) {
    requestData.variable_values = variableValues;
  }

  return apiRequest('/ai/assess-risk', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
}

/**
 * AI模块分析
 * @param {string} document - 项目文档内容
 * @param {number} [promptId] - 提示词模板ID（可选）
 * @param {object} [variableValues] - 模板变量值（可选）
 * @returns {Promise<object>} 模块分析结果
 */
async function analyzeProjectModules(document, promptId = null, variableValues = null) {
  const requestData = { document };
  
  if (promptId) {
    requestData.promptId = promptId;
  }
  
  if (variableValues) {
    requestData.variable_values = variableValues;
  }

  return apiRequest('/ai/analyze-project-modules', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
}

/**
 * AI工作量评估
 * @param {string} document - 项目文档内容
 * @param {number} [promptId] - 提示词模板ID（可选）
 * @param {object} [variableValues] - 模板变量值（可选）
 * @returns {Promise<object>} 工作量评估结果
 */
async function evaluateWorkload(document, promptId = null, variableValues = null) {
  const requestData = { document };
  
  if (promptId) {
    requestData.promptId = promptId;
  }
  
  if (variableValues) {
    requestData.variable_values = variableValues;
  }

  return apiRequest('/ai/evaluate-workload', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
}

/**
 * 获取仪表盘概览数据
 * @returns {Promise<object>} 概览数据
 */
async function getDashboardOverview() {
  return apiRequest('/dashboard/overview');
}

/**
 * 获取趋势数据
 * @returns {Promise<object>} 趋势数据
 */
async function getDashboardTrend() {
  return apiRequest('/dashboard/trend');
}

/**
 * 获取成本分布数据
 * @returns {Promise<object>} 成本分布数据
 */
async function getDashboardCostRange() {
  return apiRequest('/dashboard/cost-range');
}

/**
 * 获取关键词云数据
 * @returns {Promise<object>} 关键词云数据
 */
async function getDashboardKeywords() {
  return apiRequest('/dashboard/keywords');
}

/**
 * 获取DNA雷达图数据
 * @returns {Promise<object>} 雷达图数据
 */
async function getDashboardDNA() {
  return apiRequest('/dashboard/dna');
}

/**
 * 获取热门角色
 * @returns {Promise<object>} 热门角色数据
 */
async function getDashboardTopRoles() {
  return apiRequest('/dashboard/top-roles');
}

/**
 * 获取热门风险
 * @returns {Promise<object>} 热门风险数据
 */
async function getDashboardTopRisks() {
  return apiRequest('/dashboard/top-risks');
}

// 使用示例
async function exampleUsage() {
  try {
    console.log('🚀 PPA API调用示例\n');

    // 1. 健康检查
    console.log('1. 健康检查:');
    const health = await checkHealth();
    console.log('   系统状态:', health.data.status);
    console.log('   数据库连接:', health.data.database.connected ? '正常' : '异常');
    console.log('');

    // 2. 获取配置
    console.log('2. 获取配置:');
    const configs = await getAllConfigs();
    console.log('   角色数量:', configs.data.roles.length);
    console.log('   风险项数量:', configs.data.risk_items.length);
    console.log('   差旅成本数量:', configs.data.travel_costs.length);
    console.log('');

    // 3. 获取项目列表
    console.log('3. 获取项目列表:');
    const projects = await getProjects();
    console.log('   项目数量:', projects.data.length);
    console.log('');

    // 4. 获取仪表盘数据
    console.log('4. 获取仪表盘数据:');
    const overview = await getDashboardOverview();
    console.log('   最近项目:', overview.data.recent_projects.length);
    console.log('');

    // 5. AI风险评估示例
    console.log('5. AI风险评估示例:');
    const document = `
      项目名称：电商平台开发
      技术栈：React + Node.js + MySQL
      团队规模：10人
      项目周期：6个月
    `;
    
    const riskAssessment = await assessRisk(document);
    console.log('   识别到的风险:', riskAssessment.data.risks.length);
    console.log('   置信度:', riskAssessment.data.confidence);
    console.log('');

    // 6. 成本计算示例
    console.log('6. 成本计算示例:');
    const assessmentData = {
      risk_scores: { '技术风险': 15, '进度风险': 12 },
      roles: [
        { role_name: '前端工程师', unit_price: 1800 },
        { role_name: '后端工程师', unit_price: 2000 }
      ],
      development_workload: [
        { delivery_factor: 1.0, '前端工程师': 60, '后端工程师': 80 }
      ]
    };
    
    const costResult = await calculateCost(assessmentData);
    console.log('   总成本:', costResult.data.total_cost, '万元');
    console.log('   开发工作量:', costResult.data.software_dev_workload_days, '人天');
    console.log('');

    console.log('✅ 所有示例执行完成');
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  // Node.js环境
  module.exports = {
    apiRequest,
    checkHealth,
    getRoles,
    createRole,
    getRiskItems,
    createRiskItem,
    getTravelCosts,
    createTravelCost,
    getAllConfigs,
    getProjects,
    createProject,
    getProjectById,
    updateProject,
    deleteProject,
    calculateCost,
    assessRisk,
    analyzeProjectModules,
    evaluateWorkload,
    getDashboardOverview,
    getDashboardTrend,
    getDashboardCostRange,
    getDashboardKeywords,
    getDashboardDNA,
    getDashboardTopRoles,
    getDashboardTopRisks,
    exampleUsage
  };
} else {
  // 浏览器环境
  window.PPAApi = {
    apiRequest,
    checkHealth,
    getRoles,
    createRole,
    getRiskItems,
    createRiskItem,
    getTravelCosts,
    createTravelCost,
    getAllConfigs,
    getProjects,
    createProject,
    getProjectById,
    updateProject,
    deleteProject,
    calculateCost,
    assessRisk,
    analyzeProjectModules,
    evaluateWorkload,
    getDashboardOverview,
    getDashboardTrend,
    getDashboardCostRange,
    getDashboardKeywords,
    getDashboardDNA,
    getDashboardTopRoles,
    getDashboardTopRisks,
    exampleUsage
  };
}