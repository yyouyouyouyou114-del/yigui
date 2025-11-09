/**
 * Vercel Serverless Function - 后端 API 入口
 * 
 * Vercel 要求导出一个处理函数，而不是直接导出 Express app
 */

const app = require('../backend/server');

// 导出为 Vercel Serverless Function
// Vercel 会将所有请求传递给这个函数
module.exports = (req, res) => {
  // 将请求传递给 Express app
  return app(req, res);
};

