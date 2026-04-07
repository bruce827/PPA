const { validationError } = require('../../utils/errors');
const geminiVisionProvider = require('./geminiVisionProvider');
const minimaxVisionProvider = require('./minimaxVisionProvider');

function normalizeProviderName(raw) {
  if (!raw) return '';
  return String(raw).toLowerCase();
}

function selectVisionProvider(providerLabel) {
  const name = normalizeProviderName(providerLabel);

  if (name.includes('google') || name.includes('gemini')) {
    return {
      key: 'gemini-vision',
      impl: geminiVisionProvider,
    };
  }

  if (name.includes('minimax')) {
    return {
      key: 'minimax-vision',
      impl: minimaxVisionProvider,
    };
  }

  throw validationError(`当前视觉模型 provider 不支持 Step4 图片分析：${providerLabel || 'unknown'}`);
}

module.exports = {
  selectVisionProvider,
};
