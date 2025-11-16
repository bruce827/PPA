const aiModelService = require('../services/aiModelService');

/**
 * 获取所有 AI 模型配置列表
 */
exports.getAIModels = async (req, res, next) => {
  try {
    const models = await aiModelService.getAllModels();
    res.json({
      success: true,
      data: models,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个 AI 模型配置详情
 */
exports.getAIModel = async (req, res, next) => {
  try {
    const model = await aiModelService.getModelById(req.params.id);
    res.json({
      success: true,
      data: model,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建新的 AI 模型配置
 */
exports.createAIModel = async (req, res, next) => {
  try {
    const newModel = await aiModelService.createModel(req.body);
    res.status(201).json({
      success: true,
      data: newModel,
      message: 'AI 模型配置创建成功',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新 AI 模型配置
 */
exports.updateAIModel = async (req, res, next) => {
  try {
    const updatedModel = await aiModelService.updateModel(req.params.id, req.body);
    res.json({
      success: true,
      data: updatedModel,
      message: 'AI 模型配置更新成功',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除 AI 模型配置
 */
exports.deleteAIModel = async (req, res, next) => {
  try {
    await aiModelService.deleteModel(req.params.id);
    res.json({
      success: true,
      message: 'AI 模型配置删除成功',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 设置当前使用的模型
 */
exports.setCurrentModel = async (req, res, next) => {
  try {
    const updatedModel = await aiModelService.setCurrentModel(req.params.id);
    res.json({
      success: true,
      data: updatedModel,
      message: `已成功将 "${updatedModel.config_name}" 设置为当前使用的模型`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前使用的模型
 */
exports.getCurrentModel = async (req, res, next) => {
  try {
    const currentModel = await aiModelService.getCurrentModel();
    res.json({
      success: true,
      data: currentModel,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 测试 AI 模型连接
 */
exports.testAIModel = async (req, res, next) => {
  try {
    const testResult = await aiModelService.testModelConnection(req.params.id);

    // 返回测试结果
    if (testResult.success) {
      res.json({
        success: true,
        message: testResult.message,
        data: {
          duration: testResult.duration,
          status: 'success',
          details: testResult.details
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: testResult.message,
        data: {
          duration: testResult.duration,
          status: 'failed',
          error: testResult.error
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 临时测试 AI 模型连接（不保存到数据库）
 * 用于表单内测试当前填写的配置
 */
exports.testAIModelTemp = async (req, res, next) => {
  try {
    const testResult = await aiModelService.testTempConnection(req.body || {});

    // 返回测试结果（不更新数据库）
    if (testResult.success) {
      res.json({
        success: true,
        message: testResult.message,
        data: {
          duration: testResult.duration,
          status: 'success',
          details: testResult.details
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: testResult.message,
        data: {
          duration: testResult.duration,
          status: 'failed',
          error: testResult.error
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
