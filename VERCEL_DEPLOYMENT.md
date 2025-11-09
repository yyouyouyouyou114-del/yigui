# 🚀 Vercel 部署指南（安全版）

## 📋 目录

- [安全须知](#安全须知)
- [部署前准备](#部署前准备)
- [GitHub 仓库配置](#github-仓库配置)
- [Vercel 部署步骤](#vercel-部署步骤)
- [环境变量配置](#环境变量配置)
- [验证部署](#验证部署)
- [常见问题](#常见问题)

---

## 🔒 安全须知

### ⚠️ 敏感信息绝对不能泄露

本项目涉及以下敏感信息，**务必妥善保护**：

| 敏感信息 | 说明 | 泄露后果 |
|---------|------|---------|
| `ALIYUN_ACCESS_KEY_ID` | 阿里云访问密钥 ID | 他人可访问你的 OSS |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云访问密钥 Secret | 他人可操作你的云资源 |
| `ALIYUN_BAILIAN_API_KEY` | 百炼 API Key | 他人可消费你的 API 额度 |
| `OSS_BUCKET` | OSS Bucket 名称 | 虽然相对不敏感，但建议保护 |

### ✅ 安全措施清单

在上传到 GitHub 之前，确保：

- [x] `.gitignore` 已配置（包含 `.env`、`backend/.env` 等）
- [x] `backend/env.example` 只包含模板，无真实密钥
- [x] 本地 `backend/.env` 文件存在但不会被 Git 追踪
- [x] 代码中没有硬编码任何密钥
- [x] 已阅读本文档的安全章节

---

## 📦 部署前准备

### 1. 检查本地环境

确保你的项目可以在本地正常运行：

```bash
# 启动后端
cd backend
npm run dev:fixed

# 启动前端
npm run dev:fixed
```

访问 `http://localhost:5173` 测试功能是否正常。

### 2. 清理敏感信息

**执行清理检查：**

```bash
# Windows PowerShell
Get-ChildItem -Recurse -Include *.env,*.log,.env.* | Where-Object { $_.FullName -notmatch 'node_modules' }

# Linux/macOS
find . -name "*.env" -o -name "*.log" -o -name ".env.*" | grep -v node_modules
```

确保没有 `.env` 文件会被提交。

### 3. 验证 .gitignore

```bash
# 检查 .gitignore 是否生效
git status

# 确保以下文件不在列表中：
# - backend/.env
# - backend/.env.local
# - backend/.env.production
```

---

## 📁 GitHub 仓库配置

### 1. 创建 GitHub 仓库

1. 访问 [GitHub](https://github.com)
2. 点击 **"New repository"**
3. 填写仓库信息：
   - **Repository name**: `smart-wardrobe`
   - **Visibility**: 可以选 Public 或 Private（推荐 Private）
   - ⚠️ **不要**勾选 "Add a README file"
4. 点击 **"Create repository"**

### 2. 推送代码到 GitHub

```bash
# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: Smart Wardrobe App"

# 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/smart-wardrobe.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 3. ⚠️ 推送前的最后检查

```bash
# 查看即将提交的文件
git ls-files

# 确保以下文件不在列表中：
# ❌ backend/.env
# ❌ backend/.env.local
# ❌ backend/.env.production
# ❌ .vercel
# ❌ 任何包含 "api_key"、"secret"、"password" 的文件
```

如果发现敏感文件，立即执行：

```bash
# 从 Git 缓存中移除（但保留本地文件）
git rm --cached backend/.env

# 重新提交
git commit -m "Remove sensitive files"
```

---

## 🌐 Vercel 部署步骤

### 1. 注册/登录 Vercel

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账号登录
3. 授权 Vercel 访问你的 GitHub 仓库

### 2. 导入项目

1. 点击 **"Add New Project"**
2. 选择 **"Import Git Repository"**
3. 找到并选择 `smart-wardrobe` 仓库
4. 点击 **"Import"**

### 3. 配置项目

在 Vercel 配置页面：

**Framework Preset**: Vite  
**Root Directory**: `./` (保持默认)  
**Build Command**: `npm run build` (自动检测)  
**Output Directory**: `dist` (自动检测)  

点击 **"Deploy"** → **等等！先配置环境变量！**

### 4. ⚠️ 暂停部署，配置环境变量

在部署之前，必须先配置环境变量：

1. 在 Vercel 项目页面，点击 **"Settings"**
2. 找到左侧菜单 **"Environment Variables"**
3. 添加以下环境变量：

---

## 🔐 环境变量配置

### 必需的环境变量

在 Vercel 环境变量页面，**逐个添加**以下变量：

#### 1. ALIYUN_ACCESS_KEY_ID

```
Name: ALIYUN_ACCESS_KEY_ID
Value: 你的真实AccessKey ID（从阿里云RAM控制台获取）
Environments: Production, Preview, Development (全选)
```

#### 2. ALIYUN_ACCESS_KEY_SECRET

```
Name: ALIYUN_ACCESS_KEY_SECRET
Value: 你的真实AccessKey Secret
Environments: Production, Preview, Development (全选)
```

#### 3. ALIYUN_BAILIAN_API_KEY

```
Name: ALIYUN_BAILIAN_API_KEY
Value: sk-你的百炼API Key（从百炼控制台获取）
Environments: Production, Preview, Development (全选)
```

#### 4. OSS_BUCKET

```
Name: OSS_BUCKET
Value: 你的OSS Bucket名称
Environments: Production, Preview, Development (全选)
```

#### 5. OSS_REGION

```
Name: OSS_REGION
Value: oss-cn-beijing（或你的实际Region）
Environments: Production, Preview, Development (全选)
```

#### 6. NODE_ENV

```
Name: NODE_ENV
Value: production
Environments: Production (仅生产环境)
```

#### 7. ALLOWED_ORIGINS

```
Name: ALLOWED_ORIGINS
Value: https://your-app.vercel.app（部署后会知道实际域名，先留空）
Environments: Production, Preview, Development (全选)
```

### 🎯 重要提示

- ✅ **每个变量都要点 "Add" 按钮保存**
- ✅ **检查拼写，环境变量名称必须完全匹配**
- ✅ **Value 不要有多余的空格或引号**
- ✅ **Environments 建议全选（Production, Preview, Development）**

---

## 🚀 开始部署

配置完环境变量后：

1. 返回 **"Deployments"** 页面
2. 点击 **"Redeploy"**（如果之前已经部署失败）
3. 或者触发新的部署：
   ```bash
   git commit --allow-empty -m "Trigger deployment"
   git push
   ```

### 部署过程

Vercel 会自动执行：

1. ✅ 安装依赖（`npm install`）
2. ✅ 构建前端（`npm run build`）
3. ✅ 部署后端（Serverless Functions）
4. ✅ 部署前端（Static Files）

等待 2-5 分钟，部署完成！

---

## ✅ 验证部署

### 1. 获取部署 URL

部署成功后，Vercel 会分配一个 URL：

```
https://smart-wardrobe-xxx.vercel.app
```

### 2. 更新 ALLOWED_ORIGINS

现在你知道了实际域名，需要更新环境变量：

1. 进入 Vercel **"Settings"** → **"Environment Variables"**
2. 找到 `ALLOWED_ORIGINS`
3. 点击 **"Edit"**
4. 更新为：`https://smart-wardrobe-xxx.vercel.app`
5. 保存后，**重新部署**（触发方式同上）

### 3. 测试功能

访问你的应用：

- ✅ 前端页面能正常加载
- ✅ 进入"设置" → 点击"测试后端连接" → 应显示"连接成功"
- ✅ 添加衣物功能正常
- ✅ 虚拟试穿功能正常（上传照片 → 选择衣物 → 试穿）

### 4. 检查后端 API

访问健康检查端点：

```
https://smart-wardrobe-xxx.vercel.app/health
```

应该返回：

```json
{
  "status": "ok",
  "message": "智能衣柜后端服务运行中"
}
```

---

## 🔍 常见问题

### Q1: 部署失败，提示"Build failed"

**可能原因：**
- TypeScript 编译错误
- 依赖安装失败

**解决方法：**

1. 查看 Vercel 部署日志（Deployments → 点击失败的部署 → 查看 Log）
2. 在本地执行 `npm run build` 检查是否有错误
3. 修复错误后重新推送

### Q2: 前端能访问，后端 API 返回 500 错误

**可能原因：**
- 环境变量配置错误或缺失

**解决方法：**

1. 检查 Vercel 环境变量是否全部配置
2. 检查环境变量名称拼写是否正确
3. 访问 `/api/config` 端点查看配置状态：
   ```
   https://smart-wardrobe-xxx.vercel.app/api/config
   ```
4. 重新部署

### Q3: 虚拟试穿失败，提示"OSS 上传失败"

**可能原因：**
- OSS 配置错误
- AccessKey 权限不足

**解决方法：**

1. 登录阿里云 OSS 控制台，确认：
   - Bucket 存在且名称正确
   - Region 正确
   - AccessKey 有 OSS 访问权限
2. 在 Vercel 重新检查环境变量
3. 重新部署

### Q4: 前端页面显示"后端服务离线"

**可能原因：**
- Vercel Serverless Function 冷启动
- CORS 配置问题

**解决方法：**

1. 等待 10-30 秒（首次访问 Serverless Function 需要启动时间）
2. 刷新页面重试
3. 检查 `ALLOWED_ORIGINS` 是否配置正确
4. 查看浏览器控制台（F12）是否有 CORS 错误

### Q5: 如何查看后端日志？

**Vercel 查看日志：**

1. 进入项目 → **"Deployments"**
2. 点击最新的部署
3. 切换到 **"Functions"** 标签
4. 点击具体的 Function（如 `backend/server.js`）
5. 查看实时日志

### Q6: 不小心把 .env 文件推送到 GitHub 了怎么办？

**紧急处理步骤：**

1. **立即删除远程文件：**
   ```bash
   git rm --cached backend/.env
   git commit -m "Remove sensitive file"
   git push
   ```

2. **立即更换所有密钥：**
   - 删除旧的 AccessKey
   - 删除旧的百炼 API Key
   - 创建新的密钥
   - 在 Vercel 更新环境变量

3. **清除 Git 历史（如果需要）：**
   ```bash
   # 使用 BFG Repo-Cleaner 或 git filter-branch
   # 警告：这会重写 Git 历史
   ```

4. **检查 GitHub：**
   - 确认敏感文件已从所有分支删除
   - 如果仓库是 Public，考虑删除仓库重新创建

---

## 🎯 部署检查清单

部署前：

- [ ] 本地测试通过
- [ ] `.gitignore` 已正确配置
- [ ] `backend/.env` 不在 Git 追踪中
- [ ] 代码中无硬编码密钥
- [ ] GitHub 仓库已创建

部署时：

- [ ] Vercel 项目已创建
- [ ] 所有环境变量已配置
- [ ] 环境变量拼写正确
- [ ] Environments 已全选

部署后：

- [ ] 前端页面正常访问
- [ ] `/health` 端点返回正常
- [ ] `/api/config` 显示配置正确
- [ ] `ALLOWED_ORIGINS` 已更新为实际域名
- [ ] 虚拟试穿功能测试通过

---

## 🔐 安全最佳实践

### 1. 定期轮换密钥

建议每 3-6 个月更换一次：
- AccessKey
- 百炼 API Key

### 2. 使用 RAM 子账号

不要使用主账号的 AccessKey，创建 RAM 子账号并：
- 只授予必要的权限（OSS 访问权限）
- 限制 IP 白名单

### 3. 监控 API 使用

定期检查：
- 阿里云控制台的 API 调用记录
- OSS 访问日志
- Vercel 函数调用日志

### 4. 启用 API 限流

本项目已内置限流功能：
- 每个 IP 每天最多 50 次调用
- 可在环境变量 `MAX_CALLS_PER_DAY` 中调整

### 5. 使用私有仓库

如果可能，使用 GitHub Private Repository：
- 降低代码泄露风险
- 更好的访问控制

---

## 📞 获取帮助

如遇到部署问题：

1. 查看 Vercel 部署日志
2. 查看浏览器控制台（F12）
3. 检查 `USAGE_GUIDE.md` 故障排查章节
4. 访问 [Vercel 文档](https://vercel.com/docs)

---

## 🎉 部署成功！

恭喜！你的智能衣柜应用已成功部署到 Vercel！

**下一步：**
- 分享你的应用 URL
- 邀请朋友体验
- 持续优化功能

**记住：**
- ✅ 定期备份数据
- ✅ 监控 API 使用情况
- ✅ 保护好你的密钥

**祝使用愉快！** 🎊

