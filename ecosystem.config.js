/**
 * PM2 进程管理配置
 * 用于生产环境部署，确保后端服务自动重启和保活
 * 
 * 使用方法：
 * 1. 安装 PM2: npm install -g pm2
 * 2. 启动服务: pm2 start ecosystem.config.js
 * 3. 查看状态: pm2 status
 * 4. 查看日志: pm2 logs
 * 5. 重启服务: pm2 restart smart-wardrobe-backend
 * 6. 停止服务: pm2 stop smart-wardrobe-backend
 * 7. 开机自启: pm2 startup && pm2 save
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'smart-wardrobe-backend',
      
      // 启动脚本
      script: './backend/server.js',
      
      // 工作目录
      cwd: './',
      
      // 实例数量（cluster模式）
      instances: 1,
      
      // 执行模式：fork（单进程）或 cluster（多进程）
      exec_mode: 'fork',
      
      // 自动重启
      autorestart: true,
      
      // 监听文件变化自动重启（开发环境）
      watch: false,
      
      // 最大内存限制（超过后自动重启）
      max_memory_restart: '500M',
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
      },
      
      // 开发环境变量
      env_development: {
        NODE_ENV: 'development',
        PORT: 3100,
      },
      
      // 错误日志文件
      error_file: './logs/backend-error.log',
      
      // 输出日志文件
      out_file: './logs/backend-out.log',
      
      // 日志时间格式
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      
      // 合并日志
      merge_logs: true,
      
      // 最小运行时间（避免频繁重启）
      min_uptime: '10s',
      
      // 最大重启次数
      max_restarts: 10,
      
      // 重启延迟
      restart_delay: 4000,
    },
  ],
};

