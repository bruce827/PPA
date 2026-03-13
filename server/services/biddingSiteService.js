const biddingSiteModel = require('../models/biddingSiteModel');
const biddingSiteValidationService = require('./biddingSiteValidationService');
const { HttpError, validationError } = require('../utils/errors');

const VALIDATION_STATUS = [
  'never_validated',
  'validated_ok',
  'validated_warning',
  'validated_failed',
  'heuristic_only',
];

function normalizeText(value, maxLength = null) {
  if (value === null || typeof value === 'undefined') return null;
  const text = String(value).trim();
  if (!text) return null;
  return maxLength ? text.slice(0, maxLength) : text;
}

function normalizeBoolean(value, fieldName, defaultValue = null) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return defaultValue;
  }
  if (value === true || value === false) return value;
  if (value === 1 || value === 0) return Boolean(value);
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y'].includes(lowered)) return true;
    if (['0', 'false', 'no', 'n'].includes(lowered)) return false;
  }
  throw validationError(`${fieldName} 必须是布尔值`);
}

function normalizeListBoolean(value) {
  if (value === null || typeof value === 'undefined' || value === '') return undefined;
  return normalizeBoolean(value, 'query', null);
}

function normalizeUrl(rawUrl) {
  const input = normalizeText(rawUrl, 2000);
  if (!input) {
    throw validationError('url 为必填字段');
  }

  if (!/^https?:\/\//i.test(input)) {
    throw validationError('url 必须以 http:// 或 https:// 开头');
  }

  let parsed = null;
  try {
    parsed = new URL(input);
  } catch (_error) {
    throw validationError('url 不是合法地址');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw validationError('仅支持 http 或 https 地址');
  }

  if (!parsed.hostname) {
    throw validationError('url 缺少主机名');
  }

  const rawMatch = input.match(/^(https?):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i);
  const rawPath = rawMatch ? rawMatch[3] || '' : '';
  const rawSearch = rawMatch ? rawMatch[4] || '' : parsed.search || '';
  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const hasDefaultPort =
    (protocol === 'http:' && parsed.port === '80') ||
    (protocol === 'https:' && parsed.port === '443');
  const port = hasDefaultPort ? '' : parsed.port;
  const auth =
    parsed.username || parsed.password
      ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@`
      : '';
  const pathPart = rawPath === '' ? '' : parsed.pathname;
  const normalizedUrl = `${protocol}//${auth}${hostname}${port ? `:${port}` : ''}${pathPart}${rawSearch}`;

  return {
    url: input,
    normalized_url: normalizedUrl,
  };
}

function mergeAliasName(existingValue, incomingValue) {
  const values = [existingValue, incomingValue]
    .map((item) => normalizeText(item, 200))
    .filter(Boolean);

  if (values.length === 0) return null;

  const uniqueValues = [];
  const seen = new Set();
  values
    .flatMap((item) => item.split(/[、/]/).map((segment) => segment.trim()))
    .filter(Boolean)
    .forEach((item) => {
      if (!seen.has(item)) {
        seen.add(item);
        uniqueValues.push(item);
      }
    });

  return uniqueValues.join(' / ');
}

function normalizeBasePayload(payload = {}) {
  const name = normalizeText(payload.name, 120);
  if (!name) {
    throw validationError('name 为必填字段');
  }

  const { url, normalized_url } = normalizeUrl(payload.url);

  return {
    name,
    alias_name: normalizeText(payload.alias_name, 200),
    url,
    normalized_url,
    source_level: normalizeText(payload.source_level, 40),
    province: normalizeText(payload.province, 40),
    city: normalizeText(payload.city, 40),
    platform_type: normalizeText(payload.platform_type, 60),
    is_official: normalizeBoolean(payload.is_official, 'is_official', false),
    enabled: normalizeBoolean(payload.enabled, 'enabled', true),
    notes: normalizeText(payload.notes, 2000),
    validation_status: VALIDATION_STATUS.includes(payload.validation_status)
      ? payload.validation_status
      : 'never_validated',
  };
}

