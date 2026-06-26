/**
 * Enumerates the routes that are *actually registered* on the Express app by
 * instrumenting express.Router before the route modules are required.
 *
 * Why instrument instead of walking app.router.stack: in Express 5 the mount
 * path of a sub-router is compiled into an opaque matcher closure and is no
 * longer recoverable as a string from the layer, so a post-hoc stack walk can
 * see the routes but not reconstruct their full paths. Capturing the (path,
 * sub-router) pairs at mount time is deterministic.
 *
 * Returns an array of `{ method, path }` with full `/api/...` paths. The same
 * sub-router mounted under multiple prefixes (e.g. projects under both
 * /api/projects and /api/templates) yields one entry per prefix.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const express = require('express');

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

// Metadata captured per router instance created via express.Router().
const meta = new WeakMap();

const realRouter = express.Router;
express.Router = function patchedRouter(...args) {
  const router = realRouter.apply(this, args);
  const info = { routes: [], mounts: [] };
  meta.set(router, info);

  HTTP_METHODS.forEach((method) => {
    const orig = router[method].bind(router);
    router[method] = function (path, ...handlers) {
      if (typeof path === 'string') {
        info.routes.push({ method, path });
      }
      return orig(path, ...handlers);
    };
  });

  const origUse = router.use.bind(router);
  router.use = function (path, ...handlers) {
    let mountPath = '/';
    let mwHandlers = handlers;
    if (typeof path === 'string') {
      mountPath = path;
    } else {
      mwHandlers = [path, ...handlers];
    }
    mwHandlers.forEach((h) => {
      if (h && meta.has(h)) {
        info.mounts.push({ path: mountPath, child: h });
      }
    });
    return origUse(path, ...handlers);
  };

  return router;
};

function normalize(p) {
  const joined = ('/' + p).replace(/\/{2,}/g, '/');
  return joined.length > 1 ? joined.replace(/\/$/, '') : joined;
}

function expand(router, prefix, acc, seen) {
  const info = meta.get(router);
  if (!info) return;
  for (const r of info.routes) {
    acc.push({ method: r.method.toUpperCase(), path: normalize(prefix + r.path) });
  }
  for (const m of info.mounts) {
    const key = m.child; // guard against pathological self-mounts only
    if (seen.has(key) && seen.get(key).has(prefix + m.path)) continue;
    if (!seen.has(key)) seen.set(key, new Set());
    seen.get(key).add(prefix + m.path);
    expand(m.child, prefix + m.path, acc, seen);
  }
}

function listRoutes() {
  // Routes barrel must be required *after* the patch above is installed.
  const rootRouter = require('../routes');
  const acc = [];
  expand(rootRouter, '', acc, new WeakMap());
  // De-duplicate identical method+path pairs.
  const uniq = new Map();
  for (const r of acc) uniq.set(`${r.method} ${r.path}`, r);
  return [...uniq.values()].sort((a, b) =>
    `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`)
  );
}

module.exports = { listRoutes };

if (require.main === module) {
  const routes = listRoutes();
  for (const r of routes) {
    console.log(`${r.method.padEnd(6)} ${r.path}`);
  }
  console.log(`\nTotal: ${routes.length} routes`);
}
