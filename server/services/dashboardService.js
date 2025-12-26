const dashboardModel = require('../models/dashboardModel');
const configModel = require('../models/configModel');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const NON_ROLE_KEYS = new Set([
  'id',
  'index',
  'workload',
  'calculatedWorkload',
  'delivery_factor',
  'scope_factor',
  'tech_factor',
  'module',
  'module1',
  'module2',
  'module3',
  'description',
  'complexity',
  'ai_evaluation_result',
  'name',
  'type',
  'category',
]);

// ------------------------------
// [Dashboard Refactor] Keywords helpers (轻量分词，无需 nodejieba)
// ------------------------------
const VERSION_TOKEN_RE = /^(?:v\d+(?:\.\d+){0,3}(?:-[a-z0-9]+)?|\d+(?:\.\d+){1,3}(?:-[a-z0-9]+)?)$/i;
const KEYWORD_SPLIT_RE = /[\\/|,，。;；:：()（）\[\]{}"'`\t\r\n]/g;

const roundTo = (value, decimals = 2) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const factor = 10 ** decimals;
  return Math.round((num + Number.EPSILON) * factor) / factor;
};

const getWordListFromFile = (absolutePath) => {
  try {
    if (!fs.existsSync(absolutePath)) return [];
    const raw = fs.readFileSync(absolutePath, 'utf8');
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  } catch (_e) {
    return [];
  }
};

const getDefaultKeepwords = () => {
  return [
    '数字孪生',
    '数字化交付',
    '数据采集',
    '数据同步',
    '数据流通',
    '数据要素',
    '数据资产',
    '数据治理',
    '数据质量',
    '交付管控',
    '电子组卷',
    '低代码',
    '动态表单',
    '三维模型',
    '二维码',
    '智慧社区',
    '智慧安防',
    '校园安防',
    '移动端',
    '单点登录',
    '身份认证',
    '应急指挥',
    '生产监控',
    '远程诊断',
    '离线填报',
    '数据仓库',
    '安全管控',
    '等级保护',
    '安全扫描',
    '微服务',
    '并发',
    // English keepwords（与 normalize 小写保持一致）
    '3d',
    'bim',
    'gis',
    'iot',
    'ai',
    'j2ee',
    'soa',
    'revit',
    'navisworks',
    'ifc',
    'fbx',
    'cctv',
    'ehr',
  ];
};

const getDefaultStopwords = () => {
  return [
    '项目',
    '系统',
    '平台',
    '建设',
    '管理',
    '功能',
    '模块',
    '服务',
    '支持',
    '提升',
    '提供',
    '实现',
    '完成',
    '开展',
    '进行',
    '通过',
    '满足',
    '确保',
    '达到',
    '形成',
    '覆盖',
    '核心',
    '内容',
    '相关',
    '需求',
    '业务',
    '流程',
    '基础',
    '方案',
    '应用',
    '开发',
    '对接',
    '集成',
    '标准',
    '标准化',
    '统一',
    '接口',
    '场景',
    '升级',
    '保障',
    '机制',
    '目标',
    '数据',
    '数字化',
  ];
};

