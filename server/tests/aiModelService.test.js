jest.mock('../services/aiTestService', () => ({
  testConnection: jest.fn().mockResolvedValue({
    success: true,
    message: 'ok',
    duration: 1,
  }),
}));

const aiTestService = require('../services/aiTestService');
const aiModelService = require('../services/aiModelService');

describe('aiModelService api_host validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('testTempConnection should reject root host for OpenAI compatible providers', async () => {
    await expect(
      aiModelService.testTempConnection({
        provider: 'OpenAI',
        api_key: 'secret',
        api_host: 'https://open.cherryin.cc/',
        model_name: 'gpt-test',
      })
    ).rejects.toMatchObject({
      message:
        'OpenAI 兼容服务的 API Host 需填写完整接口 URL，例如 https://api.openai.com/v1/chat/completions',
    });

    expect(aiTestService.testConnection).not.toHaveBeenCalled();
  });

  test('testTempConnection should normalize Cherry Studio root host before testing', async () => {
    await aiModelService.testTempConnection({
      provider: 'Cherry Studio',
      api_key: 'secret',
      api_host: 'https://open.cherryin.cc/',
      model_name: 'agent/qwen',
      timeout: 30,
    });

    expect(aiTestService.testConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'Cherry Studio',
        api_host: 'https://open.cherryin.cc/v1/chat/completions',
      })
    );
  });
});
