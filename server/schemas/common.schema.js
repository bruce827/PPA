const { z } = require('zod');
require('../openapi/registry'); // ensure extendZodWithOpenApi has run

/**
 * Standard success envelope: every JSON endpoint wraps payloads as
 * `{ success: true, data }`. `data` shape is supplied per endpoint.
 */
function apiResponse(dataSchema, name) {
  const schema = z.object({
    success: z.boolean(),
    data: dataSchema,
  });
  return name ? schema.openapi(name) : schema;
}

/**
 * Bare data envelope: several older endpoints respond with `{ data }` and no
 * `success` flag (calculation, dashboard, project reads). Modelled separately
 * so the contract reflects the real wire shape rather than forcing `success`.
 */
function dataResponse(dataSchema, name) {
  const schema = z.object({ data: dataSchema });
  return name ? schema.openapi(name) : schema;
}

/** Envelope with no data field (e.g. successful deletes). */
const OkResponse = z
  .object({ success: z.boolean(), message: z.string().optional() })
  .openapi('OkResponse');

/** Standard error envelope returned by the validate middleware / handlers. */
const ErrorResponse = z
  .object({
    success: z.literal(false),
    error: z.any(),
  })
  .openapi('ErrorResponse');

/** Path param that is a numeric id. Coerced so '12' -> 12. */
const IdParam = z.object({
  id: z.coerce.number().int().openapi({ example: 1 }),
});

module.exports = {
  apiResponse,
  dataResponse,
  OkResponse,
  ErrorResponse,
  IdParam,
};
