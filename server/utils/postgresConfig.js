const SSL_MODE_QUERY_PARAMS = [
  'sslmode',
  'uselibpqcompat',
];

const normalizeSslMode = (value) => String(value || '').trim().toLowerCase();

const removeSslModeQueryParams = (connectionString) => {
  let parsedUrl;

  try {
    parsedUrl = new URL(connectionString);
  } catch (_error) {
    return connectionString;
  }

  SSL_MODE_QUERY_PARAMS.forEach((param) => {
    parsedUrl.searchParams.delete(param);
  });

  return parsedUrl.toString();
};

const getSslModeFromConnectionString = (connectionString) => {
  try {
    return normalizeSslMode(new URL(connectionString).searchParams.get('sslmode'));
  } catch (_error) {
    const match = String(connectionString || '').match(/[?&]sslmode=([^&]+)/i);
    return normalizeSslMode(match && decodeURIComponent(match[1]));
  }
};

const resolvePostgresSsl = (connectionString) => {
  const sslMode = normalizeSslMode(process.env.PGSSLMODE) || getSslModeFromConnectionString(connectionString);

  switch (sslMode) {
    case '':
      return undefined;
    case 'disable':
      return false;
    case 'no-verify':
    case 'prefer':
    case 'require':
      return { rejectUnauthorized: false };
    case 'verify-ca':
      return { checkServerIdentity: () => undefined };
    case 'verify-full':
      return {};
    default:
      return undefined;
  }
};

const buildPostgresConnectionConfig = (connectionString, options = {}) => {
  if (!connectionString) {
    throw new Error(options.missingMessage || 'DATABASE_URL is required when DB_TYPE=postgres');
  }

  const config = {
    connectionString: removeSslModeQueryParams(connectionString),
  };
  const ssl = resolvePostgresSsl(connectionString);

  if (ssl !== undefined) {
    config.ssl = ssl;
  }

  return config;
};

module.exports = {
  buildPostgresConnectionConfig,
  getSslModeFromConnectionString,
  removeSslModeQueryParams,
  resolvePostgresSsl,
};
