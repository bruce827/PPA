const LEVELS = ['debug', 'info', 'warn', 'error'];

function format(level, message, meta) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
}

function log(level, message, meta = {}) {
  if (!LEVELS.includes(level)) {
    level = 'info';
  }

  const output = format(level, message, meta);

  switch (level) {
    case 'debug':
      return console.debug(output);
    case 'info':
      return console.info(output);
    case 'warn':
      return console.warn(output);
    case 'error':
      return console.error(output);
    default:
      return console.log(output);
  }
}

module.exports = {
  debug: (message, meta) => log('debug', message, meta),
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};
