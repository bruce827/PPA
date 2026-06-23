const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const loginUserPath = path.resolve(__dirname, '../cloudfunctions/loginUser/index.js');

function createCloudMock({ openid = 'openid-1', existingDocs = [] } = {}) {
  const docs = existingDocs.map((item) => ({ ...item }));

  return {
    mockCloud: {
      DYNAMIC_CURRENT_ENV: 'test-env',
      init() {},
      getWXContext() {
        return { OPENID: openid };
      },
      database() {
        return {
          collection(name) {
            assert.equal(name, 'miniapp_users');

            return {
              where(query) {
                return {
                  limit(limitValue) {
                    assert.equal(limitValue, 1);

                    return {
                      async get() {
                        return {
                          data: docs.filter((item) => item.openid === query.openid),
                        };
                      },
                    };
                  },
                };
              },
              async add({ data }) {
                docs.push({
                  _id: `doc-${docs.length + 1}`,
                  ...data,
                });

                return {
                  _id: docs[docs.length - 1]._id,
                };
              },
              doc(id) {
                return {
                  async update({ data }) {
                    const index = docs.findIndex((item) => item._id === id);

                    if (index === -1) {
                      throw new Error(`document not found: ${id}`);
                    }

                    docs[index] = {
                      ...docs[index],
                      ...data,
                    };

                    return {
                      updated: 1,
                    };
                  },
                };
              },
            };
          },
        };
      },
    },
    docs,
  };
}

function loadLoginUserWithCloud(mockCloud) {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return mockCloud;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[loginUserPath];

  try {
    return require(loginUserPath);
  } finally {
    Module._load = originalLoad;
  }
}

test('loginUser should fallback to nickname when displayName is blank after trim', async () => {
  const { mockCloud, docs } = createCloudMock();
  const loginUser = loadLoginUserWithCloud(mockCloud);

  const result = await loginUser.main({
    displayName: '   ',
    nickname: '张三',
    avatarUrl: '',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.displayName, '张三');
  assert.equal(docs.length, 1);
  assert.equal(docs[0].display_name, '张三');
  assert.equal(docs[0].nickname, '张三');
});

test('loginUser should preserve existing nickname and avatar when repeat login omits them', async () => {
  const { mockCloud, docs } = createCloudMock({
    existingDocs: [
      {
        _id: 'doc-1',
        openid: 'openid-1',
        display_name: '旧名称',
        nickname: '旧昵称',
        avatar_url: 'https://example.com/avatar.png',
        created_at: '2026-03-01T00:00:00.000Z',
        last_login_at: '2026-03-10T00:00:00.000Z',
      },
    ],
  });
  const loginUser = loadLoginUserWithCloud(mockCloud);

  const result = await loginUser.main({
    displayName: '新名称',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.displayName, '新名称');
  assert.equal(docs.length, 1);
  assert.equal(docs[0].display_name, '新名称');
  assert.equal(docs[0].nickname, '旧昵称');
  assert.equal(docs[0].avatar_url, 'https://example.com/avatar.png');
});

test('loginUser should preserve existing display name when repeat login sends blank displayName', async () => {
  const { mockCloud, docs } = createCloudMock({
    existingDocs: [
      {
        _id: 'doc-1',
        openid: 'openid-1',
        display_name: '华北投标组',
        nickname: '旧昵称',
        avatar_url: 'https://example.com/avatar.png',
        created_at: '2026-03-01T00:00:00.000Z',
        last_login_at: '2026-03-10T00:00:00.000Z',
      },
    ],
  });
  const loginUser = loadLoginUserWithCloud(mockCloud);

  const result = await loginUser.main({
    displayName: '   ',
    nickname: '张三',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.displayName, '华北投标组');
  assert.equal(docs[0].display_name, '华北投标组');
  assert.equal(docs[0].nickname, '张三');
});

test('loginUser should reject requests without OPENID in context', async () => {
  const { mockCloud } = createCloudMock({ openid: '' });
  const loginUser = loadLoginUserWithCloud(mockCloud);

  const result = await loginUser.main({
    displayName: '张三',
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'UNAUTHORIZED');
});
