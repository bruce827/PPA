// Requiring this barrel executes every path-registration module for its side
// effect: each file calls registerRoute() at load time, which populates the
// shared OpenAPIRegistry. Order is irrelevant — registration is additive.
require('./health');
require('./calculation');
require('./dashboard');
require('./contracts');
require('./monitoring');
require('./ai');
require('./projects');
require('./config');
require('./web3d');
require('./opportunity');
require('./formDesign');
require('./dataMetrics');
require('./wiki');
