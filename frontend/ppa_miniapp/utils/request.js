async function callFunction(name, data = {}) {
  const response = await wx.cloud.callFunction({
    name,
    data,
  });

  const result = response.result || {};

  if (typeof result.success !== 'boolean') {
    throw new Error('云函数返回格式不正确');
  }

  if (!result.success) {
    const error = new Error(result.error || '请求失败');
    error.code = result.errorCode || '';
    throw error;
  }

  return result.data;
}

module.exports = {
  callFunction,
};
