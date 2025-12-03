const web3dConfigModel = require('../models/web3dConfigModel');

const normalizeOptionsJSON = (options) => {
  let arr = options;

  if (typeof options === 'string') {
    try {
      arr = JSON.parse(options);
    } catch (err) {
      const error = new Error('选项列表必须是合法的 JSON');
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
  }

  if (!Array.isArray(arr)) {
    const error = new Error('选项列表必须是数组或 JSON 字符串');
    error.name = 'ValidationError';
    error.statusCode = 400;
    throw error;
  }

  const seenValues = new Set();
  arr.forEach((opt, idx) => {
    const numeric = Number(opt?.value);
    if (!Number.isFinite(numeric)) {
      const error = new Error(`选项第 ${idx + 1} 行的分值必须是数字`);
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    const key = String(numeric);
    if (seenValues.has(key)) {
      const error = new Error('选项的分值不能重复');
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    seenValues.add(key);
  });

  return JSON.stringify(arr);
};

const assertString = (value, field) => {
  if (!value || typeof value !== 'string') {
    const error = new Error(`${field} is required`);
    error.name = 'ValidationError';
    error.statusCode = 400;
    throw error;
  }
};

const assertPositiveNumber = (value, field) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    const error = new Error(`${field} must be a positive number`);
    error.name = 'ValidationError';
    error.statusCode = 400;
    throw error;
  }
  return num;
};

const assertCategory = (value) => {
  if (!web3dConfigModel.WORKLOAD_CATEGORIES.includes(value)) {
    const error = new Error(
      `category must be one of ${web3dConfigModel.WORKLOAD_CATEGORIES.join(', ')}`
    );
    error.name = 'ValidationError';
    error.statusCode = 400;
    throw error;
  }
};

// ============ 风险项 ============ //

const getRiskItems = () => web3dConfigModel.getRiskItems();

const createRiskItem = async (payload) => {
  assertString(payload.step_name, 'step_name');
  assertString(payload.item_name, 'item_name');
  const normalized = {
    step_order: assertPositiveNumber(payload.step_order, 'step_order'),
    step_name: payload.step_name,
    item_name: payload.item_name,
    description: payload.description || '',
    weight: assertPositiveNumber(payload.weight || 1, 'weight'),
    options_json: normalizeOptionsJSON(payload.options_json)
  };
  return await web3dConfigModel.createRiskItem(normalized);
};

const updateRiskItem = async (id, payload) => {
  assertString(payload.step_name, 'step_name');
  assertString(payload.item_name, 'item_name');
  const normalized = {
    step_order: assertPositiveNumber(payload.step_order, 'step_order'),
    step_name: payload.step_name,
    item_name: payload.item_name,
    description: payload.description || '',
    weight: assertPositiveNumber(payload.weight || 1, 'weight'),
    options_json: normalizeOptionsJSON(payload.options_json)
  };
  return await web3dConfigModel.updateRiskItem(id, normalized);
};

const deleteRiskItem = (id) => web3dConfigModel.deleteRiskItem(id);

// ============ 工作量模板 ============ //

const getWorkloadTemplates = () => web3dConfigModel.getWorkloadTemplates();

const createWorkloadTemplate = async (payload) => {
  assertCategory(payload.category);
  assertString(payload.item_name, 'item_name');
  const normalized = {
    category: payload.category,
    item_name: payload.item_name,
    description: payload.description || '',
    base_days: assertPositiveNumber(payload.base_days, 'base_days'),
    unit: payload.unit || ''
  };
  return await web3dConfigModel.createWorkloadTemplate(normalized);
};

const updateWorkloadTemplate = async (id, payload) => {
  assertCategory(payload.category);
  assertString(payload.item_name, 'item_name');
  const normalized = {
    category: payload.category,
    item_name: payload.item_name,
    description: payload.description || '',
    base_days: assertPositiveNumber(payload.base_days, 'base_days'),
    unit: payload.unit || ''
  };
  return await web3dConfigModel.updateWorkloadTemplate(id, normalized);
};

const deleteWorkloadTemplate = (id) =>
  web3dConfigModel.deleteWorkloadTemplate(id);

module.exports = {
  // 风险项
  getRiskItems,
  createRiskItem,
  updateRiskItem,
  deleteRiskItem,
  // 工作量模板
  getWorkloadTemplates,
  createWorkloadTemplate,
  updateWorkloadTemplate,
  deleteWorkloadTemplate
};
