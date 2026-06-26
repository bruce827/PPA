/**
 * Runtime request validation driven by the same zod schemas that feed the
 * OpenAPI contract — this is the "no-drift" guarantee: request shape in the
 * docs and request shape enforced at runtime come from one definition.
 *
 * On success the parsed values replace req.body/query/params. On failure a
 * uniform 400 is returned in the project's standard envelope.
 *
 * Express 5 makes req.query a getter-only property, so validated query is
 * written via Object.defineProperty rather than assignment.
 */
function assign(req, key, value) {
  if (key === 'query') {
    Object.defineProperty(req, 'query', {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    return;
  }
  req[key] = value;
}

function validate(schemas = {}) {
  const { body, query, params } = schemas;
  return (req, res, next) => {
    try {
      if (params) assign(req, 'params', params.parse(req.params));
      if (query) assign(req, 'query', query.parse(req.query));
      if (body) assign(req, 'body', body.parse(req.body));
      next();
    } catch (err) {
      const issues =
        err && Array.isArray(err.issues)
          ? err.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            }))
          : String(err);
      res.status(400).json({ success: false, error: issues });
    }
  };
}

module.exports = { validate };
