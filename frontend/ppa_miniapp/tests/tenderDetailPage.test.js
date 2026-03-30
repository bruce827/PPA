const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '../pages/tender-detail/index.js');
const USER_STORAGE_KEY = 'ppaMiniappUser';

function createPageInstance(definition) {
  const page = {
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(update) {
      this.data = {
        ...this.data,
        ...update,
      };
    },
  };

  Object.keys(definition).forEach((key) => {
    if (key !== 'data') {
      page[key] = definition[key];
    }
  });

  return page;
}

function loadTenderDetailPage({
  cachedUser = {
    openid: 'openid-1',
    displayName: '测试用户',
  },
  callFunctionImpl,
  downloadFileImpl,
  openDocumentImpl,
} = {}) {
  const originalPage = global.Page;
  const originalWx = global.wx;
  let definition = null;

  const toasts = [];
  const relaunches = [];
  const navigations = [];
  const callHistory = [];
  const clipboardWrites = [];
  const downloadCalls = [];
  const openDocumentCalls = [];

  global.Page = (config) => {
    definition = config;
  };

  global.wx = {
    getStorageSync(key) {
      if (key === USER_STORAGE_KEY) {
        return cachedUser;
      }

      return null;
    },
    showToast(options) {
      toasts.push(options);
    },
    reLaunch(options) {
      relaunches.push(options);
    },
    navigateTo(options) {
      navigations.push(options);
    },
    setClipboardData(options) {
      clipboardWrites.push(options);
      return Promise.resolve();
    },
    downloadFile(options) {
      downloadCalls.push(options);
      if (typeof downloadFileImpl === 'function') {
        return downloadFileImpl(options);
      }

      options.success({
        statusCode: 200,
        tempFilePath: '/tmp/evaluation.xlsx',
      });
      return {};
    },
    openDocument(options) {
      openDocumentCalls.push(options);
      if (typeof openDocumentImpl === 'function') {
        return openDocumentImpl(options);
      }

      options.success();
      return {};
    },
    cloud: {
      callFunction({ name, data }) {
        callHistory.push({ name, data });
        return Promise.resolve(callFunctionImpl({ name, data }));
      },
    },
  };

  delete require.cache[pagePath];
  require(pagePath);

  const page = createPageInstance(definition);

  return {
    page,
    toasts,
    relaunches,
    navigations,
    callHistory,
    clipboardWrites,
    downloadCalls,
    openDocumentCalls,
    cleanup() {
      delete require.cache[pagePath];
      global.Page = originalPage;
      global.wx = originalWx;
    },
  };
}

test('tender-detail page should map linked evaluation summary for active members', async () => {
  const harness = loadTenderDetailPage({
    callFunctionImpl: ({ name }) => {
      if (name !== 'getTenderDetail') {
        throw new Error(`unexpected cloud function: ${name}`);
      }

      return {
        result: {
          success: true,
          data: {
            source_item_id: 'item-1',
            title: '测试项目',
            summary: '摘要',
            published_at: '2026-03-30T08:00:00.000Z',
            deadline_at: '2026-03-31T08:00:00.000Z',
            issuer: '招标单位甲',
            budget_amount: 100000,
            adopt_status: 'unadopted',
            access_state: 'full',
            membership_status: 'active',
            evaluation_summary: {
              has_evaluation: true,
              evaluation_status: 'available',
              evaluation_version: 2,
              title: '项目 A 人工评估',
              summary: '适合继续推进',
              result_excerpt: '建议进入后续报价阶段',
              artifact_count: 1,
              updated_at: '2026-03-30T09:00:00.000Z',
            },
            evaluation_result: {
              decision_label: '建议跟进',
              confidence_label: '高',
              analysis_summary: '项目需求明确，预算和资格要求在当前团队能力范围内。',
              strengths: ['预算明确', '时间窗口充足'],
              risks: ['需尽快确认资质细节'],
              recommended_actions: ['安排技术评审', '准备报价底稿'],
            },
            evaluation_artifacts: [
              {
                artifact_id: 'artifact-1',
                name: '评估结果.xlsx',
                file_type: 'xlsx',
                download_url: 'https://example.com/files/evaluation.xlsx',
                updated_at: '2026-03-30T10:30:00.000Z',
              },
            ],
            service_entry: {
              has_service_entry: true,
              service_mode: 'web_assessment',
              title: '需要更深人工评估？',
              description: '如果当前会员内容不足以完成决策，可以继续转到 Web 端项目评估服务。',
              service_url: 'https://example.com/web-assessment',
              cta_text: '转到 Web 端深度评估',
              evaluation_id: 'eval-1',
            },
          },
        },
      };
    },
  });

  try {
    harness.page.onLoad({
      sourceItemId: 'item-1',
    });
    harness.page.onShow();
    await harness.page.loadDetail();

    assert.equal(harness.page.data.hasFullAccess, true);
    assert.equal(harness.page.data.detail.evaluationSummary.has_evaluation, true);
    assert.equal(harness.page.data.detail.evaluationSummary.evaluation_version, 2);
    assert.equal(harness.page.data.detail.evaluationSummary.title, '项目 A 人工评估');
    assert.equal(harness.page.data.detail.evaluationResult.decision_label, '建议跟进');
    assert.deepEqual(harness.page.data.detail.evaluationResult.strengths, ['预算明确', '时间窗口充足']);
    assert.deepEqual(harness.page.data.detail.evaluationResult.recommendedActions, ['安排技术评审', '准备报价底稿']);
    assert.deepEqual(harness.page.data.detail.evaluationArtifacts, [
      {
        artifactId: 'artifact-1',
        name: '评估结果.xlsx',
        fileType: 'xlsx',
        downloadUrl: 'https://example.com/files/evaluation.xlsx',
        updatedText: '2026-03-30 18:30',
      },
    ]);
    assert.deepEqual(harness.page.data.detail.serviceEntry, {
      hasServiceEntry: true,
      serviceMode: 'web_assessment',
      title: '需要更深人工评估？',
      description: '如果当前会员内容不足以完成决策，可以继续转到 Web 端项目评估服务。',
      serviceUrl: 'https://example.com/web-assessment',
      ctaText: '转到 Web 端深度评估',
      evaluationId: 'eval-1',
    });
  } finally {
    harness.cleanup();
  }
});

