/**
 * Vercel Serverless Function - 后端 API 入口
 */

const app = require('../backend/server');

// 导出为 Vercel Serverless Function
module.exports = app;

