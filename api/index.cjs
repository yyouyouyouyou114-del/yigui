/**
 * Vercel Serverless Function - 后端 API 入口
 * 
 * Vercel 要求导出一个处理函数，而不是直接导出 Express app
 */

const path = require('path');

let app;

try {
  console.log('🔧 Loading backend server...');
  console.log('📁 Current directory:', __dirname);
  console.log('📁 Process cwd:', process.cwd());
  
  // 尝试多种路径方式加载 backend/server
  const possiblePaths = [
    '../backend/server',
    './backend/server',
    path.join(__dirname, '../backend/server'),
    path.join(process.cwd(), 'backend/server')
  ];
  
  let loadError;
  for (const serverPath of possiblePaths) {
    try {
      console.log(`🔍 Trying to load: ${serverPath}`);
      app = require(serverPath);
      console.log(`✅ Backend server loaded successfully from: ${serverPath}`);
      break;
    } catch (err) {
      console.log(`❌ Failed to load from ${serverPath}:`, err.message);
      loadError = err;
    }
  }
  
  if (!app) {
    throw loadError || new Error('Failed to load backend server from any path');
  }
} catch (error) {
  console.error('❌ FATAL: Failed to load backend server:', error);
  console.error('Stack:', error.stack);
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