test('tender-detail page should keep empty evaluation summary when no association exists', async () => {
  const harness = loadTenderDetailPage({
    callFunctionImpl: ({ name }) => {
      if (name !== 'getTenderDetail') {
        throw new Error(`unexpected cloud function: ${name}`);
      }

      return {
        result: {
          success: true,
          data: {
            source_item_id: 'item-1',
            title: '测试项目',
            summary: '摘要',
            adopt_status: 'unadopted',
            access_state: 'full',
            membership_status: 'active',
            evaluation_summary: {
              has_evaluation: false,
              evaluation_status: 'not_available',
              evaluation_version: 0,
              title: '',
              summary: '',
              result_excerpt: '',
              artifact_count: 0,
              updated_at: '',
            },
            evaluation_result: {
              decision_label: '',
              confidence_label: '',
              analysis_summary: '',
              strengths: [],
              risks: [],
              recommended_actions: [],
            },
          },
        },
      };
    },
  });

  try {
    harness.page.onLoad({
      sourceItemId: 'item-1',
    });
    harness.page.onShow();
    await harness.page.loadDetail();

    assert.equal(harness.page.data.detail.evaluationSummary.has_evaluation, false);
    assert.equal(harness.page.data.detail.evaluationSummary.evaluation_version, 0);
  } finally {
    harness.cleanup();
  }
});

test('tender-detail page should download and open excel artifacts for active members', async () => {
  const harness = loadTenderDetailPage();

  try {
    await harness.page.handleDownloadArtifact({
      currentTarget: {
        dataset: {
          id: 'artifact-1',
          url: 'https://example.com/files/evaluation.xlsx',
        },
      },
    });

    assert.equal(harness.page.data.artifactDownloadingId, '');
    assert.equal(harness.downloadCalls.length, 1);
    assert.equal(harness.downloadCalls[0].url, 'https://example.com/files/evaluation.xlsx');
    assert.equal(harness.openDocumentCalls.length, 1);
    assert.equal(harness.openDocumentCalls[0].filePath, '/tmp/evaluation.xlsx');
    assert.equal(harness.clipboardWrites.length, 0);
  } finally {
    harness.cleanup();
  }
});

test('tender-detail page should copy artifact link when download fails', async () => {
  const harness = loadTenderDetailPage({
    downloadFileImpl(options) {
      options.fail(new Error('download failed'));
      return {};
    },
  });

  try {
    await harness.page.handleDownloadArtifact({
      currentTarget: {
        dataset: {
          id: 'artifact-2',
          url: 'https://example.com/files/fallback.xlsx',
        },
      },
    });

    assert.equal(harness.page.data.artifactDownloadingId, '');
    assert.equal(harness.openDocumentCalls.length, 0);
    assert.deepEqual(harness.clipboardWrites, [
      {
        data: 'https://example.com/files/fallback.xlsx',
      },
    ]);
    assert.equal(harness.toasts.at(-1).title, '下载失败，已复制链接');
  } finally {
    harness.cleanup();
  }
});

test('tender-detail page should copy web service link with project context', async () => {
  const harness = loadTenderDetailPage({
    callFunctionImpl: ({ name }) => {
      if (name !== 'getTenderDetail') {
        throw new Error(`unexpected cloud function: ${name}`);
      }

      return {
        result: {
          success: true,
          data: {
            source_item_id: 'item-1',
            title: '测试项目',
            summary: '摘要',
            access_state: 'membership_required',
            membership_status: 'inactive',
            evaluation_summary: {
              has_evaluation: false,
              evaluation_status: 'not_available',
              evaluation_version: 0,
              evaluation_id: '',
              title: '',
              summary: '',
              result_excerpt: '',
              artifact_count: 0,
              updated_at: '',
            },
            evaluation_result: {
              decision_label: '',
              confidence_label: '',
              analysis_summary: '',
              strengths: [],
              risks: [],
              recommended_actions: [],
            },
            service_entry: {
              has_service_entry: true,
              service_mode: 'web_assessment',
              title: '需要更深人工评估？',
              description: '如果当前会员内容不足以完成决策，可以继续转到 Web 端项目评估服务。',
              service_url: 'https://example.com/web-assessment',
              cta_text: '转到 Web 端深度评估',
              evaluation_id: 'eval-1',
            },
          },
        },
      };
    },
  });

  try {
    harness.page.onLoad({
      sourceItemId: 'item-1',
    });
    await harness.page.loadDetail();
    harness.page.handleOpenWebService();

    assert.deepEqual(harness.clipboardWrites, [
      {
        data:
          'https://example.com/web-assessment?sourceItemId=item-1&title=%E6%B5%8B%E8%AF%95%E9%A1%B9%E7%9B%AE&accessState=membership_required&evaluationId=eval-1',
      },
    ]);
    assert.equal(harness.toasts.at(-1).title, '已复制 Web 服务链接');
  } finally {
    harness.cleanup();
  }
});
