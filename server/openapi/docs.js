/**
 * Serves the code-derived OpenAPI contract at runtime:
 *   - GET /api-docs.json   the raw OpenAPI 3.0 document (agent tool spec)
 *   - GET /api-docs        Swagger UI for humans
 *
 * Mounted directly on the app in index.js (not in the routes barrel) so the
 * contract gatekeeper, which enumerates only the API routes, ignores these
 * meta-endpoints. The spec is built once at startup and cached.
 */
const swaggerUi = require('swagger-ui-express');
const { buildSpec } = require('./generate');

function mountDocs(app) {
  const spec = buildSpec();

  app.get('/api-docs.json', (req, res) => {
    res.json(spec);
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}

module.exports = { mountDocs };