function normalizeListQuery(query = {}) {
  const page = Math.max(parseInt(query.current || query.page || '1', 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(parseInt(query.pageSize || '20', 10) || 20, 1),
    200
  );

  return {
    page,
    pageSize,
    keyword: normalizeText(query.keyword, 120),
    source_level: normalizeText(query.source_level, 40),
    platform_type: normalizeText(query.platform_type, 60),
    validation_status: normalizeText(query.validation_status, 40),
    is_official: normalizeListBoolean(query.is_official),
    enabled: normalizeListBoolean(query.enabled),
  };
}

async function assertUniqueNormalizedUrl(normalizedUrl, excludeId = null) {
  const existing = await biddingSiteModel.getBiddingSiteByNormalizedUrl(normalizedUrl);
  if (existing && String(existing.id) !== String(excludeId || '')) {
    throw validationError('该网址已存在，请勿重复创建');
  }
}

async function getRequiredSite(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw validationError('id 必须是正整数');
  }

  const site = await biddingSiteModel.getBiddingSiteById(numericId);
  if (!site) {
    throw new HttpError(404, '招标网站不存在', 'NotFoundError');
  }

  return site;
}

async function listBiddingSites(query) {
  return biddingSiteModel.listBiddingSites(normalizeListQuery(query));
}

async function getBiddingSiteById(id) {
  return getRequiredSite(id);
}

async function createBiddingSite(payload) {
  const normalized = normalizeBasePayload(payload);
  await assertUniqueNormalizedUrl(normalized.normalized_url);
  return biddingSiteModel.createBiddingSite(normalized);
}

async function updateBiddingSite(id, payload) {
  const site = await getRequiredSite(id);
  const normalized = normalizeBasePayload(payload);
  await assertUniqueNormalizedUrl(normalized.normalized_url, site.id);
  return biddingSiteModel.updateBiddingSite(site.id, normalized);
}

async function deleteBiddingSite(id) {
  const site = await getRequiredSite(id);
  await biddingSiteModel.deleteBiddingSite(site.id);
  return { id: site.id };
}

async function validateBiddingSite(id) {
  const site = await getRequiredSite(id);
  const validationResult = await biddingSiteValidationService.validateBiddingSite(site);

  await biddingSiteModel.updateValidationResult(site.id, validationResult);
  const updated = await biddingSiteModel.getBiddingSiteById(site.id);

  return {
    site: updated,
    validation: {
      validation_status: validationResult.validation_status,
      validation_summary: validationResult.validation_summary,
      auth_required: validationResult.auth_required,
      is_bidding_site: validationResult.is_bidding_site,
      http_status: validationResult.http_status,
      final_url: validationResult.final_url,
      redirect_chain: JSON.parse(validationResult.redirect_chain_json || '[]'),
      validation_confidence: validationResult.validation_confidence,
      validation_payload: validationResult.validation_payload,
      last_validated_at: validationResult.last_validated_at,
    },
  };
}

async function upsertSeedSite(payload) {
  const normalized = normalizeBasePayload(payload);
  const existing = await biddingSiteModel.getBiddingSiteByNormalizedUrl(normalized.normalized_url);

  if (!existing) {
    return biddingSiteModel.createBiddingSite(normalized);
  }

  const merged = {
    ...normalized,
    alias_name: mergeAliasName(existing.alias_name, normalized.alias_name),
    enabled: typeof existing.enabled === 'boolean' ? existing.enabled : normalized.enabled,
    notes: existing.notes || normalized.notes,
  };

  return biddingSiteModel.updateBiddingSite(existing.id, merged);
}

module.exports = {
  VALIDATION_STATUS,
  normalizeUrl,
  listBiddingSites,
  getBiddingSiteById,
  createBiddingSite,
  updateBiddingSite,
  deleteBiddingSite,
  validateBiddingSite,
  upsertSeedSite,
};
