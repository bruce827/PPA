const openaiProvider = require('./openaiProvider');
const geminiProvider = require('./geminiProvider');

function normalizeProviderName(raw) {
  if (!raw) return '';
  return String(raw).toLowerCase();
}

function selectProvider(providerLabel) {
  const name = normalizeProviderName(providerLabel);

  if (name.includes('google') || name.includes('gemini')) {
    return {
      key: 'gemini',
      impl: geminiProvider,
    };
  }

  return {
    key: 'openai-compatible',
    impl: openaiProvider,
  };
}

module.exports = {
  selectProvider,
};
