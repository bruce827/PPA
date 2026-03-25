jest.mock('../providers/ai/openaiProvider', () => ({
  createRiskAssessment: jest.fn().mockResolvedValue({
    data: { choices: [{ message: { content: '{}' } }] },
    statusCode: 200,
    model: 'test-model',
    durationMs: 1,
  }),
}));

const openaiProvider = require('../providers/ai/openaiProvider');
const cherryStudioProvider = require('../providers/ai/cherryStudioProvider');
const { selectProvider } = require('../providers/ai/providerSelector');

describe('Cherry Studio Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('selectProvider should route Cherry Studio to cherry provider', () => {
    const selected = selectProvider('Cherry Studio');

    expect(selected.key).toBe('cherry-studio');
    expect(selected.impl).toBe(cherryStudioProvider);
  });

  test('should append chat completions endpoint for root host', async () => {
    await cherryStudioProvider.createRiskAssessment({
      prompt: 'hello',
      model: 'test-model',
      api_key: 'secret',
      api_host: 'https://open.cherryin.cc/',
    });

    expect(openaiProvider.createRiskAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        api_host: 'https://open.cherryin.cc/v1/chat/completions',
      })
    );
  });

  test('should append chat completions endpoint for /v1 host', async () => {
    await cherryStudioProvider.createRiskAssessment({
      prompt: 'hello',
      model: 'test-model',
      api_key: 'secret',
      api_host: 'https://open.cherryin.cc/v1',
    });

    expect(openaiProvider.createRiskAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        api_host: 'https://open.cherryin.cc/v1/chat/completions',
      })
    );
  });

  test('should preserve full endpoint when already configured', async () => {
    await cherryStudioProvider.createRiskAssessment({
      prompt: 'hello',
      model: 'test-model',
      api_key: 'secret',
      api_host: 'https://open.cherryin.cc/v1/chat/completions',
    });

    expect(openaiProvider.createRiskAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        api_host: 'https://open.cherryin.cc/v1/chat/completions',
      })
    );
  });
});
