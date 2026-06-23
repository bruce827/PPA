const { body, param, query, validationResult } = require('express-validator');
const {
  normalizeModuleTag,
  validateModuleTag,
} = require('../utils/promptTemplateCategories');

const validateCreatePromptTemplate = [
  body('template_name').notEmpty().withMessage('Template name is required.'),
  body('module_tag')
    .notEmpty()
    .withMessage('module_tag is required.')
    .customSanitizer(normalizeModuleTag)
    .custom(validateModuleTag),
  body('system_prompt').notEmpty().withMessage('System prompt is required.'),
  body('user_prompt_template').notEmpty().withMessage('User prompt is required.'),
];

const validateUpdatePromptTemplate = [
  param('id').isInt().withMessage('ID must be an integer.'),
  body('template_name').optional().notEmpty().withMessage('Template name cannot be empty.'),
  body('module_tag')
    .optional()
    .customSanitizer(normalizeModuleTag)
    .custom(validateModuleTag),
];

const validatePromptTemplateId = [
  param('id').isInt().withMessage('ID must be an integer.'),
];

const validateGetPromptTemplates = [
  query('module_tag').optional().customSanitizer(normalizeModuleTag),
  query('is_system').optional().isBoolean(),
  query('is_active').optional().isBoolean(),
  query('search').optional().isString(),
];

const handlePromptTemplateValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const message = errors.array().map((item) => item.msg).join('; ');

  return res.status(400).json({
    success: false,
    error: 'Validation error',
    message,
  });
};

module.exports = {
  validateCreatePromptTemplate,
  validateUpdatePromptTemplate,
  validatePromptTemplateId,
  validateGetPromptTemplates,
  handlePromptTemplateValidation,
};
