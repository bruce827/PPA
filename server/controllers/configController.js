const configModel = require('../models/configModel');

// ============ 角色配置 ============

exports.getAllRoles = async (req, res, next) => {
  try {
    const roles = await configModel.getAllRoles();
    res.json({ data: roles });
  } catch (error) {
    next(error);
  }
};

exports.createRole = async (req, res, next) => {
  try {
    const result = await configModel.createRole(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const result = await configModel.updateRole(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deleteRole = async (req, res, next) => {
  try {
    const result = await configModel.deleteRole(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ============ 风险评估项 ============

exports.getAllRiskItems = async (req, res, next) => {
  try {
    const items = await configModel.getAllRiskItems();
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
};

exports.createRiskItem = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (payload.options_json !== undefined) {
      payload.options_json = parseOptionsJSON(payload.options_json);
    }
    const result = await configModel.createRiskItem(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateRiskItem = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (payload.options_json !== undefined) {
      payload.options_json = parseOptionsJSON(payload.options_json);
    }
    const result = await configModel.updateRiskItem(req.params.id, payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deleteRiskItem = async (req, res, next) => {
  try {
    const result = await configModel.deleteRiskItem(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ============ 差旅成本 ============

exports.getAllTravelCosts = async (req, res, next) => {
  try {
    const costs = await configModel.getAllTravelCosts();
    res.json({ data: costs });
  } catch (error) {
    next(error);
  }
};

exports.createTravelCost = async (req, res, next) => {
  try {
    const result = await configModel.createTravelCost(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateTravelCost = async (req, res, next) => {
  try {
    const result = await configModel.updateTravelCost(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deleteTravelCost = async (req, res, next) => {
  try {
    const result = await configModel.deleteTravelCost(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ============ 聚合配置 ============

exports.getAllConfigs = async (req, res, next) => {
  try {
    const configs = await configModel.getAllConfigs();
    res.json({ data: configs });
  } catch (error) {
    next(error);
  }
};

/**
 * 校验并规范化 options_json 字段
 */
function parseOptionsJSON(optionsJSON) {
  if (typeof optionsJSON !== 'string') {
    const error = new Error('options_json must be a JSON string');
    error.name = 'ValidationError';
    error.statusCode = 400;
    throw error;
  }

  try {
    const parsed = JSON.parse(optionsJSON);
    return JSON.stringify(parsed);
  } catch (err) {
    const error = new Error('options_json must be valid JSON');
    error.name = 'ValidationError';
    error.statusCode = 400;
    throw error;
  }
}
