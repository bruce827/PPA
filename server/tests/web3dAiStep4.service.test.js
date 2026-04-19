jest.mock('../models/promptTemplateModel', () => ({
  getAll: jest.fn(),
  getById: jest.fn(),
}));

jest.mock('../models/aiModelModel', () => ({
  getCurrentVisionModel: jest.fn(),
}));

jest.mock('../models/web3dConfigModel', () => ({
  getWorkloadTemplates: jest.fn(),
}));

jest.mock('../models/configModel', () => ({
  getAllRoles: jest.fn(),
}));

jest.mock('../providers/ai/visionProviderSelector', () => ({
  selectVisionProvider: jest.fn(),
}));

jest.mock('../models/aiAssessmentLogModel', () => ({
  insertLog: jest.fn(),
  updateLogDir: jest.fn(),
}));

jest.mock('../services/aiFileLogger', () => ({
  save: jest.fn(),
}));

const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const aiFileLogger = require('../services/aiFileLogger');
const aiModelModel = require('../models/aiModelModel');
const configModel = require('../models/configModel');
const promptTemplateModel = require('../models/promptTemplateModel');
const { selectVisionProvider } = require('../providers/ai/visionProviderSelector');
const web3dConfigModel = require('../models/web3dConfigModel');
const web3dAiStep4Service = require('../services/web3dAiStep4Service');

