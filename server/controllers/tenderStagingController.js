const tenderStagingService = require('../services/tenderStagingService');
const tenderDedupeService = require('../services/tenderDedupeService');
const tenderPushService = require('../services/tenderPushService');

async function listTenderStaging(req, res, next) {
  try {
    const result = await tenderStagingService.listTenderStaging(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function syncTenderStaging(req, res, next) {
  try {
    const result = await tenderStagingService.syncTenderFiles(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function archiveTenderSourceFiles(req, res, next) {
  try {
    const result = await tenderStagingService.archiveTenderSourceFiles(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function pushTenderStaging(req, res, next) {
  try {
    const result = await tenderPushService.pushTenderStaging(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function previewTenderDedupe(req, res, next) {
  try {
    const result = await tenderDedupeService.previewTenderDedupe();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function executeTenderDedupe(req, res, next) {
  try {
    const result = await tenderDedupeService.executeTenderDedupe(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  archiveTenderSourceFiles,
  executeTenderDedupe,
  listTenderStaging,
  previewTenderDedupe,
  syncTenderStaging,
  pushTenderStaging,
};
