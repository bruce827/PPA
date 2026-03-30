const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const getMembershipStatusPath = path.resolve(__dirname, '../cloudfunctions/getMembershipStatus/index.js');
const getTenderDetailPath = path.resolve(__dirname, '../cloudfunctions/getTenderDetail/index.js');

function matchesQuery(doc, query = {}) {
  return Object.entries(query).every(([key, value]) => doc[key] === value);
}

function createCloudMock({
  openid = 'openid-1',
  tenders = [],
  memberships = [],
  tenderEvaluations = [],
  membershipActivityLogs = [],
  activityLogAddError = null,
} = {}) {
  const collections = {
    miniapp_memberships: memberships.map((item) => ({ ...item })),
    tenders: tenders.map((item) => ({ ...item })),
    miniapp_tender_evaluations: tenderEvaluations.map((item) => ({ ...item })),
    miniapp_membership_activity_logs: membershipActivityLogs.map((item) => ({ ...item })),
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
            add({ data }) {
              return Promise.resolve().then(() => {
                if (activityLogAddError && name === 'miniapp_membership_activity_logs') {
                  throw activityLogAddError;
                }

                const doc = {
                  _id: `${name}-${docs.length + 1}`,
                  ...data,
                };

                docs.push(doc);

                return {
                  _id: doc._id,
                };
              });
            },
            where(query) {
              return {
                orderBy(field, direction) {
                  return {
                    limit(limitValue) {
                      return {
                        async get() {
                          const data = docs
                            .filter((item) => matchesQuery(item, query))
                            .sort((left, right) => {
                              const leftValue = left[field] || '';
                              const rightValue = right[field] || '';

                              if (leftValue === rightValue) {
                                return 0;
                              }

                              return direction === 'desc'
                                ? String(leftValue).localeCompare(String(rightValue)) * -1
                                : String(leftValue).localeCompare(String(rightValue));
                            });
                          return {
                            data: typeof limitValue === 'number' ? data.slice(0, limitValue) : data,
                          };
                        },
                      };
                    },
                  };
                },
                limit(limitValue) {
                  return {
                    async get() {
                      const data = docs.filter((item) => matchesQuery(item, query));
                      return {
                        data: typeof limitValue === 'number' ? data.slice(0, limitValue) : data,
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

function loadCloudFunction(modulePath, mockCloud) {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return mockCloud;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[modulePath];

  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
}

test('getMembershipStatus should return inactive for users without membership record', async () => {
  const mockCloud = createCloudMock();
  const cloudFunction = loadCloudFunction(getMembershipStatusPath, mockCloud);

  const result = await cloudFunction.main();

  assert.equal(result.success, true);
  assert.equal(result.data.membership_status, 'inactive');
  assert.equal(result.data.access_state, 'membership_required');
});

test('getMembershipStatus should return expired for users whose membership is out of date', async () => {
  const mockCloud = createCloudMock({
    memberships: [
      {
        openid: 'openid-1',
        status: 'active',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2026-03-02T00:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(getMembershipStatusPath, mockCloud);

  const result = await cloudFunction.main();

  assert.equal(result.success, true);
  assert.equal(result.data.membership_status, 'expired');
  assert.equal(result.data.access_state, 'membership_expired');
});

test('getMembershipStatus should treat explicit expired status as expired even when expires_at is in the future', async () => {
  const mockCloud = createCloudMock({
    memberships: [
      {
        openid: 'openid-1',
        status: 'expired',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-03-02T00:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(getMembershipStatusPath, mockCloud);

  const result = await cloudFunction.main();

  assert.equal(result.success, true);
  assert.equal(result.data.membership_status, 'expired');
  assert.equal(result.data.access_state, 'membership_expired');
});

test('getMembershipStatus should prefer the latest membership record without relying on database sorting', async () => {
  const mockCloud = createCloudMock({
    memberships: [
      {
        openid: 'openid-1',
        status: 'active',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-03-02T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
      {
        openid: 'openid-1',
        status: 'expired',
        starts_at: '2026-02-01T00:00:00.000Z',
        expires_at: '2026-02-28T00:00:00.000Z',
        updated_at: '2026-02-28T00:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(getMembershipStatusPath, mockCloud);

  const result = await cloudFunction.main();

  assert.equal(result.success, true);
  assert.equal(result.data.membership_status, 'active');
  assert.equal(result.data.access_state, 'full');
});

test('getTenderDetail should return full detail for active members', async () => {
  const mockCloud = createCloudMock({
    tenders: [
      {
        source_item_id: 'item-1',
        title: '测试项目',
        summary: '摘要',
        announcement_html: '<p>完整公告</p>',
        announcement_plain_text: '完整公告',
        source_url: 'https://example.com/tender',
        detail_payload: {
          scope: '完整招标范围',
        },
        adopt_status: 'unadopted',
      },
    ],
    memberships: [
      {
        openid: 'openid-1',
        status: 'active',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-03-02T00:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(getTenderDetailPath, mockCloud);

  const result = await cloudFunction.main({
    sourceItemId: 'item-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.access_state, 'full');
  assert.equal(result.data.membership_status, 'active');
  assert.equal(result.data.announcement_plain_text, '完整公告');
  assert.equal(result.data.source_url, 'https://example.com/tender');
  assert.deepEqual(result.data.detail_payload, { scope: '完整招标范围' });
  assert.equal(result.data.evaluation_summary.has_evaluation, false);
  assert.equal(mockCloud.__collections.miniapp_membership_activity_logs.length, 1);
  assert.equal(mockCloud.__collections.miniapp_membership_activity_logs[0].action, 'view_full_detail');
  assert.equal(mockCloud.__collections.miniapp_membership_activity_logs[0].source_item_id, 'item-1');
});

test('getTenderDetail should return restricted detail for users without membership', async () => {
  const mockCloud = createCloudMock({
    tenders: [
      {
        source_item_id: 'item-1',
        title: '测试项目',
        summary: '摘要',
        announcement_html: '<p>完整公告</p>',
        announcement_plain_text: '完整公告',
        source_url: 'https://example.com/tender',
        detail_payload: {
          scope: '完整招标范围',
        },
        adopt_status: 'unadopted',
        secret_attachment_url: 'https://example.com/private.xlsx',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(getTenderDetailPath, mockCloud);

  const result = await cloudFunction.main({
    sourceItemId: 'item-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.access_state, 'membership_required');
  assert.equal(result.data.membership_status, 'inactive');
  assert.equal(result.data.summary, '摘要');
  assert.equal(Object.hasOwn(result.data, 'announcement_plain_text'), false);
  assert.equal(Object.hasOwn(result.data, 'announcement_html'), false);
  assert.equal(Object.hasOwn(result.data, 'source_url'), false);
  assert.equal(Object.hasOwn(result.data, 'detail_payload'), false);
  assert.equal(Object.hasOwn(result.data, 'secret_attachment_url'), false);
  assert.equal(mockCloud.__collections.miniapp_membership_activity_logs.length, 0);
});

test('getTenderDetail should return expired access state for out-of-date membership', async () => {
  const mockCloud = createCloudMock({
    tenders: [
      {
        source_item_id: 'item-1',
        title: '测试项目',
        summary: '摘要',
        announcement_plain_text: '完整公告',
        detail_payload: {
          scope: '完整招标范围',
        },
      },
    ],
    memberships: [
      {
        openid: 'openid-1',
        status: 'expired',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2026-03-02T00:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(getTenderDetailPath, mockCloud);

  const result = await cloudFunction.main({
    sourceItemId: 'item-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.access_state, 'membership_expired');
  assert.equal(result.data.membership_status, 'expired');
  assert.equal(Object.hasOwn(result.data, 'announcement_plain_text'), false);
});

test('getTenderDetail should block access when status is expired even if expires_at is still in the future', async () => {
  const mockCloud = createCloudMock({
    tenders: [
      {
        source_item_id: 'item-1',
        title: '测试项目',
        summary: '摘要',
        announcement_plain_text: '完整公告',
      },
    ],
    memberships: [
      {
        openid: 'openid-1',
        status: 'expired',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-03-02T00:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(getTenderDetailPath, mockCloud);

  const result = await cloudFunction.main({
    sourceItemId: 'item-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.membership_status, 'expired');
  assert.equal(result.data.access_state, 'membership_expired');
  assert.equal(Object.hasOwn(result.data, 'announcement_plain_text'), false);
});

test('getTenderDetail should keep membership gating aligned with membership status lookup', async () => {
  const memberships = [
    {
      openid: 'openid-1',
      status: 'expired',
      starts_at: '2026-02-01T00:00:00.000Z',
      expires_at: '2026-02-28T00:00:00.000Z',
      updated_at: '2026-02-28T00:00:00.000Z',
    },
    {
      openid: 'openid-1',
      status: 'active',
      starts_at: '2026-03-01T00:00:00.000Z',
      expires_at: '2099-03-02T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
    },
  ];
  const statusFunction = loadCloudFunction(
    getMembershipStatusPath,
    createCloudMock({ memberships }),
  );
  const detailFunction = loadCloudFunction(
    getTenderDetailPath,
    createCloudMock({
      memberships,
      tenders: [
        {
          source_item_id: 'item-1',
          title: '测试项目',
          summary: '摘要',
          announcement_plain_text: '完整公告',
        },
      ],
    }),
  );

  const statusResult = await statusFunction.main();
  const detailResult = await detailFunction.main({
    sourceItemId: 'item-1',
  });

  assert.equal(statusResult.success, true);
  assert.equal(detailResult.success, true);
  assert.equal(detailResult.data.membership_status, statusResult.data.membership_status);
  assert.equal(detailResult.data.access_state, statusResult.data.access_state);
});

test('getTenderDetail should keep full detail accessible even when activity logging fails', async () => {
  const mockCloud = createCloudMock({
    tenders: [
      {
        source_item_id: 'item-1',
        title: '测试项目',
        summary: '摘要',
        announcement_plain_text: '完整公告',
      },
    ],
    memberships: [
      {
        openid: 'openid-1',
        status: 'active',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-03-02T00:00:00.000Z',
      },
    ],
    activityLogAddError: new Error('activity log unavailable'),
  });
  const cloudFunction = loadCloudFunction(getTenderDetailPath, mockCloud);

  const result = await cloudFunction.main({
    sourceItemId: 'item-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.access_state, 'full');
  assert.equal(result.data.announcement_plain_text, '完整公告');
  assert.equal(mockCloud.__collections.miniapp_membership_activity_logs.length, 0);
});

test('getTenderDetail should return linked evaluation summary for active members when association exists', async () => {
  const mockCloud = createCloudMock({
    tenders: [
      {
        source_item_id: 'item-1',
        title: '测试项目',
        summary: '摘要',
        announcement_plain_text: '完整公告',
      },
    ],
    memberships: [
      {
        openid: 'openid-1',
        status: 'active',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-03-02T00:00:00.000Z',
      },
    ],
    tenderEvaluations: [
      {
        source_item_id: 'item-1',
        evaluation_id: 'eval-1',
        evaluation_version: 2,
        title: '项目 A 人工评估',
        summary: '适合继续推进',
        result_excerpt: '建议进入后续报价阶段',
        decision_label: '建议跟进',
        confidence_label: '高',
        analysis_summary: '项目需求明确，预算和资格要求在当前团队能力范围内。',
        strengths: ['预算明确', '时间窗口充足'],
        risks: ['需尽快确认资质细节'],
        recommended_actions: ['安排技术评审', '准备报价底稿'],
        artifact_count: 1,
        artifacts: [
          {
            artifact_id: 'artifact-1',
            name: '评估结果.xlsx',
            file_type: 'xlsx',
            download_url: 'https://example.com/files/evaluation.xlsx',
            updated_at: '2026-03-30T10:30:00.000Z',
          },
          {
            artifact_id: 'artifact-2',
            name: '非 Excel 附件',
            file_type: 'pdf',
            download_url: 'https://example.com/files/evaluation.pdf',
            updated_at: '2026-03-30T10:35:00.000Z',
          },
        ],
        service_enabled: true,
        service_title: '需要更深人工评估？',
        service_description: '如果当前会员内容不足以完成决策，可以继续转到 Web 端项目评估服务。',
        service_url: 'https://example.com/web-assessment',
        service_cta_text: '转到 Web 端深度评估',
        updated_at: '2026-03-30T10:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(getTenderDetailPath, mockCloud);

  const result = await cloudFunction.main({
    sourceItemId: 'item-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.evaluation_summary.has_evaluation, true);
  assert.equal(result.data.evaluation_summary.evaluation_id, 'eval-1');
  assert.equal(result.data.evaluation_summary.evaluation_version, 2);
  assert.equal(result.data.evaluation_summary.result_excerpt, '建议进入后续报价阶段');
  assert.equal(result.data.evaluation_result.decision_label, '建议跟进');
  assert.deepEqual(result.data.evaluation_result.strengths, ['预算明确', '时间窗口充足']);
  assert.deepEqual(result.data.evaluation_result.recommended_actions, ['安排技术评审', '准备报价底稿']);
  assert.deepEqual(result.data.evaluation_artifacts, [
    {
      artifact_id: 'artifact-1',
      name: '评估结果.xlsx',
      file_type: 'xlsx',
      download_url: 'https://example.com/files/evaluation.xlsx',
      updated_at: '2026-03-30T10:30:00.000Z',
    },
  ]);
  assert.deepEqual(result.data.service_entry, {
    has_service_entry: true,
    service_mode: 'web_assessment',
    title: '需要更深人工评估？',
    description: '如果当前会员内容不足以完成决策，可以继续转到 Web 端项目评估服务。',
    service_url: 'https://example.com/web-assessment',
    cta_text: '转到 Web 端深度评估',
    evaluation_id: 'eval-1',
  });
});

test('getTenderDetail should expose service entry in restricted detail when fallback is configured', async () => {
  const mockCloud = createCloudMock({
    tenders: [
      {
        source_item_id: 'item-1',
        title: '测试项目',
        summary: '摘要',
        announcement_plain_text: '完整公告',
      },
    ],
    tenderEvaluations: [
      {
        source_item_id: 'item-1',
        evaluation_id: 'eval-1',
        evaluation_version: 1,
        service_enabled: true,
        service_title: '需要更深人工评估？',
        service_description: '如果当前会员内容不足以完成决策，可以继续转到 Web 端项目评估服务。',
        service_url: 'https://example.com/web-assessment',
        service_cta_text: '转到 Web 端深度评估',
        updated_at: '2026-03-30T10:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(getTenderDetailPath, mockCloud);

  const result = await cloudFunction.main({
    sourceItemId: 'item-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.access_state, 'membership_required');
  assert.equal(Object.hasOwn(result.data, 'announcement_plain_text'), false);
  assert.deepEqual(result.data.service_entry, {
    has_service_entry: true,
    service_mode: 'web_assessment',
    title: '需要更深人工评估？',
    description: '如果当前会员内容不足以完成决策，可以继续转到 Web 端项目评估服务。',
    service_url: 'https://example.com/web-assessment',
    cta_text: '转到 Web 端深度评估',
    evaluation_id: 'eval-1',
  });
});
