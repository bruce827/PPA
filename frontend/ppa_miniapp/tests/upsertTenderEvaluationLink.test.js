const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const functionPath = path.resolve(__dirname, '../cloudfunctions/upsertTenderEvaluationLink/index.js');

function createCloudMock({
  openid = 'openid-ops-1',
  allowedOpenids = 'openid-ops-1',
  tenderEvaluations = [],
} = {}) {
  const collections = {
    miniapp_tender_evaluations: tenderEvaluations.map((item) => ({ ...item })),
  };

  return {
    __collections: collections,
    DYNAMIC_CURRENT_ENV: 'test-env',
    init() {},
    getWXContext() {
      return { OPENID: openid };
    },
    database() {
      return {
        collection(name) {
          const docs = collections[name];

          if (!docs) {
            throw new Error(`unknown collection: ${name}`);
          }

          return {
            where(query) {
              return {
                limit() {
                  return {
                    async get() {
                      return {
                        data: docs.filter((item) => {
                          return Object.entries(query).every(([key, value]) => item[key] === value);
                        }),
                      };
                    },
                  };
                },
              };
            },
            add({ data }) {
              const record = {
                _id: `evaluation-${docs.length + 1}`,
                ...data,
              };

              docs.push(record);

              return Promise.resolve({
                _id: record._id,
              });
            },
            doc(id) {
              return {
                update({ data }) {
                  const index = docs.findIndex((item) => item._id === id);

                  if (index === -1) {
                    throw new Error('record not found');
                  }

                  docs[index] = {
                    ...docs[index],
                    ...data,
                  };

                  return Promise.resolve({});
                },
              };
            },
          };
        },
      };
    },
    __setEnv() {
      process.env.MEMBERSHIP_OPS_OPENIDS = allowedOpenids;
    },
  };
}

function loadCloudFunction(mockCloud) {
  const originalLoad = Module._load;

  mockCloud.__setEnv();

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return mockCloud;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[functionPath];

  try {
    return require(functionPath);
  } finally {
    Module._load = originalLoad;
  }
}

test('upsertTenderEvaluationLink should reject callers outside ops allowlist', async () => {
  const cloudFunction = loadCloudFunction(createCloudMock({
    openid: 'openid-user-1',
    allowedOpenids: 'openid-ops-1',
  }));

  const result = await cloudFunction.main({
    sourceItemId: 'item-1',
    evaluationId: 'eval-1',
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'FORBIDDEN');
});

test('upsertTenderEvaluationLink should create new evaluation association record', async () => {
  const mockCloud = createCloudMock();
  const cloudFunction = loadCloudFunction(mockCloud);

  const result = await cloudFunction.main({
    sourceItemId: 'item-1',
    evaluationId: 'eval-1',
    evaluationVersion: 1,
    title: '项目 A 人工评估',
    summary: '适合继续推进',
    resultExcerpt: '建议进入后续报价阶段',
    decisionLabel: '建议跟进',
    confidenceLabel: '高',
    analysisSummary: '项目需求明确，预算和资格要求在当前团队能力范围内。',
    strengths: ['预算明确', '时间窗口充足'],
    risks: ['需尽快确认资质细节'],
    recommendedActions: ['安排技术评审', '准备报价底稿'],
    artifactCount: 1,
    artifacts: [
      {
        artifactId: 'artifact-1',
        name: '评估结果.xlsx',
        fileType: 'XLSX',
        downloadUrl: 'https://example.com/files/evaluation.xlsx',
        updatedAt: '2026-03-30T10:30:00.000Z',
      },
    ],
    serviceEnabled: true,
    serviceTitle: '需要更深人工评估？',
    serviceDescription: '如果当前会员内容不足以完成决策，可以继续转到 Web 端项目评估服务。',
    serviceUrl: 'https://example.com/web-assessment',
    serviceCtaText: '转到 Web 端深度评估',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.action, 'created');
  assert.equal(mockCloud.__collections.miniapp_tender_evaluations.length, 1);
  assert.equal(mockCloud.__collections.miniapp_tender_evaluations[0].source_item_id, 'item-1');
  assert.equal(mockCloud.__collections.miniapp_tender_evaluations[0].evaluation_id, 'eval-1');
  assert.deepEqual(mockCloud.__collections.miniapp_tender_evaluations[0].strengths, ['预算明确', '时间窗口充足']);
  assert.deepEqual(mockCloud.__collections.miniapp_tender_evaluations[0].recommended_actions, ['安排技术评审', '准备报价底稿']);
  assert.equal(mockCloud.__collections.miniapp_tender_evaluations[0].artifact_count, 1);
  assert.deepEqual(mockCloud.__collections.miniapp_tender_evaluations[0].artifacts, [
    {
      artifact_id: 'artifact-1',
      name: '评估结果.xlsx',
      file_type: 'xlsx',
      download_url: 'https://example.com/files/evaluation.xlsx',
      updated_at: '2026-03-30T10:30:00.000Z',
    },
  ]);
  assert.equal(mockCloud.__collections.miniapp_tender_evaluations[0].service_enabled, true);
  assert.equal(mockCloud.__collections.miniapp_tender_evaluations[0].service_title, '需要更深人工评估？');
  assert.equal(
    mockCloud.__collections.miniapp_tender_evaluations[0].service_description,
    '如果当前会员内容不足以完成决策，可以继续转到 Web 端项目评估服务。',
  );
  assert.equal(
    mockCloud.__collections.miniapp_tender_evaluations[0].service_url,
    'https://example.com/web-assessment',
  );
  assert.equal(
    mockCloud.__collections.miniapp_tender_evaluations[0].service_cta_text,
    '转到 Web 端深度评估',
  );
});

test('upsertTenderEvaluationLink should update existing evaluation association record for same version', async () => {
  const mockCloud = createCloudMock({
    tenderEvaluations: [
      {
        _id: 'evaluation-1',
        source_item_id: 'item-1',
        evaluation_id: 'eval-1',
        evaluation_version: 1,
        title: '旧评估标题',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(mockCloud);

  const result = await cloudFunction.main({
    sourceItemId: 'item-1',
    evaluationId: 'eval-1',
    evaluationVersion: 1,
    title: '新评估标题',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.action, 'updated');
  assert.equal(mockCloud.__collections.miniapp_tender_evaluations.length, 1);
  assert.equal(mockCloud.__collections.miniapp_tender_evaluations[0].title, '新评估标题');
});
