const crypto = require('crypto');
const aiPromptService = require('../services/aiPromptService');
const aiRiskAssessmentService = require('../services/aiRiskAssessmentService');
const aiModuleAnalysisService = require('../services/aiModuleAnalysisService');
const aiWorkloadEvaluationService = require('../services/aiWorkloadEvaluationService');
const aiProjectTaggingService = require('../services/aiProjectTaggingService');
const logger = require('../utils/logger');
const { internalError } = require('../utils/errors');

async function getPrompts(req, res, next) {
  const startedAt = Date.now();
  try {
    // 仅获取“风险分析”类别的提示词模板，用于风险 AI 评估
    const prompts = await aiPromptService.getPromptsByCategory('risk_analysis');

    const durationMs = Date.now() - startedAt;

    logger.info('提示词查询成功', {
      route: 'GET /api/ai/prompts',
      category: 'risk_analysis',
      count: prompts.length,
      durationMs,
    });

    res.json({ success: true, data: prompts });
  } catch (error) {
    logger.error('获取 AI 提示词失败', {
      route: 'GET /api/ai/prompts',
      error: error.message,
    });

    next(error.statusCode ? error : internalError('获取提示词失败'));
  }
}

async function getModulePrompts(req, res, next) {
  const startedAt = Date.now();
  try {
    const prompts = await aiPromptService.getPromptsByCategory('module_analysis');
    const durationMs = Date.now() - startedAt;
    logger.info('模块梳理提示词查询成功', {
      route: 'GET /api/ai/module-prompts',
      count: prompts.length,
      durationMs,
    });

    res.json({ success: true, data: prompts });
  } catch (error) {
    logger.error('获取 模块梳理 提示词失败', {
      route: 'GET /api/ai/module-prompts',
      error: error.message,
    });
    next(error.statusCode ? error : internalError('获取模块梳理提示词失败'));
  }
}

async function getWorkloadPrompts(req, res, next) {
  const startedAt = Date.now();
  try {
    const prompts = await aiPromptService.getPromptsByCategory('workload_evaluation');
    const durationMs = Date.now() - startedAt;
    logger.info('工作量评估提示词查询成功', {
      route: 'GET /api/ai/workload-prompts',
      count: prompts.length,
      durationMs,
    });

    res.json({ success: true, data: prompts });
  } catch (error) {
    logger.error('获取 工作量评估 提示词失败', {
      route: 'GET /api/ai/workload-prompts',
      error: error.message,
    });
    next(error.statusCode ? error : internalError('获取工作量评估提示词失败'));
  }
}

async function getProjectTagPrompts(req, res, next) {
  const startedAt = Date.now();
  try {
    const prompts = await aiPromptService.getPromptsByCategory('project_tagging');
    const durationMs = Date.now() - startedAt;
    logger.info('项目标签提示词查询成功', {
      route: 'GET /api/ai/project-tag-prompts',
      category: 'project_tagging',
      count: prompts.length,
      durationMs,
    });

    res.json({ success: true, data: prompts });
  } catch (error) {
    logger.error('获取 项目标签 提示词失败', {
      route: 'GET /api/ai/project-tag-prompts',
      error: error.message,
    });

    next(error.statusCode ? error : internalError('获取项目标签提示词失败'));
  }
}

async function generateProjectTags(req, res, next) {
  const startedAt = Date.now();
  const { promptId, projectId } = req.body || {};
  try {
    const result = await aiProjectTaggingService.generateProjectTags(req.body || {});
    const durationMs = Date.now() - startedAt;

    logger.info('AI 项目标签生成成功', {
      route: 'POST /api/ai/generate-project-tags',
      promptId,
      projectId,
      durationMs,
      tagsCount: Array.isArray(result?.tags) ? result.tags.length : 0,
      model: result?.model_used,
    });

    res.json({ success: true, data: { tags: result?.tags || [] } });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logger.error('AI 项目标签生成失败', {
      route: 'POST /api/ai/generate-project-tags',
      promptId,
      projectId,
      durationMs,
      error: error.message,
      statusCode: error.statusCode || 500,
    });

    if (error.statusCode) {
      next(error);
    } else {
      next(internalError('AI 项目标签生成失败'));
    }
  }
}

