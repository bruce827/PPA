const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const getTenderListPath = path.resolve(__dirname, '../cloudfunctions/getTenderList/index.js');

function compareValue(left, right, direction) {
  if (left === right) {
    return 0;
  }

  return direction === 'desc'
    ? String(right || '').localeCompare(String(left || ''))
    : String(left || '').localeCompare(String(right || ''));
}

function matchesQuery(doc, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (value && value.__type === 'between') {
      const current = String(doc[key] || '');
      return current >= value.gte && current <= value.lte;
    }

    return doc[key] === value;
  });
}

function createCloudMock({ openid = 'openid-1', tenders = [] } = {}) {
  const collections = {
    tenders: tenders.map((item) => ({ ...item })),
  };

  return {
    DYNAMIC_CURRENT_ENV: 'test-env',
    init() {},
    getWXContext() {
      return { OPENID: openid };
    },
    database() {
      return {
        command: {
          gte(value) {
            return {
              and(other) {
                return {
                  __type: 'between',
                  gte: value,
                  lte: other.value,
                };
              },
            };
          },
          lte(value) {
            return { value };
          },
        },
        collection(name) {
          const docs = collections[name];

          if (!docs) {
            throw new Error(`unknown collection: ${name}`);
          }

          return {
            where(query) {
              const filtered = docs.filter((item) => matchesQuery(item, query));

              return {
                async count() {
                  return {
                    total: filtered.length,
                  };
                },
                orderBy(field, direction) {
                  const sorted = filtered.slice().sort((left, right) => compareValue(left[field], right[field], direction));

                  return {
                    skip(skipValue) {
                      return {
                        limit(limitValue) {
                          return {
                            async get() {
                              return {
                                data: sorted.slice(skipValue, skipValue + limitValue),
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

test('getTenderList should return only basic public list fields in published_at desc order', async () => {
  const cloudFunction = loadCloudFunction(
    getTenderListPath,
    createCloudMock({
      tenders: [
        {
          source_item_id: 'item-1',
          title: '第一个项目',
          published_at: '2026-03-20T08:00:00.000Z',
          published_date: '2026-03-20',
          deadline_at: '2026-03-28T08:00:00.000Z',
          deadline_date: '2026-03-28',
          issuer: '招标单位 A',
          budget_amount: 100000,
          adopt_status: 'adopted',
          adopted_by_name: '张三',
          adopted_at: '2026-03-21T08:00:00.000Z',
          announcement_plain_text: '完整公告',
          announcement_html: '<p>完整公告</p>',
          detail_payload: { scope: '机密详情' },
          source_url: 'https://example.com/full',
        },
        {
          source_item_id: 'item-2',
          title: '第二个项目',
          published_at: '2026-03-21T08:00:00.000Z',
          published_date: '2026-03-21',
          deadline_at: '2026-03-29T08:00:00.000Z',
          deadline_date: '2026-03-29',
          issuer: '招标单位 B',
          budget_amount: 200000,
          adopt_status: 'unadopted',
          announcement_plain_text: '另一条完整公告',
          detail_payload: { scope: '另一条机密详情' },
        },
      ],
    }),
  );

  const result = await cloudFunction.main({
    startDate: '2026-03-20',
    endDate: '2026-03-21',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.total, 2);
  assert.deepEqual(
    result.data.list.map((item) => item.source_item_id),
    ['item-2', 'item-1'],
  );
  assert.equal(Object.hasOwn(result.data.list[0], 'announcement_plain_text'), false);
  assert.equal(Object.hasOwn(result.data.list[0], 'announcement_html'), false);
  assert.equal(Object.hasOwn(result.data.list[0], 'detail_payload'), false);
  assert.equal(Object.hasOwn(result.data.list[0], 'source_url'), false);
});

test('getTenderList should respect date range filtering and pagination', async () => {
  const cloudFunction = loadCloudFunction(
    getTenderListPath,
    createCloudMock({
      tenders: [
        {
          source_item_id: 'item-1',
          title: '第一个项目',
          published_at: '2026-03-20T08:00:00.000Z',
          published_date: '2026-03-20',
        },
        {
          source_item_id: 'item-2',
          title: '第二个项目',
          published_at: '2026-03-21T08:00:00.000Z',
          published_date: '2026-03-21',
        },
        {
          source_item_id: 'item-3',
          title: '第三个项目',
          published_at: '2026-03-22T08:00:00.000Z',
          published_date: '2026-03-22',
        },
      ],
    }),
  );

  const result = await cloudFunction.main({
    startDate: '2026-03-20',
    endDate: '2026-03-22',
    pageNo: 2,
    pageSize: 1,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.total, 3);
  assert.equal(result.data.pageNo, 2);
  assert.equal(result.data.pageSize, 1);
  assert.deepEqual(
    result.data.list.map((item) => item.source_item_id),
    ['item-2'],
  );
});

test('getTenderList should reject invalid date ranges', async () => {
  const cloudFunction = loadCloudFunction(getTenderListPath, createCloudMock());

  const result = await cloudFunction.main({
    startDate: '2026-03-22',
    endDate: '2026-03-20',
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'INVALID_DATE_RANGE');
});
