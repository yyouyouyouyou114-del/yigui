#!/bin/bash

echo "========================================"
echo "智能衣柜后端部署脚本"
echo "========================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install --production

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  未找到 .env 文件"
    echo "正在从 env.example 创建..."
    cp env.example .env
    echo "✅ 已创建 .env 文件，请编辑并填入你的配置"
    echo ""
    read -p "按回车键继续编辑 .env 文件..." 
    ${EDITOR:-nano} .env
fi

# 测试配置
echo ""
echo "🔍 测试配置..."
if grep -q "your_access_key_id" .env; then
    echo "⚠️  检测到默认配置，请确保已填入正确的阿里云 AccessKey"
fi

# 选择启动方式
echo ""
echo "请选择启动方式:"
echo "1) 直接启动 (npm start)"
echo "2) 后台运行 (PM2)"
echo "3) 开发模式 (nodemon)"
read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 启动服务..."
        npm start
        ;;
    2)
        # 检查 PM2
        if ! command -v pm2 &> /dev/null; then
            echo ""
            echo "📦 安装 PM2..."
            npm install -g pm2
        fi
        
        echo ""
        echo "🚀 使用 PM2 启动服务..."
        pm2 start server.js --name smart-wardrobe-backend
        pm2 save
        
        echo ""
        echo "✅ 服务已启动"
        echo "📊 查看状态: pm2 status"
        echo "📝 查看日志: pm2 logs smart-wardrobe-backend"
        echo "🔄 重启服务: pm2 restart smart-wardrobe-backend"
        echo "🛑 停止服务: pm2 stop smart-wardrobe-backend"
        ;;
    3)
        echo ""
        echo "🚀 开发模式启动..."
        npm run dev
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "✅ 部署完成！"
echo "========================================"

