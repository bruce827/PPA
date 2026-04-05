const express = require('express');
const router = express.Router();
const {
  uploadMiddleware,
  uploadAttachment,
  listAttachments,
  downloadAttachment,
  deleteAttachmentHandler,
  checkAttachments,
} = require('../controllers/attachmentController');

router.post('/:id/attachments/upload', uploadMiddleware, uploadAttachment);
router.get('/:id/attachments', listAttachments);
router.get('/:id/attachments/download/:filename', downloadAttachment);
router.delete('/:id/attachments/:filename', deleteAttachmentHandler);
router.get('/:id/attachments/check', checkAttachments);

module.exports = router;
