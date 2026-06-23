const fs = require('fs');
const path = require('path');

function parseEnvLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!key) {
    return null;
  }

  let value = trimmed.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile() {
  const envFilePath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envFilePath)) {
    return;
  }

  const content = fs.readFileSync(envFilePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      return;
    }

    if (process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
    }
  });
}

module.exports = loadEnvFile;
