# 🔍 Vercel HTTP 500 错误诊断指南

## 📊 当前状态

- ✅ 本地开发环境：正常运行
- ❌ Vercel 生产环境：HTTP 500 错误
- ❌ 后端 API：无法访问
- ❌ Serverless Function：执行失败

---

## 🎯 诊断步骤（按优先级执行）

### 步骤 1：检查环境变量（最重要！⭐⭐⭐）

HTTP 500 错误最常见的原因是环境变量未配置或未生效。

#### 操作步骤：

1. 打开 Vercel Dashboard：https://vercel.com/dashboard
2. 选择项目 `yigui`
3. 点击 `Settings` → `Environment Variables`
4. 确认以下 **5 个变量都存在**：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `ALIYUN_ACCESS_KEY_ID` | 阿里云 AccessKey ID | `LTAI5t...` |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret | `xxx...` |
| `ALIYUN_BAILIAN_API_KEY` | 百炼 API Key | `sk-xxx...` |
| `OSS_BUCKET` | OSS Bucket 名称 | `yxj36935` |
| `OSS_REGION` | OSS Region | `oss-cn-beijing` |

5. 确认每个变量的 **Environment** 都勾选了：
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development

6. **重要**：如果刚添加或修改了环境变量，必须重新部署！
   - 方法 1：在 Vercel Dashboard → Deployments → 点击最新部署旁边的 `···` → `Redeploy`
   - 方法 2：推送新的提交到 GitHub

#### 预期结果：

- ✅ 5 个环境变量都存在
- ✅ 所有环境（Production/Preview/Development）都勾选
- ✅ 重新部署后生效

#### 如果环境变量缺失：

这就是问题所在！请添加缺失的环境变量，然后重新部署。

---

### 步骤 2：查看 Build Logs

检查 Vercel 是否成功构建了应用。

#### 操作步骤：

1. 打开 Vercel Dashboard
2. 点击 `Deployments`
3. 点击最新的部署
4. 查看 `Build Logs` 标签
5. 滚动到底部，查看是否有 **红色的 ERROR 信息**

#### 常见错误：

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Cannot find module 'xxx'` | 依赖未安装 | 检查 `installCommand` |
| `npm install failed` | npm 安装失败 | 检查 `package.json` |
| `TypeScript compilation failed` | TS 编译错误 | 修复 TS 错误 |
| `Command failed with exit code 1` | 构建脚本失败 | 检查 `build` 脚本 |

#### 预期结果：

Build Logs 应该显示：

```
✅ Installing dependencies...
✅ Building frontend...
✅ Building serverless function...
✅ Deployment completed
```

---

### 步骤 3：查看 Function Logs（最关键！⭐⭐⭐）

Function Logs 会显示 Serverless Function 的实际运行错误。

#### 操作步骤：

1. 在部署详情页，点击 `Functions` 标签
2. 找到 `api/index.js` 函数
3. 点击 `View Logs` 或 `Real-time Logs`
4. 查看错误信息

#### 方法 2（如果找不到 Functions 标签）：

1. 访问：https://yigui.youyou.pw/api/health
2. 回到 Vercel Dashboard
3. 查看 `Runtime Logs`（会自动显示）

#### 常见错误及解决方案：

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Cannot find module '../backend/server'` | backend 文件未包含 | 检查 `includeFiles` 配置 |
| `ALIYUN_ACCESS_KEY_ID is not defined` | 环境变量未配置 | 配置环境变量并重新部署 |
| `Error: connect ECONNREFUSED` | 网络连接失败 | 检查阿里云 API 端点 |
| `Function invocation timeout` | 函数超时（>60s） | 优化代码或增加 `maxDuration` |
| `Memory limit exceeded` | 内存不足 | 增加 `memory` 配置 |

#### 预期结果：

Function Logs 应该显示：

```
✅ Backend server loaded successfully
```

如果显示错误，这就是问题的根源！

---

### 步骤 4：测试 API 端点

使用浏览器直接测试 API 端点。

#### 测试端点：

1. **健康检查**：https://yigui.youyou.pw/health
   - 预期：`{ status: 'ok', message: '后端服务运行中' }`
   - 如果 500：Serverless Function 崩溃
   - 如果 404：路由配置错误

2. **配置检查**：https://yigui.youyou.pw/api/config
   - 预期：显示配置信息（不含密钥）
   - 如果 500：环境变量问题

---

## 🔧 常见问题解决方案

### 问题 1：环境变量未生效

**症状**：
- Function Logs 显示 `undefined` 或 `is not defined`
- API 返回 500 错误

**解决方案**：
1. 在 Vercel 环境变量面板确认变量存在
2. 确认勾选了 `Production` 环境
3. **重新部署**（这一步很重要！）
4. 等待 2-3 分钟让部署完成
5. 再次测试

### 问题 2：backend 依赖未安装

**症状**：
- Build Logs 或 Function Logs 显示 `Cannot find module`
- 特别是 `ali-oss`、`axios`、`multer` 等

**解决方案**：
1. 检查 `vercel.json` 的 `installCommand`：
   ```json
   "installCommand": "npm install && cd backend && npm install"
   ```
2. 确认 `backend/package.json` 存在且正确
3. 重新部署

### 问题 3：Serverless Function 超时

**症状**：
- Function Logs 显示 `timeout`
- 请求等待很久后返回 500

**解决方案**：
1. 检查 `vercel.json` 的 `maxDuration` 配置（当前是 60 秒）
2. 如果需要更长时间，升级 Vercel 计划（免费版最多 10 秒，Pro 版最多 300 秒）
3. 优化后端代码，减少执行时间

### 问题 4：内存不足

**症状**：
- Function Logs 显示 `out of memory` 或 `heap out of memory`

**解决方案**：
1. 增加 `vercel.json` 的 `memory` 配置：
   ```json
   "functions": {
     "api/index.js": {
       "memory": 1024  // 当前是 1024MB，可增加到 3008MB（Pro 版）
     }
   }
   ```
2. 优化图片压缩算法，减少内存占用

---

## 📸 需要提供的截图

为了准确定位问题，请提供以下截图：

1. ✅ **Environment Variables** 页面
   - 显示 5 个变量的名称（Value 会被隐藏，这是正常的）
   - 显示每个变量勾选的环境

2. ✅ **Build Logs**
   - 完整的构建日志
   - 滚动到底部，显示最终结果

3. ✅ **Function Logs**（最重要！）
   - `api/index.js` 的运行时日志
   - 包含错误信息的完整堆栈

4. ✅ **浏览器测试结果**
   - 访问 `https://yigui.youyou.pw/health` 的返回结果
   - 浏览器控制台的错误信息

---

## 🎯 快速诊断命令

如果您有权访问 Vercel CLI，可以使用以下命令：

```bash
# 查看最新部署的日志
vercel logs yigui.youyou.pw

# 查看环境变量
vercel env ls

# 重新部署（清除缓存）
vercel --prod --force
```

---

## 📞 如果以上都无法解决

请提供以下完整信息：

1. 环境变量截图（Key 可见即可）
2. Build Logs 完整截图
3. Function Logs 完整截图
4. `/health` 端点测试结果
5. 浏览器控制台错误截图

有了这些信息，我可以准确定位问题并提供解决方案！🎯

