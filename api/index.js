/**
 * Vercel Serverless Function - 后端 API 入口
 * 使用 ES Module 语法以兼容 Vercel 环境
 * Updated: 2025-01-10
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

let app;

try {
  console.log('🔧 Loading backend server...');
  console.log('📁 Current directory:', __dirname);
  console.log('📁 Process cwd:', process.cwd());
  
  // 使用 createRequire 来加载 CommonJS 模块
  const serverPath = join(__dirname, '../backend/server.js');
  console.log(`🔍 Trying to load: ${serverPath}`);
  
  app = require(serverPath);
  console.log(`✅ Backend server loaded successfully`);
} catch (error) {
  console.error('❌ FATAL: Failed to load backend server:', error);
  console.error('Stack:', error.stack);
  throw error;
}

// 导出为 Vercel Serverless Function（ES Module 默认导出）
export default async (req, res) => {
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
