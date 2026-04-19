const fs = require('fs/promises');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'project-attachments');
const ATTACHMENT_META_SUFFIX = '.meta.json';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function getProjectFilenamePrefix(projectId) {
  return `${projectId}_`;
}

function isAttachmentMetaFilename(filename) {
  return typeof filename === 'string' && filename.endsWith(ATTACHMENT_META_SUFFIX);
}

function getAttachmentMetaPath(filename) {
  return path.join(UPLOAD_DIR, `${filename}${ATTACHMENT_META_SUFFIX}`);
}

function isProjectAttachmentFilename(projectId, filename) {
  if (typeof filename !== 'string' || !filename) {
    return false;
  }

  if (
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..')
  ) {
    return false;
  }

  return filename.startsWith(getProjectFilenamePrefix(projectId));
}

function extractOriginalNameFromFilename(projectId, filename) {
  if (!isProjectAttachmentFilename(projectId, filename)) {
    return filename;
  }

  const match = new RegExp(`^${projectId}_\\d+_(.+)$`).exec(filename);
  return match && match[1] ? match[1] : filename;
}

async function readAttachmentMeta(filename) {
  try {
    const raw = await fs.readFile(getAttachmentMetaPath(filename), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_error) {
    return null;
  }
}

async function writeAttachmentMeta(filename, metadata) {
  await fs.writeFile(
    getAttachmentMetaPath(filename),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
}

async function getProjectAttachments(projectId) {
  await ensureUploadDir();
  const prefix = getProjectFilenamePrefix(projectId);
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    const projectFiles = files.filter(
      (filename) => filename.startsWith(prefix) && !isAttachmentMetaFilename(filename)
    );
    const attachments = [];
    for (const filename of projectFiles) {
      const filePath = path.join(UPLOAD_DIR, filename);
      const stat = await fs.stat(filePath);
      const metadata = await readAttachmentMeta(filename);
      attachments.push({
        filename,
        originalname:
          metadata?.originalname || extractOriginalNameFromFilename(projectId, filename),
        mimetype: metadata?.mimetype || 'application/octet-stream',
        size: stat.size,
        uploadedAt: new Date(stat.mtimeMs).toISOString(),
        fullPath: filePath,
      });
    }
    return attachments;
  } catch {
    return [];
  }
}

async function getTotalAttachmentSize(projectId) {
  const attachments = await getProjectAttachments(projectId);
  return attachments.reduce((sum, a) => sum + a.size, 0);
}

/**
 * 修复 multer 2.x 对非 ASCII 文件名的编码问题。
 * Multer/busboy 会将 UTF-8 字节流按 Latin-1 解析，导致中文变成乱码。
 * 需要将 Latin-1 编码的字符串还原为正确的 UTF-8 字符串。
 */
function fixEncoding(str) {
  // 将字符串视为 Latin-1，还原为原始字节，再用 UTF-8 解码
  const buf = Buffer.from(str, 'latin1');
  return buf.toString('utf8');
}

function generateUniqueFilename(projectId, originalName) {
  const timestamp = Date.now();
  // 先修复编码问题，再清理特殊字符
  const fixedName = fixEncoding(originalName);
  // 保留中文、常见标点、字母数字
  const sanitizedName = fixedName.replace(/[^\w\u4e00-\u9fff.\-() ]/g, '_');
  return `${projectId}_${timestamp}_${sanitizedName}`;
}

async function saveAttachment(projectId, file) {
  await ensureUploadDir();
  const attachments = await getProjectAttachments(projectId);
  const originalname = fixEncoding(file.originalname);
  const baseFilename = generateUniqueFilename(projectId, file.originalname);

  let finalFilename = baseFilename;
  let counter = 1;
  while (attachments.some((a) => a.filename === finalFilename)) {
    const ext = path.extname(baseFilename);
    const nameWithoutExt = baseFilename.slice(0, -ext.length);
    finalFilename = `${nameWithoutExt}_${counter}${ext}`;
    counter++;
  }

  const destPath = path.join(UPLOAD_DIR, finalFilename);
  await fs.writeFile(destPath, file.buffer);

  const stat = await fs.stat(destPath);
  const uploadedAt = new Date(stat.mtimeMs).toISOString();
  await writeAttachmentMeta(finalFilename, {
    projectId,
    filename: finalFilename,
    originalname,
    mimetype: file.mimetype,
    size: stat.size,
    uploadedAt,
  });

  return {
    filename: finalFilename,
    originalname,
    mimetype: file.mimetype,
    size: stat.size,
    uploadedAt,
  };
}

async function downloadAttachment(projectId, filename) {
  await ensureUploadDir();
  if (!isProjectAttachmentFilename(projectId, filename)) {
    return null;
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return null;
    const metadata = await readAttachmentMeta(filename);
    const buffer = await fs.readFile(filePath);
    return {
      buffer,
      mimetype: metadata?.mimetype || 'application/octet-stream',
      size: stat.size,
      originalname:
        metadata?.originalname || extractOriginalNameFromFilename(projectId, filename),
    };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function deleteAttachment(projectId, filename) {
  await ensureUploadDir();
  if (!isProjectAttachmentFilename(projectId, filename)) {
    return false;
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    await fs.unlink(filePath);
    try {
      await fs.unlink(getAttachmentMetaPath(filename));
    } catch (metaError) {
      if (metaError.code !== 'ENOENT') {
        throw metaError;
      }
    }
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function validateFileSize(fileSize, totalSize) {
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: '单个文件大小不能超过 20MB' };
  }
  if (totalSize + fileSize > MAX_TOTAL_SIZE) {
    return { valid: false, error: '项目附件总大小不能超过 30MB' };
  }
  return { valid: true };
}

module.exports = {
  ensureUploadDir,
  getProjectAttachments,
  getTotalAttachmentSize,
  saveAttachment,
  downloadAttachment,
  deleteAttachment,
  validateFileSize,
  isProjectAttachmentFilename,
  extractOriginalNameFromFilename,
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
};
