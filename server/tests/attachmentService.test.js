const fs = require('fs/promises');
const path = require('path');

const {
  UPLOAD_DIR,
  deleteAttachment,
  downloadAttachment,
  ensureUploadDir,
  getProjectAttachments,
  saveAttachment,
} = require('../services/attachmentService');

describe('attachmentService', () => {
  const projectId = 987654321;
  const otherProjectId = 987654322;

  async function cleanupTestArtifacts() {
    await ensureUploadDir();
    const files = await fs.readdir(UPLOAD_DIR);
    const targets = files.filter(
      (filename) =>
        filename.startsWith(`${projectId}_`) ||
        filename.startsWith(`${otherProjectId}_`)
    );

    await Promise.all(
      targets.map((filename) =>
        fs.unlink(path.join(UPLOAD_DIR, filename)).catch(() => {})
      )
    );
  }

  beforeEach(async () => {
    await cleanupTestArtifacts();
  });

  afterEach(async () => {
    await cleanupTestArtifacts();
  });

  test('should preserve originalname metadata and enforce project isolation on download/delete', async () => {
    const saved = await saveAttachment(projectId, {
      originalname: 'proposal#final.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('test attachment body'),
    });

    expect(saved.originalname).toBe('proposal#final.pdf');

    const attachments = await getProjectAttachments(projectId);
    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toBe(saved.filename);
    expect(attachments[0].originalname).toBe('proposal#final.pdf');
    expect(attachments[0].mimetype).toBe('application/pdf');

    const deniedDownload = await downloadAttachment(otherProjectId, saved.filename);
    expect(deniedDownload).toBeNull();

    const deniedDelete = await deleteAttachment(otherProjectId, saved.filename);
    expect(deniedDelete).toBe(false);

    const allowedDownload = await downloadAttachment(projectId, saved.filename);
    expect(allowedDownload.originalname).toBe('proposal#final.pdf');
    expect(allowedDownload.mimetype).toBe('application/pdf');
    expect(allowedDownload.buffer.toString()).toBe('test attachment body');

    const deleted = await deleteAttachment(projectId, saved.filename);
    expect(deleted).toBe(true);
    await expect(
      fs.access(path.join(UPLOAD_DIR, saved.filename))
    ).rejects.toThrow();
  });
});