describe('web3dAiStep4Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiFileLogger.save.mockResolvedValue('/tmp/ai-log');
    aiAssessmentLogModel.insertLog.mockResolvedValue({ id: 1 });
    aiAssessmentLogModel.updateLogDir.mockResolvedValue({ updated: 1 });
    aiModelModel.getCurrentVisionModel.mockResolvedValue({
      id: 10,
      provider: 'Google',
      model_name: 'gemini-2.5-pro',
      api_host: 'https://generativelanguage.googleapis.com',
      api_key: 'test-key',
      timeout: 30,
      max_tokens: 2048,
      supports_vision: 1,
    });
    promptTemplateModel.getById.mockResolvedValue({
      id: 1,
      module_tag: 'web3d',
      is_active: 1,
      system_prompt: '你是 Web3D 工作量专家',
      user_prompt_template: '请分析 {{project_name}}',
      variables_json: JSON.stringify([{ name: 'audience', default_value: '内部' }]),
    });
    web3dConfigModel.getWorkloadTemplates.mockResolvedValue([
      {
        id: 1,
        category: 'core_dev',
        item_name: '场景搭建与基础交互',
        description: '基础场景',
        base_days: 3,
        unit: '套',
      },
      {
        id: 2,
        category: 'performance',
        item_name: '性能优化',
        description: '性能调优',
        base_days: 2,
        unit: '套',
      },
    ]);
    configModel.getAllRoles.mockResolvedValue([
      { role_name: '前端工程师', unit_price: 1800 },
      { role_name: '技术美术', unit_price: 2200 },
    ]);
  });

  test('getStep4Prompts returns active Web3D Step4 prompts', async () => {
    promptTemplateModel.getAll.mockResolvedValue({
      data: [
        {
          id: 1,
        },
      ],
    });

    const prompts = await web3dAiStep4Service.getStep4Prompts();

    expect(promptTemplateModel.getAll).toHaveBeenCalledWith(
      expect.objectContaining({
        module_tag: 'web3d',
      })
    );
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      id: '1',
      name: '',
      model_hint: 'gemini-2.5-pro',
    });
  });

  test('analyzeStep4 returns normalized coverage and step4 rows and writes ai logs', async () => {
    selectVisionProvider.mockReturnValue({
      key: 'gemini-vision',
      impl: {
        createVisionCompletion: jest.fn().mockResolvedValue({
          model: 'gemini-2.5-pro',
          durationMs: 321,
          data: {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: '分析完成',
                    coverage: [
                      {
                        category: 'core_dev',
                        item_name: '场景搭建与基础交互',
                        applicability: 'required',
                        recommended_base_days: 4,
                        recommended_delivery_factor: 1.2,
                        recommended_role_names: ['前端工程师'],
                        reason: '核心页面和交互必须建设',
                      },
                      {
                        category: 'performance',
                        item_name: '性能优化',
                        applicability: 'not_applicable',
                        recommended_base_days: 0,
                        recommended_delivery_factor: 0,
                        recommended_role_names: [],
                        reason: '当前目标终端压力较小',
                      },
                    ],
                  }),
                },
              },
            ],
          },
        }),
      },
    });

    const result = await web3dAiStep4Service.analyzeStep4({
      promptId: '1',
      variables: { audience: '外部' },
      context: {
        project_name: '数字展厅',
        project_description: '需要大屏展示和基础交互',
        step1: { target_terminals: ['普通 PC'] },
        step2: { risk_answers: [] },
        step3: { risk_answers: [] },
      },
      images: [
        {
          originalname: 'scene.png',
          mimetype: 'image/png',
          size: 128,
          buffer: Buffer.from('test-image'),
        },
      ],
    });

    expect(result.summary).toBe('分析完成');
    expect(result.coverage).toHaveLength(2);
    expect(result.step4_rows).toEqual([
      {
        category: 'core_dev',
        item_name: '场景搭建与基础交互',
        base_days: 4,
        delivery_factor: 1.2,
        role_names: ['前端工程师'],
        reason: '核心页面和交互必须建设',
      },
    ]);

    expect(aiAssessmentLogModel.insertLog).toHaveBeenCalledWith(
      expect.objectContaining({
        step: 'web3d_step4',
        route: '/api/web3d/ai/step4-analyze',
        status: 'success',
      })
    );
    expect(aiFileLogger.save).toHaveBeenCalledWith(
      expect.objectContaining({
        step: 'web3d_step4',
        attachments: expect.arrayContaining([
          expect.objectContaining({
            relativePath: expect.stringContaining('images/'),
          }),
        ]),
      })
    );
  });

  test('analyzeStep4 keeps mapped rows and returns unmapped items for manual handling', async () => {
    selectVisionProvider.mockReturnValue({
      key: 'gemini-vision',
      impl: {
        createVisionCompletion: jest.fn().mockResolvedValue({
          model: 'gemini-2.5-pro',
          durationMs: 321,
          data: {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: '分析完成',
                    coverage: [
                      {
                        category: 'core_dev',
                        item_name: '场景搭建 with 基础交互',
                        applicability: 'required',
                        recommended_base_days: 4,
                        recommended_delivery_factor: 1.2,
                        recommended_role_names: ['前端工程师'],
                        reason: '核心页面和交互必须建设',
                      },
                    ],
                    step4_rows: [
                      {
                        category: 'core_dev',
                        item_name: '场景搭建与基础交互',
                        base_days: 4,
                        delivery_factor: 1.2,
                        role_names: ['前端工程师'],
                      },
                    ],
                  }),
                },
              },
            ],
          },
        }),
      },
    });

    const result = await web3dAiStep4Service.analyzeStep4({
      promptId: '1',
      context: {
        project_name: '数字展厅',
        step1: {},
        step2: {},
        step3: {},
      },
      images: [],
    });

    expect(result.step4_rows).toEqual([
      {
        category: 'core_dev',
        item_name: '场景搭建与基础交互',
        base_days: 4,
        delivery_factor: 1.2,
        role_names: ['前端工程师'],
        reason: '',
      },
    ]);
    expect(result.unmapped_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'coverage',
          category: 'core_dev',
          item_name: '场景搭建 with 基础交互',
          failure_reason: 'template_not_found',
        }),
      ])
    );
    expect(result.missing_template_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'performance',
          item_name: '性能优化',
        }),
      ])
    );
  });
});
