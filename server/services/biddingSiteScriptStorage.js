const fs = require('fs/promises');
const path = require('path');

const DEFAULT_SCRIPT_DIR = path.join(__dirname, '..', 'uploads', 'bidding-site-scripts');
const DEFAULT_SCRIPT_DIR_RELATIVE = path.join('server', 'uploads', 'bidding-site-scripts');

function getScriptStorageDir() {
  return process.env.BIDDING_SITE_SCRIPT_DIR || DEFAULT_SCRIPT_DIR;
}

function getScriptStoredFileName(siteId) {
  return `site_${siteId}.py`;
}

function getScriptFilePath(siteId) {
  return path.join(getScriptStorageDir(), getScriptStoredFileName(siteId));
}

function getScriptProjectRelativePath(siteId) {
  return path.join(DEFAULT_SCRIPT_DIR_RELATIVE, getScriptStoredFileName(siteId));
}

async function saveScriptFile(siteId, content) {
  const targetDir = getScriptStorageDir();
  const targetPath = getScriptFilePath(siteId);
  const tempPath = `${targetPath}.tmp`;

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(tempPath, content, 'utf8');
  await fs.rename(tempPath, targetPath);

  return targetPath;
}

async function deleteScriptFile(siteId) {
  const targetPath = getScriptFilePath(siteId);

  try {
    await fs.unlink(targetPath);
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = {
  getScriptFilePath,
  getScriptProjectRelativePath,
  getScriptStoredFileName,
  saveScriptFile,
  deleteScriptFile,
};
