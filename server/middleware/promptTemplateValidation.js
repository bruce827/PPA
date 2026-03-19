const { body, param, query, validationResult } = require('express-validator');
const {
  normalizePromptTemplateCategory,
  normalizePromptTemplateCategoryFilter,
  isValidPromptTemplateCategory,
} = require('../utils/promptTemplateCategories');

const CATEGORY_ERROR_MESSAGE = 'Invalid category.';

function validateCategoryValue(value) {
  if (!isValidPromptTemplateCategory(value)) {
    throw new Error(CATEGORY_ERROR_MESSAGE);
  }
  return true;
}

const validateCreatePromptTemplate = [
  body('template_name').notEmpty().withMessage('Template name is required.'),
  body('category')
    .customSanitizer(normalizePromptTemplateCategory)
    .custom(validateCategoryValue),
  body('system_prompt').notEmpty().withMessage('System prompt is required.'),
  body('user_prompt_template').notEmpty().withMessage('User prompt template is required.'),
];

const validateUpdatePromptTemplate = [
    param('id').isInt().withMessage('ID must be an integer.'),
    body('template_name').optional().notEmpty().withMessage('Template name cannot be empty.'),
    body('category')
      .optional()
      .customSanitizer(normalizePromptTemplateCategory)
      .custom(validateCategoryValue),
];

const validatePromptTemplateId = [
    param('id').isInt().withMessage('ID must be an integer.'),
];

const validateGetPromptTemplates = [
    query('category')
      .optional()
      .customSanitizer(normalizePromptTemplateCategoryFilter)
      .custom((value) => {
        if (Array.isArray(value)) {
          value.forEach(validateCategoryValue);
          return true;
        }
        return validateCategoryValue(value);
      }),
    query('is_system').optional().isBoolean(),
    query('is_active').optional().isBoolean(),
    query('search').optional().isString(),
];

const handlePromptTemplateValidation = (req, res, next) => {
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
    validateCreatePromptTemplate,
    validateUpdatePromptTemplate,
    validatePromptTemplateId,
    validateGetPromptTemplates,
    handlePromptTemplateValidation,
};
