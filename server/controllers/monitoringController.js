const monitoringService = require('../services/monitoringService');

exports.getLogs = async (req, res, next) => {
  try {
    const data = await monitoringService.getLogs(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const data = await monitoringService.getStats(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getLogDetail = async (req, res, next) => {
  try {
    const data = await monitoringService.getLogDetail(req.params.requestHash);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
