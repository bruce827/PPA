const tenderWebSearchService = require('../services/tenderWebSearchService');

async function getTenderWebSearch(req, res, next) {
  try {
    const result = await tenderWebSearchService.getTenderWebSearchContext(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function searchTenderWebSearch(req, res, next) {
  try {
    const result = await tenderWebSearchService.executeTenderWebSearch(
      req.params.id,
      req.body
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTenderWebSearch,
  searchTenderWebSearch,
};
