const calculationService = require('../services/calculationService');

/**
 * 实时计算
 */
exports.calculate = async (req, res, next) => {
  try {
    const result = await calculationService.calculateProjectCost(req.body);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};
