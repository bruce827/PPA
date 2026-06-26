jest.mock('../models/configModel', () => ({ ensureSchema: jest.fn().mockResolvedValue() }));
jest.mock('../models/projectModel', () => ({ ensureSchema: jest.fn().mockResolvedValue() }));
jest.mock('../models/biddingSiteModel', () => ({ ensureSchema: jest.fn().mockResolvedValue() }));
jest.mock('../models/tenderStagingModel', () => ({ ensureSchema: jest.fn().mockResolvedValue() }));
jest.mock('../models/tenderWebSearchResultModel', () => ({ ensureSchema: jest.fn().mockResolvedValue() }));
jest.mock('../models/aiAssessmentLogModel', () => ({ ensureSchema: jest.fn().mockResolvedValue() }));
jest.mock('../services/contractsService', () => ({ getContractsTotalRowCount: jest.fn().mockResolvedValue(0) }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const configModel = require('../models/configModel');
const projectModel = require('../models/projectModel');
const biddingSiteModel = require('../models/biddingSiteModel');
const tenderStagingModel = require('../models/tenderStagingModel');
const tenderWebSearchResultModel = require('../models/tenderWebSearchResultModel');
const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const contractsService = require('../services/contractsService');
const schemaWarmupService = require('../services/schemaWarmupService');

describe('schema warmup service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('warms known schema ensure tasks during startup', async () => {
    await schemaWarmupService.warmupSchemas();

    expect(configModel.ensureSchema).toHaveBeenCalledTimes(1);
    expect(projectModel.ensureSchema).toHaveBeenCalledTimes(1);
    expect(biddingSiteModel.ensureSchema).toHaveBeenCalledTimes(1);
    expect(tenderStagingModel.ensureSchema).toHaveBeenCalledTimes(1);
    expect(tenderWebSearchResultModel.ensureSchema).toHaveBeenCalledTimes(1);
    expect(aiAssessmentLogModel.ensureSchema).toHaveBeenCalledTimes(1);
    expect(contractsService.getContractsTotalRowCount).toHaveBeenCalledTimes(1);
  });
});
