// zod v4: must extend before any `.openapi()` usage; this is a global side
// effect that must run exactly once for the single zod module instance shared
// by every schema file. Keep this the earliest require in the contract chain.
const { z } = require('zod');
const {
  OpenAPIRegistry,
  extendZodWithOpenApi,
} = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

/**
 * Thin helper over `registry.registerPath` for the common case: JSON request
 * (body/query/params via zod schemas) and a single JSON response. Keeps the
 * per-route registration blocks terse and uniform without hiding the fact that
 * registration and routing are written in two places (style A, see plan §1.4).
 *
 * @param {object} def
 * @param {'get'|'post'|'put'|'delete'|'patch'} def.method
 * @param {string} def.path                      full path, e.g. '/api/projects'
 * @param {string[]} def.tags
 * @param {string} def.summary
 * @param {import('zod').ZodTypeAny} [def.params]
 * @param {import('zod').ZodTypeAny} [def.query]
 * @param {import('zod').ZodTypeAny} [def.body]
 * @param {import('zod').ZodTypeAny} [def.response] JSON response data envelope
 * @param {string} [def.responseDescription]
 * @param {number} [def.status]                   response status (default 200)
 * @param {object} [def.rawResponse]              non-JSON response (binary, etc.)
 * @param {Array<object>} [def.security]
 */
function registerRoute(def) {
  const {
    method,
    path,
    tags,
    summary,
    params,
    query,
    body,
    response,
    responseDescription = '成功',
    status = 200,
    rawResponse,
    security,
  } = def;

  const request = {};
  if (params) request.params = params;
  if (query) request.query = query;
  if (body) {
    request.body = {
      content: { 'application/json': { schema: body } },
    };
  }

  const responses = {};
  if (rawResponse) {
    responses[status] = rawResponse;
  } else {
    responses[status] = {
      description: responseDescription,
      content: { 'application/json': { schema: response } },
    };
  }

  const pathDef = {
    method,
    path,
    summary,
    responses,
  };
  if (tags) pathDef.tags = tags;
  if (Object.keys(request).length) pathDef.request = request;
  if (security) pathDef.security = security;

  registry.registerPath(pathDef);
}

module.exports = { registry, registerRoute };
