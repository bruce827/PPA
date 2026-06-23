const openaiProvider = require('./openaiProvider');
const cherryStudioProvider = require('./cherryStudioProvider');
const geminiProvider = require('./geminiProvider');
const tavilyProvider = require('./tavilyProvider');

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

  if (name.includes('cherry')) {
    return {
      key: 'cherry-studio',
      impl: cherryStudioProvider,
    };
  }

  if (name.includes('tavily')) {
    return {
      key: 'tavily',
      impl: tavilyProvider,
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