const normalizeKeywordText = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .toLowerCase()
    .replace(KEYWORD_SPLIT_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const addToken = (counter, token) => {
  if (!token) return;
  counter[token] = (counter[token] || 0) + 1;
};

const tokenizeKeywords = (text, keepwords, stopwordsSet) => {
  const counter = {};
  let working = normalizeKeywordText(text);

  const normalizedKeepwords = (keepwords || [])
    .map((w) => String(w || '').trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  // keepwords：最长优先命中并从文本中移除
  normalizedKeepwords.forEach((w) => {
    if (!w) return;
    while (working.includes(w)) {
      addToken(counter, w);
      working = working.replace(w, ' ');
    }
  });

  // 英文数字 token
  const englishTokens = working.match(/[a-z0-9]+(?:[-_.][a-z0-9]+)*/g) || [];
  englishTokens.forEach((t) => {
    if (!t || t.length < 2) return;
    if (/^\d+$/.test(t)) return;
    if (VERSION_TOKEN_RE.test(t)) return;
    if (stopwordsSet.has(t)) return;
    addToken(counter, t);
  });

  // 中文 token：先取连续中文串，再用常见虚词字符做一次切分
  const chineseRuns = working.match(/[\u4e00-\u9fa5]+/g) || [];
  chineseRuns.forEach((run) => {
    const parts = String(run)
      .replace(/[的为与及或在以向从对并等可需将把]/g, ' ')
      .split(/\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    parts.forEach((p) => {
      if (p.length < 2) return;
      if (stopwordsSet.has(p)) return;
      addToken(counter, p);
    });
  });

  return counter;
};

/**
 * 将任意值安全转换为数字，无法转换时返回 0。
 * @param {*} value 任意输入
 * @returns {number} 可用的数值
 */
const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

/**
 * 安全解析评估详情 JSON，失败时返回 null 并记录告警。
 * @param {string} detailsJSON JSON 字符串
 * @returns {object|null} 解析后的对象
 */
const safeParseDetails = (detailsJSON) => {
  try {
    return JSON.parse(detailsJSON);
  } catch (error) {
    logger.warn('Failed to parse assessment_details_json', { error: error.message });
    // 为兼容旧有测试与排障习惯，保留 console.error 一份
    console.error('Failed to parse assessment_details_json', error);
    return null;
  }
};

/**
 * 将单条成本明细累加到汇总对象。
 * @param {object} composition 汇总对象
 * @param {object} costParts 单条成本数据
 */
const addComposition = (composition, costParts) => {
  composition.softwareDevelopment += costParts.softwareDevelopment || 0;
  composition.systemIntegration += costParts.systemIntegration || 0;
  composition.operations += costParts.operations || 0;
  composition.travel += costParts.travel || 0;
  composition.risk += costParts.risk || 0;
};

/**
 * 从新的 snapshot 结构提取成本（包含字段别名）。
 * @param {object} snapshot calculation_snapshot 对象
 * @returns {object} 成本片段
 */
const extractSnapshotCosts = (snapshot = {}) => {
  return {
    softwareDevelopment: toNumber(snapshot.software_dev_cost || snapshot.softwareDevelopmentCost),
    systemIntegration: toNumber(snapshot.system_integration_cost || snapshot.systemIntegrationCost),
    operations: toNumber(
      snapshot.maintenance_cost || snapshot.operationsCost || snapshot.operations_cost
    ),
    travel: toNumber(snapshot.travel_cost || snapshot.travelCost),
    risk: toNumber(snapshot.risk_cost || snapshot.riskCost),
  };
};

/**
 * 从旧版评估结构中提取成本。
 * @param {object} details 评估详情对象
 * @returns {object} 成本片段
 */
const extractLegacyCosts = (details = {}) => {
  return {
    softwareDevelopment: toNumber(
      details.softwareDevelopmentCost || details.software_dev_cost || details.software_dev_total
    ),
    systemIntegration: toNumber(
      details.systemIntegrationCost || details.system_integration_cost || details.integrationCost
    ),
    operations: toNumber(
      details.operationsCost || details.operations_cost || details.maintenance_cost
    ),
    travel: toNumber(details.travelCost || details.travel_cost),
    risk: toNumber(details.riskCost || details.risk_cost),
  };
};

/**
 * 按人天与单价累加角色成本。
 * @param {object} roleCosts 角色成本汇总映射
 * @param {string} roleName 角色名称
 * @param {number} manDays 人天
 * @param {Map} rolePriceMap 角色单价映射
 */
const addRoleCost = (roleCosts, roleName, manDays, rolePriceMap) => {
  if (roleName === undefined || roleName === null) return;
  const days = toNumber(manDays);
  const unitPrice = toNumber(rolePriceMap.get(roleName) ?? 0);
  const subtotal = days * unitPrice;
  roleCosts[roleName] = (roleCosts[roleName] || 0) + subtotal;
};

/**
 * 从 role_costs 快照数组累加角色成本。
 * @param {object} roleCosts 角色成本汇总映射
 * @param {Array} roleCostItems role_costs 数组
 */
const collectFromRoleCostsArray = (roleCosts, roleCostItems = []) => {
  if (!Array.isArray(roleCostItems)) return;
  roleCostItems.forEach((item) => {
    const role = item?.role || item?.role_name;
    const subtotal = toNumber(item?.subtotal || item?.subtotalWan || item?.total);
    if (role) {
      roleCosts[role] = (roleCosts[role] || 0) + subtotal;
    }
  });
};

/**
 * 从新版 workload 数组累加角色成本。
 * @param {object} roleCosts 角色成本汇总映射
 * @param {Array} workloadItems development/integration workload 数组
 * @param {Map} rolePriceMap 角色单价映射
 */
const collectFromWorkloadArray = (roleCosts, workloadItems = [], rolePriceMap) => {
  if (!Array.isArray(workloadItems)) return;
  workloadItems.forEach((item) => {
    Object.entries(item || {}).forEach(([key, value]) => {
      if (NON_ROLE_KEYS.has(key)) return;
      if (value === undefined || value === null) return;
      addRoleCost(roleCosts, key, value, rolePriceMap);
    });
  });
};

/**
 * 从旧版 workload 结构累加角色成本。
 * @param {object} roleCosts 角色成本汇总映射
 * @param {object} workload 旧版 workload 对象
 * @param {Map} rolePriceMap 角色单价映射
 */
const collectFromLegacyWorkload = (roleCosts, workload = {}, rolePriceMap) => {
  const features = workload.newFeatures || [];
  const integrations = workload.systemIntegration || [];

  features.forEach((feature) => {
    const roles = feature.roles || {};
    Object.entries(roles).forEach(([roleName, days]) => {
      addRoleCost(roleCosts, roleName, days, rolePriceMap);
    });
  });

  integrations.forEach((integration) => {
    const roles = integration.roles || {};
    Object.entries(roles).forEach(([roleName, days]) => {
      addRoleCost(roleCosts, roleName, days, rolePriceMap);
    });
  });
};

// ------------------------------
// [Dashboard Refactor] New Dashboard (新接口)
// ------------------------------
// [Dashboard Refactor] /api/dashboard/overview
exports.getOverview = async () => {
  const [recentRow, standardRow, web3dRow, configCounts] = await Promise.all([
    dashboardModel.getRecentProjectCount(30),
    dashboardModel.getProjectCountStandard(),
    dashboardModel.getProjectCountWeb3d(),
    dashboardModel.getConfigCounts(),
  ]);

  let aiModels = { total: 0, current_name: null };
  try {
    aiModels = await dashboardModel.getAIModelCount();
  } catch (error) {
    logger.warn('Failed to query ai_model_configs for dashboard overview', {
      error: error?.message,
    });
  }

  return {
    recent_30d: recentRow?.count || 0,
    saas_count: standardRow?.count || 0,
    web3d_count: web3dRow?.count || 0,
    knowledge_assets: {
      risk_count: configCounts?.risk_count || 0,
      role_count: configCounts?.role_count || 0,
      web3d_risk_count: configCounts?.web3d_risk_count || 0,
      web3d_workload_template_count: configCounts?.web3d_workload_template_count || 0,
    },
    ai_models: {
      total: aiModels?.total || 0,
      current_name: aiModels?.current_name || null,
    },
  };
};

// [Dashboard Refactor] /api/dashboard/trend
exports.getTrend = async () => {
  const rows = await dashboardModel.getTrendLast12Months();
  return (rows || []).map((row) => {
    const avgCost = toNumber(row?.avg_total_cost_wan);
    const avgRisk = toNumber(row?.avg_risk_score);
    return {
      month: row?.month,
      project_type: row?.project_type || 'SaaS/平台',
      project_count: toNumber(row?.project_count),
      avg_total_cost_wan: roundTo(avgCost, 2),
      avg_risk_score: avgRisk ? Math.round(avgRisk) : 0,
    };
  });
};

// [Dashboard Refactor] /api/dashboard/cost-range
exports.getCostRange = async () => {
  const rows = await dashboardModel.getProjectCosts();
  const buckets = {
    '<50': 0,
    '50-100': 0,
    '100-300': 0,
    '>300': 0,
  };

  (rows || []).forEach((row) => {
    const cost = toNumber(row?.final_total_cost);
    if (!Number.isFinite(cost)) return;
    if (cost < 50) buckets['<50'] += 1;
    else if (cost < 100) buckets['50-100'] += 1;
    else if (cost < 300) buckets['100-300'] += 1;
    else buckets['>300'] += 1;
  });

  return [
    { range: '<50', count: buckets['<50'] },
    { range: '50-100', count: buckets['50-100'] },
    { range: '100-300', count: buckets['100-300'] },
    { range: '>300', count: buckets['>300'] },
  ];
};

// [Dashboard Refactor] /api/dashboard/keywords
exports.getKeywords = async () => {
  const rows = await dashboardModel.getAllProjectTextData();
  const joined = (rows || [])
    .map((r) => `${r?.name || ''} ${r?.description || ''}`.trim())
    .filter(Boolean)
    .join('\n');

  const configDir = path.join(__dirname, '..', 'config');
  const stopwordsFile = path.join(configDir, 'keyword-stopwords.txt');
  const keepwordsFile = path.join(configDir, 'keyword-keepwords.txt');
  const stopwordsFileExists = fs.existsSync(stopwordsFile);
  const keepwordsFileExists = fs.existsSync(keepwordsFile);
  const useFiles = stopwordsFileExists || keepwordsFileExists;

  const stopwords = stopwordsFileExists ? getWordListFromFile(stopwordsFile) : [];
  const keepwords = keepwordsFileExists ? getWordListFromFile(keepwordsFile) : [];

  const effectiveStopwords = useFiles ? stopwords : getDefaultStopwords();
  const effectiveKeepwords = useFiles ? keepwords : getDefaultKeepwords();
  const stopwordsSet = new Set(
    effectiveStopwords.map((w) => String(w).trim().toLowerCase()).filter(Boolean)
  );

  const counter = tokenizeKeywords(joined, effectiveKeepwords, stopwordsSet);
  const sorted = Object.entries(counter)
    .map(([word, weight]) => ({ word, weight }))
    .sort((a, b) => b.weight - a.weight || a.word.localeCompare(b.word));
  return sorted.slice(0, 50);
};

const averageOrZero = (values) => {
  const valid = (values || []).filter((v) => Number.isFinite(Number(v)));
  if (!valid.length) return 0;
  const sum = valid.reduce((acc, v) => acc + Number(v), 0);
  return sum / valid.length;
};

const extractProjectFactors = (details) => {
  const dev = Array.isArray(details?.development_workload) ? details.development_workload : [];
  const intg = Array.isArray(details?.integration_workload) ? details.integration_workload : [];
  const items = [...dev, ...intg];
  if (!items.length) {
    return { tech: 1, delivery: 1 };
  }
  const techFactors = items.map((it) => {
    const v = it?.tech_factor;
    return v === undefined || v === null ? 1 : toNumber(v) || 1;
  });
  const deliveryFactors = items.map((it) => {
    const v = it?.delivery_factor;
    return v === undefined || v === null ? 1 : toNumber(v) || 1;
  });
  return {
    tech: averageOrZero(techFactors) || 1,
    delivery: averageOrZero(deliveryFactors) || 1,
  };
};

// [Dashboard Refactor] /api/dashboard/dna
exports.getDNA = async () => {
  const rows = await dashboardModel.getAllAssessmentDetails();
  const costs = [];
  const risks = [];
  const workloads = [];
  const techFactors = [];
  const deliveryFactors = [];

  (rows || []).forEach((row) => {
    if (row?.final_total_cost !== undefined && row?.final_total_cost !== null) {
      costs.push(toNumber(row.final_total_cost));
    }
    if (row?.final_risk_score !== undefined && row?.final_risk_score !== null) {
      risks.push(toNumber(row.final_risk_score));
    }
    if (row?.final_workload_days !== undefined && row?.final_workload_days !== null) {
      workloads.push(toNumber(row.final_workload_days));
    }

    const details = safeParseDetails(row?.assessment_details_json);
    if (!details) {
      techFactors.push(1);
      deliveryFactors.push(1);
      return;
    }

    const factors = extractProjectFactors(details);
    techFactors.push(toNumber(factors.tech) || 1);
    deliveryFactors.push(toNumber(factors.delivery) || 1);
  });

  return {
    avg_total_cost_wan: roundTo(averageOrZero(costs), 2),
    avg_risk_score: risks.length ? Math.round(averageOrZero(risks)) : 0,
    avg_workload_days: roundTo(averageOrZero(workloads), 2),
    avg_tech_factor: roundTo(averageOrZero(techFactors) || 1, 4),
    avg_delivery_factor: roundTo(averageOrZero(deliveryFactors) || 1, 4),
  };
};

const addRoleDays = (roleDays, roleName, days) => {
  if (!roleName) return;
  const d = toNumber(days);
  roleDays[roleName] = (roleDays[roleName] || 0) + d;
};

const collectRoleDaysFromWorkloadArray = (roleDays, workloadItems = []) => {
  if (!Array.isArray(workloadItems)) return;
  workloadItems.forEach((item) => {
    Object.entries(item || {}).forEach(([key, value]) => {
      if (NON_ROLE_KEYS.has(key)) return;
      if (value === undefined || value === null) return;
      addRoleDays(roleDays, key, value);
    });
  });
};

const collectRoleDaysFromLegacyWorkload = (roleDays, workload = {}) => {
  const features = workload?.newFeatures || [];
  const integrations = workload?.systemIntegration || [];
  features.forEach((feature) => {
    const roles = feature?.roles || {};
    Object.entries(roles).forEach(([roleName, days]) => {
      addRoleDays(roleDays, roleName, days);
    });
  });
  integrations.forEach((integration) => {
    const roles = integration?.roles || {};
    Object.entries(roles).forEach(([roleName, days]) => {
      addRoleDays(roleDays, roleName, days);
    });
  });
};

// [Dashboard Refactor] /api/dashboard/top-roles
exports.getTopRoles = async () => {
  const rows = await dashboardModel.getAllAssessmentDetails();
  const roleDays = {};

  (rows || []).forEach((row) => {
    const details = safeParseDetails(row?.assessment_details_json);
    if (!details) return;
    collectRoleDaysFromWorkloadArray(roleDays, details.development_workload);
    collectRoleDaysFromWorkloadArray(roleDays, details.integration_workload);
    collectRoleDaysFromLegacyWorkload(roleDays, details.workload || {});
  });

  return Object.entries(roleDays)
    .map(([role_name, workload_days]) => ({ role_name, workload_days: roundTo(workload_days, 2) }))
    .sort((a, b) => b.workload_days - a.workload_days)
    .slice(0, 5);
};

// [Dashboard Refactor] /api/dashboard/top-risks
exports.getTopRisks = async () => {
  let riskConfigs = [];
  try {
    riskConfigs = await configModel.getAllRiskItems();
  } catch (error) {
    logger.warn('Failed to load config_risk_items for top-risks', { error: error?.message });
    return [];
  }
  const whitelist = new Set(
    (riskConfigs || [])
      .map((ri) => String(ri?.item_name || '').trim())
      .filter(Boolean)
  );

  const rows = await dashboardModel.getAllAssessmentDetails();
  const counts = {};

  (rows || []).forEach((row) => {
    const details = safeParseDetails(row?.assessment_details_json);
    if (!details) return;

    // 旧结构：risk_scores 为对象，只统计分数 >= 35 的风险项（中高风险）
    if (details?.risk_scores && typeof details.risk_scores === 'object' && !Array.isArray(details.risk_scores)) {
      Object.entries(details.risk_scores).forEach(([name, score]) => {
        const normalized = String(name || '').trim();
        if (!normalized) return;
        if (!whitelist.has(normalized)) return;
        // 只统计中高风险（分数 >= 35）
        if (typeof score === 'number' && score >= 35) {
          counts[normalized] = (counts[normalized] || 0) + 1;
        }
      });
    }

    // 新结构：risk_items 为数组
    if (Array.isArray(details?.risk_items)) {
      details.risk_items.forEach((ri) => {
        const name = ri?.item || ri?.item_name || ri?.name;
        const normalized = String(name || '').trim();
        if (!normalized) return;
        if (!whitelist.has(normalized)) return;
        counts[normalized] = (counts[normalized] || 0) + 1;
      });
    }
  });

  return Object.entries(counts)
    .map(([risk_name, count]) => ({
      // 移除英文后缀，如 "项目阶段 (project_phase)" -> "项目阶段"
      risk_name: risk_name.replace(/\s*\([^)]+\)\s*$/, '').trim(),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.risk_name.localeCompare(b.risk_name))
    .slice(0, 10);
};
