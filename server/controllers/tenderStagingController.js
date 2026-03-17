const tenderStagingService = require('../services/tenderStagingService');
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

async function pushTenderStaging(req, res, next) {
  try {
    const result = await tenderPushService.pushTenderStaging(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTenderStaging,
  syncTenderStaging,
  pushTenderStaging,
};
