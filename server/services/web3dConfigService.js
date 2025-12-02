const web3dConfigModel = require('../models/web3dConfigModel');

const parseOptionsJSON = (options) => {
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return JSON.stringify(parsed);
    } catch (err) {
      const error = new Error('options_json must be valid JSON');
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
  }
  if (Array.isArray(options)) {
    return JSON.stringify(options);
  }
  const error = new Error('options_json must be an array or JSON string');
  error.name = 'ValidationError';
  error.statusCode = 400;
  throw error;
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
    options_json: parseOptionsJSON(payload.options_json)
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
    options_json: parseOptionsJSON(payload.options_json)
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
