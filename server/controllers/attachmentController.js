const multer = require('multer');
const {
  getProjectAttachments,
  getTotalAttachmentSize,
  saveAttachment,
  downloadAttachment: getAttachmentFile,
  deleteAttachment,
  validateFileSize,
} = require('../services/attachmentService');
const projectModel = require('../models/projectModel');
const { validationError } = require('../utils/errors');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

async function uploadAttachment(req, res, next) {
  try {
    const projectId = parseInt(req.params.id, 10);
    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      throw validationError('项目不存在');
    }

    if (!req.file) {
      throw validationError('请选择要上传的文件');
    }

    const totalSize = await getTotalAttachmentSize(projectId);
    const validation = validateFileSize(req.file.size, totalSize);
    if (!validation.valid) {
      throw validationError(validation.error);
    }

    const saved = await saveAttachment(projectId, req.file);
    res.json({
      success: true,
      data: {
        filename: saved.filename,
        originalname: saved.originalname,
        mimetype: saved.mimetype,
        size: saved.size,
        uploadedAt: saved.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function listAttachments(req, res, next) {
  try {
    const projectId = parseInt(req.params.id, 10);
    const attachments = await getProjectAttachments(projectId);
    const result = attachments.map((a) => ({
      filename: a.filename,
      originalname: a.originalname,
      size: a.size,
      uploadedAt: a.uploadedAt,
    }));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function downloadAttachment(req, res, next) {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { filename } = req.params;
    const file = await getAttachmentFile(projectId, filename);
    if (!file) {
      throw validationError('附件不存在');
    }
    const encodedFilename = encodeURIComponent(file.originalname);
    res.set(
      'Content-Disposition',
      `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.set('Content-Type', file.mimetype);
    res.set('Content-Length', file.size.toString());
    res.send(file.buffer);
  } catch (error) {
    next(error);
  }
}

async function deleteAttachmentHandler(req, res, next) {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { filename } = req.params;
    const deleted = await deleteAttachment(projectId, filename);
    if (!deleted) {
      throw validationError('附件不存在');
    }
    res.json({ success: true, message: '附件已删除' });
  } catch (error) {
    next(error);
  }
}

async function checkAttachments(req, res, next) {
  try {
    const projectId = parseInt(req.params.id, 10);
    const attachments = await getProjectAttachments(projectId);
    res.json({
      success: true,
      data: { hasAttachments: attachments.length > 0 },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadMiddleware: upload.single('file'),
  uploadAttachment,
  listAttachments,
  downloadAttachment,
  deleteAttachmentHandler,
  checkAttachments,
};
