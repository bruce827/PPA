const tenderFieldParseService = require('../services/tenderFieldParseService');

async function parseTenderFields(req, res, next) {
  try {
    const result = await tenderFieldParseService.executeTenderFieldParse(
      req.params.id,
      req.body || {}
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  parseTenderFields,
};
