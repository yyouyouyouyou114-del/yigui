# 智能衣柜后端服务

基于 Node.js + Express + 阿里云 VIAPI 的虚拟试穿后端服务。

## 功能特性

- ✅ 虚拟试穿 API
- ✅ 阿里云人体分割
- ✅ API 限流保护
- ✅ CORS 跨域支持
- ✅ 文件上传处理

## 部署步骤

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `env.example` 为 `.env`：

```bash
cp env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
# 阿里云 API 配置（必填）
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret

# 服务器配置
PORT=3100
NODE_ENV=production

# CORS 允许的前端地址
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://yourdomain.com

# API 限流配置（每个 IP 每天最大调用次数）
MAX_CALLS_PER_DAY=50
```

### 3. 启动服务

**开发环境：**
```bash
npm run dev
```

**生产环境：**
```bash
npm start
```

或使用 PM2：
```bash
pm2 start server.js --name smart-wardrobe-backend
```

### 4. 测试服务

访问健康检查接口：
```bash
curl http://localhost:3100/health
```

预期返回：
```json
{
  "status": "ok",
  "message": "智能衣柜后端服务运行中"
}
```

## API 文档

### POST /api/virtual-tryon

虚拟试穿接口

**请求：**
- Content-Type: `multipart/form-data`
- 参数：
  - `personImage`: 人物图片文件（必填）
  - `clothingImage`: 衣物图片文件（必填）
  - `category`: 衣物类别（选填），可选值：`top`, `bottom`, `dress`, `outerwear`

**响应：**
```json
{
  "success": true,
  "data": {
    "segmentedPerson": "base64_image_data",
    "originalPerson": "base64_image_data",
    "clothing": "base64_image_data",
    "category": "dress",
    "message": "人体分割成功"
  }
}
```

**限流：**
- 每个 IP 每天最多调用 50 次（可配置）
- 响应头包含剩余次数：`X-RateLimit-Remaining`

## 阿里云配置

### 开通服务

1. 登录 [阿里云控制台](https://www.aliyun.com/)
2. 搜索"视觉智能开放平台"
3. 开通以下服务：
   - 人体分割（SegmentBody）

### 获取 AccessKey

1. 进入 [RAM 访问控制](https://ram.console.aliyun.com/)
2. 创建 AccessKey
3. 保存 AccessKey ID 和 AccessKey Secret
4. 填入 `.env` 文件

### 授权配置

确保 AccessKey 有以下权限：
- `AliyunVIAPIFullAccess`（视觉智能全部权限）

## 部署到百度云服务器

### 1. 安装 Node.js

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. 上传代码

```bash
# 使用 git
git clone your-repo-url
cd smart-wardrobe/backend

# 或使用 scp
scp -r backend/ user@server:/path/to/app
```

### 3. 安装依赖并启动

```bash
cd /path/to/app/backend
npm install --production
npm start
```

### 4. 配置 Nginx 反向代理（可选）

编辑 `/etc/nginx/sites-available/default`：

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

重启 Nginx：
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. 使用 PM2 保持运行

```bash
# 安装 PM2
sudo npm install -g pm2

# 启动应用
pm2 start server.js --name smart-wardrobe-backend

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs smart-wardrobe-backend
```

## 故障排除

### 问题：阿里云 API 调用失败

**解决：**
1. 检查 AccessKey 是否正确
2. 确认已开通相应服务
3. 检查账户余额
4. 查看 RAM 权限配置

### 问题：CORS 错误

**解决：**
1. 检查前端地址是否在 `ALLOWED_ORIGINS` 中
2. 确认协议（http/https）一致

### 问题：超过限流

**解决：**
1. 等待 24 小时后重试
2. 增加 `MAX_CALLS_PER_DAY` 配置
3. 考虑部署多个实例

## 监控和日志

### 查看日志

**使用 PM2：**
```bash
pm2 logs smart-wardrobe-backend
pm2 logs smart-wardrobe-backend --lines 100
```

**直接运行：**
日志会输出到控制台

### 监控指标

- 请求数量
- 响应时间
- 错误率
- API 调用成本

建议接入阿里云日志服务（SLS）进行持久化存储和分析。

## 成本估算

**阿里云 API 费用：**
- 免费额度：1,000 次/月
- 超出：¥0.02/次

**示例：**
- 100 用户，每人每天 2 次
- 月调用：100 × 2 × 30 = 6,000 次
- 费用：(6,000 - 1,000) × 0.02 = ¥100

**服务器费用：**
- 百度云：使用现有服务器，无额外成本

## 安全建议

1. ✅ 不要将 `.env` 文件提交到 Git
2. ✅ 定期更换 AccessKey
3. ✅ 启用 HTTPS
4. ✅ 设置合理的限流规则
5. ✅ 监控异常调用

## 技术支持

如有问题，请参考：
- [阿里云 VIAPI 文档](https://help.aliyun.com/product/146846.html)
- [Express 文档](https://expressjs.com/)
- [Node.js 文档](https://nodejs.org/)

---

## License

MIT

