const { validatePush, executePush } = require('../services/pushService');
const pushRecordModel = require('../models/pushRecordModel');
const { validationError, internalError } = require('../utils/errors');

/**
 * 推送前置校验 POST /:id/push/validate
 */
async function validatePushHandler(req, res, next) {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { customerBudget } = req.body;

    if (customerBudget === undefined || customerBudget === null) {
      throw validationError('请提供客户预算');
    }

    const result = await validatePush(projectId, Number(customerBudget));
    res.json({
      success: true,
      data: {
        hasBusinessQuote: !!result.project.business_quote_json,
        attachmentCount: result.attachments.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 推送执行 POST /:id/push
 */
async function pushProject(req, res, next) {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { customerBudget } = req.body;

    if (customerBudget === undefined || customerBudget === null) {
      throw validationError('请提供客户预算');
    }

    const result = await executePush(projectId, Number(customerBudget));

    if (!result.success) {
      const error = internalError(result.error);
      next(error);
      return;
    }

    res.json({
      success: true,
      data: {
        pushId: result.pushId,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 推送历史查询 GET /:id/push-history
 */
async function getPushHistory(req, res, next) {
  try {
    const projectId = parseInt(req.params.id, 10);

    const project = await pushRecordModel.ensureSchema();
    const history = await pushRecordModel.getProjectPushHistory(projectId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  validatePushHandler,
  pushProject,
  getPushHistory,
};
