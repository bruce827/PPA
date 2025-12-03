const web3dConfigService = require('../services/web3dConfigService');

// 风险项
exports.getRiskItems = async (req, res, next) => {
  try {
    const items = await web3dConfigService.getRiskItems();
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
};

exports.createRiskItem = async (req, res, next) => {
  try {
    const result = await web3dConfigService.createRiskItem(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateRiskItem = async (req, res, next) => {
  try {
    const result = await web3dConfigService.updateRiskItem(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deleteRiskItem = async (req, res, next) => {
  try {
    const result = await web3dConfigService.deleteRiskItem(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// 工作量模板
exports.getWorkloadTemplates = async (req, res, next) => {
  try {
    const templates = await web3dConfigService.getWorkloadTemplates();
    res.json({ data: templates });
  } catch (error) {
    next(error);
  }
};

exports.createWorkloadTemplate = async (req, res, next) => {
  try {
    const result = await web3dConfigService.createWorkloadTemplate(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateWorkloadTemplate = async (req, res, next) => {
  try {
    const result = await web3dConfigService.updateWorkloadTemplate(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deleteWorkloadTemplate = async (req, res, next) => {
  try {
    const result = await web3dConfigService.deleteWorkloadTemplate(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
