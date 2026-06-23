const multer = require('multer');

const web3dAiStep4Service = require('../services/web3dAiStep4Service');
const { validationError } = require('../utils/errors');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: web3dAiStep4Service.MAX_IMAGE_COUNT,
    fileSize: web3dAiStep4Service.MAX_IMAGE_SIZE,
  },
});

function parseJsonField(value, fieldName, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    throw validationError(`${fieldName} 必须是合法的 JSON 字符串`);
  }
}

async function getStep4Prompts(req, res, next) {
  try {
    const prompts = await web3dAiStep4Service.getStep4Prompts();
    res.json({ success: true, data: prompts });
  } catch (error) {
    next(error);
  }
}

async function analyzeStep4(req, res, next) {
  try {
    const result = await web3dAiStep4Service.analyzeStep4({
      promptId: req.body?.promptId,
      variables: parseJsonField(req.body?.variables_json, 'variables_json', {}),
      context: parseJsonField(req.body?.context_json, 'context_json', null),
      images: Array.isArray(req.files) ? req.files : [],
      projectId: req.body?.projectId ? Number(req.body.projectId) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadStep4Images: upload.array('images', web3dAiStep4Service.MAX_IMAGE_COUNT),
  getStep4Prompts,
  analyzeStep4,
};
