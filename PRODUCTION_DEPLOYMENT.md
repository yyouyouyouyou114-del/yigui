# 🚀 生产环境部署指南

## 📋 目录
- [开发环境运行](#开发环境运行)
- [生产环境部署](#生产环境部署)
- [PM2 进程管理](#pm2-进程管理)
- [健康监控](#健康监控)
- [故障排查](#故障排查)

---

## 🔧 开发环境运行

### 启动后端（开发模式）
```bash
cd backend
npm run dev:fixed
```

### 启动前端（开发模式）
```bash
npm run dev:fixed
```

---

## 🌐 生产环境部署

### 方案一：使用 PM2（推荐）

#### 1. 安装 PM2
```bash
npm install -g pm2
```

#### 2. 启动服务
```bash
# 启动后端服务
pm2 start ecosystem.config.js

# 查看运行状态
pm2 status

# 查看日志
pm2 logs smart-wardrobe-backend
```

#### 3. 设置开机自启
```bash
# 生成启动脚本
pm2 startup

# 保存当前进程列表
pm2 save
```

#### 4. 常用命令
```bash
# 重启服务
pm2 restart smart-wardrobe-backend

# 停止服务
pm2 stop smart-wardrobe-backend

# 删除服务
pm2 delete smart-wardrobe-backend

# 查看详细信息
pm2 show smart-wardrobe-backend

# 监控面板
pm2 monit
```

---

### 方案二：使用 systemd（Linux）

#### 1. 创建服务文件
```bash
sudo nano /etc/systemd/system/smart-wardrobe.service
```

#### 2. 添加配置
```ini
[Unit]
Description=Smart Wardrobe Backend Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/your/project/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=smart-wardrobe
Environment=NODE_ENV=production
Environment=PORT=3100

[Install]
WantedBy=multi-user.target
```

#### 3. 启动服务
```bash
# 重载配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start smart-wardrobe

# 设置开机自启
sudo systemctl enable smart-wardrobe

# 查看状态
sudo systemctl status smart-wardrobe

# 查看日志
sudo journalctl -u smart-wardrobe -f
```

---

### 方案三：使用 Docker

#### 1. 创建 Dockerfile（后端）
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./

EXPOSE 3100

CMD ["node", "server.js"]
```

#### 2. 创建 docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3100:3100"
    environment:
      - NODE_ENV=production
      - PORT=3100
    env_file:
      - backend/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3100/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### 3. 启动容器
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 📊 PM2 进程管理

### 监控和管理

#### 实时监控
```bash
pm2 monit
```

#### 查看资源使用
```bash
pm2 list
```

#### 查看详细日志
```bash
# 实时日志
pm2 logs smart-wardrobe-backend --lines 100

# 只看错误日志
pm2 logs smart-wardrobe-backend --err

# 清空日志
pm2 flush
```

#### 性能分析
```bash
# CPU 分析
pm2 profile:cpu

# 内存分析
pm2 profile:mem
```

---

## 🔍 健康监控

### 前端自动监控

前端已内置健康监控服务，会：
- ✅ 每 30 秒自动检查后端状态
- ✅ 后端离线时自动尝试重连（每 5 秒）
- ✅ 在页面右下角显示连接状态
- ✅ 提供友好的错误提示和解决方案

### 手动健康检查

#### 检查后端状态
```bash
curl http://localhost:3100/health
```

**正常响应：**
```json
{
  "status": "ok",
  "message": "智能衣柜后端服务运行中"
}
```

#### 检查配置状态
```bash
curl http://localhost:3100/api/config
```

**正常响应：**
```json
{
  "success": true,
  "configured": true,
  "config": {
    "bucket": "yxj36935",
    "region": "oss-cn-beijing",
    "hasApiKey": true,
    "hasAccessKey": true
  }
}
```

---

## 🚨 故障排查

### 问题1：后端服务无法启动

**检查端口占用：**
```bash
# Windows
netstat -ano | findstr :3100

# Linux/macOS
lsof -i :3100
```

**解决方法：**
```bash
# Windows - 杀死占用进程
taskkill /PID <进程ID> /F

# Linux/macOS
kill -9 <进程ID>
```

---

### 问题2：前端显示"后端服务离线"

**可能原因：**
1. 后端服务未启动
2. 端口配置错误
3. 防火墙阻止连接

**解决步骤：**

1. **检查后端是否运行：**
```bash
pm2 status
# 或
curl http://localhost:3100/health
```

2. **查看后端日志：**
```bash
pm2 logs smart-wardrobe-backend
```

3. **重启后端服务：**
```bash
pm2 restart smart-wardrobe-backend
```

4. **检查防火墙：**
```bash
# Windows - 允许端口 3100
netsh advfirewall firewall add rule name="Smart Wardrobe" dir=in action=allow protocol=TCP localport=3100

# Linux - 允许端口 3100
sudo ufw allow 3100/tcp
```

---

### 问题3：内存占用过高

**查看内存使用：**
```bash
pm2 list
```

**如果超过限制，PM2 会自动重启服务**

**手动重启：**
```bash
pm2 restart smart-wardrobe-backend
```

---

### 问题4：OSS 上传失败

**检查环境变量：**
```bash
# 查看配置
curl http://localhost:3100/api/config
```

**确认配置正确：**
- ✅ OSS_BUCKET
- ✅ OSS_REGION
- ✅ ALIYUN_ACCESS_KEY_ID
- ✅ ALIYUN_ACCESS_KEY_SECRET

**重启服务以加载新配置：**
```bash
pm2 restart smart-wardrobe-backend
```

---

## 📈 性能优化建议

### 1. 启用 Gzip 压缩
在 `backend/server.js` 中添加：
```javascript
const compression = require('compression');
app.use(compression());
```

### 2. 设置缓存
```javascript
app.use(express.static('public', {
  maxAge: '1d'
}));
```

### 3. 使用 CDN
将静态资源部署到 CDN，减轻服务器压力。

### 4. 数据库连接池
如果使用数据库，配置连接池以提高性能。

---

## 🔐 安全建议

### 1. 使用 HTTPS
生产环境必须使用 HTTPS，可以使用 Let's Encrypt 免费证书。

### 2. 限制 CORS
在 `backend/.env` 中设置：
```env
ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. 设置 Rate Limiting
已内置 API 限流，可在 `.env` 中调整：
```env
MAX_CALLS_PER_DAY=100
```

### 4. 定期备份
定期备份 `.env` 文件和用户数据。

---

## 📞 技术支持

### 查看日志
```bash
# PM2 日志
pm2 logs smart-wardrobe-backend

# 系统日志（systemd）
sudo journalctl -u smart-wardrobe -f

# Docker 日志
docker-compose logs -f
```

### 性能监控
```bash
# PM2 监控
pm2 monit

# 资源使用
pm2 list
```

---

## ✅ 部署检查清单

部署前：
- [ ] 环境变量配置完整（backend/.env）
- [ ] 依赖安装完成（npm install）
- [ ] 端口 3100 可用
- [ ] 防火墙规则配置
- [ ] OSS 服务正常
- [ ] API Key 有效

部署后：
- [ ] 后端服务运行正常
- [ ] 健康检查通过
- [ ] 前端可以连接后端
- [ ] 虚拟试穿功能正常
- [ ] 日志输出正常
- [ ] PM2 自动重启生效

---

**🎉 部署完成！享受你的智能衣柜吧！**

