const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '../pages/internal-channel/index.js');

function createPageInstance(definition) {
  const page = {
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(update) {
      this.data = {
        ...this.data,
        ...update,
      };
    },
    selectComponent() {
      return null;
    },
  };

  Object.keys(definition).forEach((key) => {
    if (key !== 'data') {
      page[key] = definition[key];
    }
  });

  return page;
}

function loadInternalChannelPage({ callFunctionImpl } = {}) {
  const originalPage = global.Page;
  const originalWx = global.wx;
  let definition = null;

  global.Page = (config) => {
    definition = config;
  };

  global.wx = {
    showToast() {},
    stopPullDownRefresh() {},
    showLoading() {},
    hideLoading() {},
    openDocument() {},
    showActionSheet() {},
    cloud: {
      callFunction({ name, data }) {
        return Promise.resolve(callFunctionImpl({ name, data }));
      },
      downloadFile() {},
    },
  };

  delete require.cache[pagePath];
  require(pagePath);

  const page = createPageInstance(definition);

  return {
    page,
    cleanup() {
      delete require.cache[pagePath];
      global.Page = originalPage;
      global.wx = originalWx;
    },
  };
}

test('internal-channel page should map push_time fallback and attachment originalname fallback', async () => {
  const harness = loadInternalChannelPage({
    callFunctionImpl: ({ name }) => {
      if (name !== 'getInternalProjectList') {
        throw new Error(`unexpected cloud function: ${name}`);
      }

      return {
        result: {
          success: true,
          data: {
            list: [
              {
                _id: 'project-1',
                projectName: '内部项目',
                projectDescription: 'desc',
                ourQuote: 18.5,
                customerBudget: 16,
                riskLevel: '中风险',
                costBreakdownJson: '{}',
                push_time: '2026-04-17T08:30:00.000Z',
                attachmentFileIds: [
                  {
                    fileID: 'cloud://attachment-1',
                    filename: 'stored_proposal.pdf',
                  },
                ],
              },
            ],
          },
        },
      };
    },
  });

  try {
    await harness.page.loadList();

    assert.equal(harness.page.data.list.length, 1);
    assert.match(harness.page.data.list[0].pushTimeText, /^2026-04-17 /);
    assert.equal(
      harness.page.data.list[0].attachments[0].originalname,
      'stored_proposal.pdf',
    );
  } finally {
    harness.cleanup();
  }
});
