/**
 * Gatekeeper test: every route actually registered on the Express app MUST have
 * a matching entry in the OpenAPI contract (and vice versa). This is what keeps
 * the machine-readable contract honest — it cannot drift from the real routes
 * without turning this suite red.
 */
const { listRoutes } = require('../scripts/list-routes');
const { buildSpec } = require('../openapi/generate');

// Express paths use `:param`; OpenAPI uses `{param}`. Normalise to a single
// canonical form (`{param}`) so the two sources are directly comparable.
function canonical(path) {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function realRouteKeys() {
  return listRoutes().map((r) => `${r.method.toUpperCase()} ${canonical(r.path)}`);
}

function contractRouteKeys() {
  const spec = buildSpec();
  const keys = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of Object.keys(item)) {
      keys.push(`${method.toUpperCase()} ${canonical(path)}`);
    }
  }
  return keys;
}

describe('OpenAPI contract route coverage', () => {
  const real = realRouteKeys();
  const contract = new Set(contractRouteKeys());
  const realSet = new Set(real);

  test('every registered route has a contract entry', () => {
    const missing = real.filter((k) => !contract.has(k)).sort();
    if (missing.length) {
      throw new Error(
        `${missing.length} registered route(s) missing an OpenAPI contract:\n` +
          missing.map((m) => `  - ${m}`).join('\n')
      );
    }
  });

  test('every contract entry maps to a registered route', () => {
    const orphan = [...contract].filter((k) => !realSet.has(k)).sort();
    if (orphan.length) {
      throw new Error(
        `${orphan.length} OpenAPI contract entr(ies) with no matching route:\n` +
          orphan.map((m) => `  - ${m}`).join('\n')
      );
    }
  });
});
