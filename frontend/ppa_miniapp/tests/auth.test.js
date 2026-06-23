const test = require('node:test');
const assert = require('node:assert/strict');

const auth = require('../utils/auth');

test('setCachedUser should normalize storage payload to camelCase user object', () => {
  let storedValue = null;

  global.wx = {
    setStorageSync(key, value) {
      storedValue = { key, value };
    },
    getStorageSync() {
      return storedValue && storedValue.value;
    },
    removeStorageSync() {
      storedValue = null;
    },
  };

  const normalized = auth.setCachedUser({
    openid: 'openid-1',
    display_name: '展示名称',
    nickname: '昵称',
    avatar_url: 'https://example.com/avatar.png',
  });

  assert.deepEqual(normalized, {
    openid: 'openid-1',
    displayName: '展示名称',
    nickname: '昵称',
    avatarUrl: 'https://example.com/avatar.png',
  });
  assert.deepEqual(auth.getCachedUser(), normalized);
});

test('getCachedUser should return null when cached payload is missing required fields', () => {
  global.wx = {
    getStorageSync() {
      return {
        openid: '',
        displayName: '',
      };
    },
    removeStorageSync() {},
    setStorageSync() {},
  };

  assert.equal(auth.getCachedUser(), null);
});
