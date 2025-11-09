/**
 * Vercel Serverless Function - 后端 API 入口
 * 
 * Vercel 要求导出一个处理函数，而不是直接导出 Express app
 */

let app;

try {
  // 加载 Express app
  app = require('../backend/server');
  console.log('✅ Backend server loaded successfully');
} catch (error) {
  console.error('❌ Failed to load backend server:', error);
  throw error;
}

// 导出为 Vercel Serverless Function
// Vercel 会将所有请求传递给这个函数
module.exports = async (req, res) => {
  try {
    // 将请求传递给 Express app
    return app(req, res);
  } catch (error) {
    console.error('❌ Serverless function error:', error);
    res.status(500).json({
      success: false,
      error: 'Serverless function invocation failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

