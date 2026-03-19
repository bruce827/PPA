const { query, validationResult } = require('express-validator');

const validateGetAIModels = [
  query('supports_web_search').optional().isBoolean(),
  query('is_active').optional().isBoolean(),
];

const handleAIModelValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const message = errors
    .array()
    .map((item) => item.msg)
    .join('; ');

  return res.status(400).json({
    success: false,
    error: 'Validation error',
    message,
  });
};

module.exports = {
  validateGetAIModels,
  handleAIModelValidation,
};