async function assessRisk(req, res, next) {
  const startedAt = Date.now();
  const { promptId, document } = req.body || {};
  const documentHash = crypto.createHash('sha256').update(document || '').digest('hex');

  try {
    const result = await aiRiskAssessmentService.assessRisk(req.body || {});
    const durationMs = Date.now() - startedAt;

    logger.info('AI 风险评估成功', {
      route: 'POST /api/ai/assess-risk',
      promptId,
      documentHash,
      durationMs,
    });

    // 追加返回数据日志（用于评估匹配成效）
    try {
      const parsed = result?.parsed || {};
      const riskScores = Array.isArray(parsed?.risk_scores) ? parsed.risk_scores : [];
      logger.info('AI 评估返回数据', {
        route: 'POST /api/ai/assess-risk',
        promptId,
        riskScoreCount: riskScores.length,
        itemNames: riskScores.map((x) => x?.item_name).filter(Boolean),
        parsed,
      });
    } catch (e) {}

    res.json({ success: true, data: result });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logger.error('AI 风险评估失败', {
      route: 'POST /api/ai/assess-risk',
      promptId,
      documentHash,
      durationMs,
      error: error.message,
      statusCode: error.statusCode || 500,
    });

    if (error.statusCode) {
      next(error);
    } else {
      next(internalError('AI 风险评估失败'));
    }
  }
}

async function normalizeRiskNames(req, res, next) {
  const startedAt = Date.now();
  try {
    const result = await aiRiskAssessmentService.normalizeRiskNames(req.body || {});
    const durationMs = Date.now() - startedAt;
    logger.info('AI 风险项名称归一成功', {
      route: 'POST /api/ai/normalize-risk-names',
      durationMs,
    });
    // 追加返回数据日志（用于统计名称归一命中率）
    try {
      const parsed = result?.parsed || {};
      const riskScores = Array.isArray(parsed?.risk_scores) ? parsed.risk_scores : [];
      logger.info('AI 名称归一返回数据', {
        route: 'POST /api/ai/normalize-risk-names',
        riskScoreCount: riskScores.length,
        itemNames: riskScores.map((x) => x?.item_name).filter(Boolean),
        parsed,
      });
    } catch (e) {}
    res.json({ success: true, data: result });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logger.error('AI 风险项名称归一失败', {
      route: 'POST /api/ai/normalize-risk-names',
      durationMs,
      error: error.message,
      statusCode: error.statusCode || 500,
    });
    if (error.statusCode) {
      next(error);
    } else {
      next(internalError('AI 风险项名称归一失败'));
    }
  }
}

async function analyzeProjectModules(req, res, next) {
  const startedAt = Date.now();
  try {
    const result = await aiModuleAnalysisService.analyzeProjectModules(req.body || {});
    const durationMs = Date.now() - startedAt;
    logger.info('AI 模块梳理成功', {
      route: 'POST /api/ai/analyze-project-modules',
      durationMs,
      moduleCount: Array.isArray(result?.modules) ? result.modules.length : 0,
      model: result?.model_used,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logger.error('AI 模块梳理失败', {
      route: 'POST /api/ai/analyze-project-modules',
      durationMs,
      error: error.message,
      statusCode: error.statusCode || 500,
    });
    if (error.statusCode) {
      next(error);
    } else {
      next(internalError('AI 模块梳理失败'));
    }
  }
}

async function evaluateWorkload(req, res, next) {
  const startedAt = Date.now();
  const { promptId, module1, module2, module3 } = req.body || {};
  try {
    const result = await aiWorkloadEvaluationService.evaluateWorkload(req.body || {});
    const durationMs = Date.now() - startedAt;
    logger.info('AI 工作量评估成功', {
      route: 'POST /api/ai/evaluate-workload',
      promptId,
      module1,
      module2,
      module3,
      durationMs,
      model: result?.model_used,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logger.error('AI 工作量评估失败', {
      route: 'POST /api/ai/evaluate-workload',
      promptId,
      module1,
      module2,
      module3,
      durationMs,
      error: error.message,
      statusCode: error.statusCode || 500,
    });
    if (error.statusCode) {
      next(error);
    } else {
      next(internalError('AI 工作量评估失败'));
    }
  }
}

module.exports = {
  getPrompts,
  getModulePrompts,
  getWorkloadPrompts,
  getProjectTagPrompts,
  assessRisk,
  normalizeRiskNames,
  analyzeProjectModules,
  evaluateWorkload,
  generateProjectTags,
};
