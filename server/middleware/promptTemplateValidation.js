const { body, param, query } = require('express-validator');

const validateCreatePromptTemplate = [
  body('template_name').notEmpty().withMessage('Template name is required.'),
  body('category').isIn(['risk_analysis', 'cost_estimation', 'report_generation', 'custom']).withMessage('Invalid category.'),
  body('system_prompt').notEmpty().withMessage('System prompt is required.'),
  body('user_prompt_template').notEmpty().withMessage('User prompt template is required.'),
];

const validateUpdatePromptTemplate = [
    param('id').isInt().withMessage('ID must be an integer.'),
    body('template_name').optional().notEmpty().withMessage('Template name cannot be empty.'),
    body('category').optional().isIn(['risk_analysis', 'cost_estimation', 'report_generation', 'custom']).withMessage('Invalid category.'),
];

const validatePromptTemplateId = [
    param('id').isInt().withMessage('ID must be an integer.'),
];

const validateGetPromptTemplates = [
    query('category').optional().isString(),
    query('is_system').optional().isBoolean(),
    query('is_active').optional().isBoolean(),
    query('search').optional().isString(),
];

module.exports = {
    validateCreatePromptTemplate,
    validateUpdatePromptTemplate,
    validatePromptTemplateId,
    validateGetPromptTemplates
};