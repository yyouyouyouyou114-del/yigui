@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 启动智能衣柜（生产模式）
echo ========================================
echo.

REM 检查 PM2 是否安装
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PM2 未安装！
    echo.
    echo 请先安装 PM2:
    echo   npm install -g pm2
    echo.
    pause
    exit /b 1
)

echo ✅ PM2 已安装
echo.

REM 检查后端配置
if not exist "backend\.env" (
    echo ❌ 后端配置文件不存在！
    echo.
    echo 请先配置 backend\.env 文件
    echo.
    pause
    exit /b 1
)

echo ✅ 后端配置文件存在
echo.

REM 启动后端服务
echo 📦 启动后端服务...
pm2 start ecosystem.config.js

REM 等待服务启动
timeout /t 3 /nobreak >nul

REM 检查服务状态
pm2 status

echo.
echo ========================================
echo ✅ 服务启动完成！
echo ========================================
echo.
echo 📊 查看状态: pm2 status
echo 📝 查看日志: pm2 logs
echo 🔄 重启服务: pm2 restart smart-wardrobe-backend
echo ⏹️  停止服务: pm2 stop smart-wardrobe-backend
echo.
echo 前端访问地址: http://localhost:5173
echo 后端健康检查: http://localhost:3100/health
echo.
pause

