/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 数据库错误
  if (err.code === 'SQLITE_ERROR' || err.message.includes('SQLITE')) {
    return res.status(500).json({
      success: false,
      error: 'Database error',
      message: err.message
    });
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: err.message
    });
  }

  // 默认错误
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
};

module.exports = errorHandler;
