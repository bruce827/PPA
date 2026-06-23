const { URL } = require('url');
const openaiProvider = require('./openaiProvider');

function normalizeApiHost(apiHost) {
  if (!apiHost) return apiHost;

  let url;
  try {
    url = new URL(apiHost);
  } catch (_error) {
    return apiHost;
  }

  const pathname = url.pathname || '/';

  if (pathname === '/' || pathname === '') {
    url.pathname = '/v1/chat/completions';
    return url.toString();
  }

  if (pathname === '/v1' || pathname === '/v1/') {
    url.pathname = '/v1/chat/completions';
    return url.toString();
  }

  return url.toString();
}

async function createRiskAssessment(params = {}) {
  return openaiProvider.createRiskAssessment({
    ...params,
    api_host: normalizeApiHost(params.api_host),
  });
}

module.exports = {
  createRiskAssessment,
  normalizeApiHost,
};
