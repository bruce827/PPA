/**
 * 统一成功响应格式
 * @param {Object} res - Express response 对象
 * @param {*} data - 响应数据
 * @param {String} message - 可选的消息
 */
const success = (res, data, message = 'Success') => {
  res.json({
    success: true,
    data,
    message
  });
};

/**
 * 统一错误响应格式
 * @param {Object} res - Express response 对象
 * @param {String} message - 错误消息
 * @param {Number} statusCode - HTTP 状态码
 * @param {*} error - 可选的错误详情
 */
const error = (res, message, statusCode = 500, errorDetails = null) => {
  const response = {
    success: false,
    message,
    error: errorDetails
  };
  
  res.status(statusCode).json(response);
};

module.exports = {
  success,
  error
};
